import os
import re
from typing import List, Tuple
from app.services.parsers.base import BaseParser, FeatureVector

try:
    import javalang
    JAVALANG_AVAILABLE = True
except ImportError:
    JAVALANG_AVAILABLE = False


class JavaParser(BaseParser):
    """
    Parses Java source files using the `javalang` library (Java 8 compatible).
    Falls back to regex-based heuristics when javalang cannot parse a file.
    """

    @property
    def supported_extensions(self) -> List[str]:
        return [".java"]

    @property
    def language_name(self) -> str:
        return "java"

    def parse(self, file_path: str, project_root: str) -> FeatureVector:
        fv = FeatureVector(file_path=file_path, language="java")
        try:
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                source = f.read()

            lines = source.splitlines()
            fv.loc = len(lines)
            fv.file_size_bytes = os.path.getsize(file_path)

            if JAVALANG_AVAILABLE:
                self._parse_with_javalang(fv, source, lines, project_root, file_path)
            else:
                self._parse_with_regex(fv, source, lines)

            fv.has_hardcoded_secrets = self._detect_hardcoded_secrets(source)
            fv.has_hardcoded_api_keys = self._detect_api_keys(source)

        except Exception as e:
            fv.parse_error = str(e)
            # Fallback to regex even on javalang failure
            try:
                with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                    source = f.read()
                self._parse_with_regex(fv, source, source.splitlines())
                fv.has_hardcoded_secrets = self._detect_hardcoded_secrets(source)
                fv.has_hardcoded_api_keys = self._detect_api_keys(source)
            except Exception:
                pass
        return fv

    # ── AST-based parsing (javalang) ──────────────────────────────

    def _parse_with_javalang(self, fv: FeatureVector, source: str, lines: List[str],
                              project_root: str, file_path: str):
        try:
            tree = javalang.parse.parse(source)
        except Exception:
            self._parse_with_regex(fv, source, lines)
            return

        # Imports
        imports = [imp.path for imp in (tree.imports or [])]
        fv.imports = imports
        fv.import_count = len(imports)
        fv.internal_dep_count, fv.external_dep_count = self._classify_java_imports(imports, project_root)

        # Classes
        class_decls = list(tree.filter(javalang.tree.ClassDeclaration))
        fv.num_classes = len(class_decls)
        fv.class_names = [c[1].name for c in class_decls]

        # Methods
        method_decls = list(tree.filter(javalang.tree.MethodDeclaration))
        fv.num_functions = len(method_decls)
        fv.function_names = [m[1].name for m in method_decls]

        # Cyclomatic Complexity
        fv.cyclomatic_complexity = self._compute_java_cc(tree, method_decls)

        # Nesting depth (heuristic from brace counting)
        fv.max_nesting_depth = self._compute_max_nesting_heuristic(source)

        # God classes
        god_classes = []
        for _, cls in class_decls:
            methods_in_cls = [
                m for m in cls.body
                if isinstance(m, javalang.tree.MethodDeclaration)
            ] if cls.body else []
            # LOC estimate from position
            if len(methods_in_cls) >= self.GOD_CLASS_METHOD_THRESHOLD:
                god_classes.append(cls.name)
        fv.has_god_class = len(god_classes) > 0
        fv.god_class_names = god_classes

        # Long methods (heuristic — javalang doesn't carry end line)
        fv.has_long_methods, fv.long_method_names = self._detect_long_methods_regex(source)

    # ── Regex-based fallback ───────────────────────────────────────

    def _parse_with_regex(self, fv: FeatureVector, source: str, lines: List[str]):
        fv.imports = re.findall(r'import\s+([\w\.]+);', source)
        fv.import_count = len(fv.imports)
        fv.num_classes = len(re.findall(r'\bclass\s+\w+', source))
        methods = re.findall(r'(?:public|private|protected|static|\s)+[\w<>\[\]]+\s+(\w+)\s*\(', source)
        fv.num_functions = len(methods)
        fv.function_names = methods
        fv.cyclomatic_complexity = self._compute_cc_regex(source)
        fv.max_nesting_depth = self._compute_max_nesting_heuristic(source)
        fv.has_long_methods, fv.long_method_names = self._detect_long_methods_regex(source)

    # ── Cyclomatic Complexity ──────────────────────────────────────

    def _compute_java_cc(self, tree, method_decls) -> float:
        """Count decision points in each method body."""
        decision_types = (
            javalang.tree.IfStatement,
            javalang.tree.ForStatement,
            javalang.tree.WhileStatement,
            javalang.tree.DoStatement,
            javalang.tree.SwitchStatement,
            javalang.tree.CatchClause,
            javalang.tree.TernaryExpression,
        )
        complexities = []
        for _, method in method_decls:
            cc = 1
            for _, node in method:
                if isinstance(node, decision_types):
                    cc += 1
            complexities.append(cc)
        return round(sum(complexities) / len(complexities), 2) if complexities else 1.0

    def _compute_cc_regex(self, source: str) -> float:
        """Rough CC estimate by counting keywords."""
        keywords = ["if", "else if", "for", "while", "case", "catch", "?"]
        count = sum(len(re.findall(r'\b' + kw + r'\b', source)) for kw in keywords if kw != "?")
        count += source.count("?")
        return max(1.0, round(count / max(1, len(re.findall(r'\bvoid\b|\bint\b|\bString\b', source))), 2))

    # ── Nesting Depth (brace counting) ────────────────────────────

    def _compute_max_nesting_heuristic(self, source: str) -> int:
        """Track max brace depth as a proxy for nesting."""
        depth = 0
        max_depth = 0
        in_string = False
        in_comment = False
        i = 0
        while i < len(source):
            c = source[i]
            if not in_comment and i + 1 < len(source) and source[i:i+2] == "//":
                while i < len(source) and source[i] != "\n":
                    i += 1
                continue
            if not in_comment and i + 1 < len(source) and source[i:i+2] == "/*":
                in_comment = True
                i += 2
                continue
            if in_comment and i + 1 < len(source) and source[i:i+2] == "*/":
                in_comment = False
                i += 2
                continue
            if in_comment:
                i += 1
                continue
            if c == '"' and not in_string:
                in_string = True
            elif c == '"' and in_string:
                in_string = False
            if not in_string:
                if c == "{":
                    depth += 1
                    max_depth = max(max_depth, depth)
                elif c == "}":
                    depth = max(0, depth - 1)
            i += 1
        return max(0, max_depth - 1)  # subtract 1 for class-level brace

    # ── Long Method Detection ──────────────────────────────────────

    def _detect_long_methods_regex(self, source: str) -> Tuple[bool, List[str]]:
        """
        Approximate long-method detection by finding method signatures
        and counting lines until the matching closing brace.
        """
        long = []
        pattern = re.compile(
            r'(?:public|private|protected|static|final|\s)+'
            r'[\w<>\[\]]+\s+(\w+)\s*\([^)]*\)\s*\{'
        )
        for match in pattern.finditer(source):
            name = match.group(1)
            start = match.start()
            brace_count = 0
            end = start
            for i, ch in enumerate(source[start:], start):
                if ch == "{":
                    brace_count += 1
                elif ch == "}":
                    brace_count -= 1
                    if brace_count == 0:
                        end = i
                        break
            method_loc = source[start:end].count("\n")
            if method_loc >= self.LONG_METHOD_THRESHOLD:
                long.append(name)
        return len(long) > 0, long

    # ── Import Classification ──────────────────────────────────────

    def _classify_java_imports(self, imports: List[str], project_root: str) -> Tuple[int, int]:
        java_stdlib_prefixes = ("java.", "javax.", "sun.", "com.sun.", "org.w3c.", "org.xml.")
        internal = 0
        external = 0
        for imp in imports:
            if any(imp.startswith(p) for p in java_stdlib_prefixes):
                external += 1
            else:
                # Check for matching .java file in project (heuristic)
                rel = imp.replace(".", os.sep) + ".java"
                if os.path.exists(os.path.join(project_root, rel)):
                    internal += 1
                else:
                    external += 1
        return internal, external

    # ── Secrets / API Key Detection ────────────────────────────────

    SECRET_PATTERNS = [
        r'(?i)(password|passwd|pwd|secret|credential)\s*=\s*["\'][^"\']{4,}["\']',
        r'(?i)String\s+(password|secret|token)\s*=\s*["\'][^"\']+["\']',
    ]
    API_KEY_PATTERNS = [
        r'(?i)(api[_\-]?key|apikey|accesskey|authtoken)\s*=\s*["\'][A-Za-z0-9_\-\.]{16,}["\']',
        r'(?i)(AKIA[0-9A-Z]{16})',
        r'(?i)(sk-[A-Za-z0-9]{20,})',
    ]

    def _detect_hardcoded_secrets(self, source: str) -> bool:
        for pattern in self.SECRET_PATTERNS:
            if re.search(pattern, source):
                return True
        return False

    def _detect_api_keys(self, source: str) -> bool:
        for pattern in self.API_KEY_PATTERNS:
            if re.search(pattern, source):
                return True
        return False
