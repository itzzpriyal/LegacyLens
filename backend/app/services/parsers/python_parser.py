import ast
import os
import re
from typing import List
from app.services.parsers.base import BaseParser, FeatureVector


class PythonParser(BaseParser):
    """
    Parses Python source files using the built-in `ast` module.
    Extracts: LOC, classes, functions, cyclomatic complexity, imports,
    nesting depth, long methods, god classes, hardcoded secrets.
    """

    @property
    def supported_extensions(self) -> List[str]:
        return [".py"]

    @property
    def language_name(self) -> str:
        return "python"

    def parse(self, file_path: str, project_root: str) -> FeatureVector:
        fv = FeatureVector(file_path=file_path, language="python")
        try:
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                source = f.read()

            lines = source.splitlines()
            fv.loc = len(lines)
            fv.file_size_bytes = os.path.getsize(file_path)

            tree = ast.parse(source, filename=file_path)

            fv.imports, fv.import_count = self._extract_imports(tree)
            fv.internal_dep_count, fv.external_dep_count = self._classify_imports(
                fv.imports, project_root, file_path
            )
            fv.num_classes, fv.class_names = self._count_classes(tree)
            fv.num_functions, fv.function_names = self._count_functions(tree)
            fv.cyclomatic_complexity = self._compute_cyclomatic_complexity(tree)
            fv.max_nesting_depth = self._compute_max_nesting(tree)
            fv.has_god_class, fv.god_class_names = self._detect_god_classes(tree, lines)
            fv.has_long_methods, fv.long_method_names = self._detect_long_methods(tree, lines)
            fv.has_hardcoded_secrets = self._detect_hardcoded_secrets(source)
            fv.has_hardcoded_api_keys = self._detect_api_keys(source)

        except Exception as e:
            fv.parse_error = str(e)
        return fv

    # ── Import extraction ──────────────────────────────────────────

    def _extract_imports(self, tree: ast.AST):
        imports = []
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.append(alias.name)
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    imports.append(node.module)
        return imports, len(imports)

    def _classify_imports(self, imports: List[str], project_root: str, file_path: str):
        """Classify imports as internal (relative/project) vs external (stdlib/third-party)."""
        import sys
        stdlib_modules = set(sys.stdlib_module_names) if hasattr(sys, "stdlib_module_names") else set()

        internal = 0
        external = 0
        for imp in imports:
            top = imp.split(".")[0]
            if top in stdlib_modules:
                external += 1
            else:
                # Heuristic: check if a matching .py file exists in the project
                guessed = os.path.join(project_root, imp.replace(".", os.sep) + ".py")
                guessed_pkg = os.path.join(project_root, imp.replace(".", os.sep), "__init__.py")
                if os.path.exists(guessed) or os.path.exists(guessed_pkg):
                    internal += 1
                else:
                    external += 1
        return internal, external

    # ── Class / Function counts ────────────────────────────────────

    def _count_classes(self, tree: ast.AST):
        classes = [n for n in ast.walk(tree) if isinstance(n, ast.ClassDef)]
        return len(classes), [c.name for c in classes]

    def _count_functions(self, tree: ast.AST):
        funcs = [
            n for n in ast.walk(tree)
            if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))
        ]
        return len(funcs), [f.name for f in funcs]

    # ── Cyclomatic Complexity ──────────────────────────────────────

    def _compute_cyclomatic_complexity(self, tree: ast.AST) -> float:
        """
        Per-function McCabe complexity: 1 + number of decision points.
        Returns average across all functions (min 1.0 for non-empty files).
        """
        decision_nodes = (
            ast.If, ast.For, ast.While, ast.ExceptHandler,
            ast.With, ast.Assert, ast.BoolOp,
        )
        complexities = []
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                cc = 1
                for child in ast.walk(node):
                    if isinstance(child, decision_nodes):
                        if isinstance(child, ast.BoolOp):
                            cc += len(child.values) - 1
                        else:
                            cc += 1
                complexities.append(cc)
        return round(sum(complexities) / len(complexities), 2) if complexities else 1.0

    # ── Nesting Depth ──────────────────────────────────────────────

    def _compute_max_nesting(self, tree: ast.AST) -> int:
        def _depth(node, current=0):
            nesting_nodes = (ast.If, ast.For, ast.While, ast.With, ast.Try, ast.ExceptHandler)
            max_d = current
            for child in ast.iter_child_nodes(node):
                if isinstance(child, nesting_nodes):
                    max_d = max(max_d, _depth(child, current + 1))
                else:
                    max_d = max(max_d, _depth(child, current))
            return max_d
        return _depth(tree)

    # ── God Class / Long Method ────────────────────────────────────

    def _detect_god_classes(self, tree: ast.AST, lines: List[str]):
        god_classes = []
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                methods = [n for n in ast.walk(node) if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))]
                class_loc = (node.end_lineno or 0) - node.lineno if hasattr(node, "end_lineno") else 0
                if len(methods) >= self.GOD_CLASS_METHOD_THRESHOLD or class_loc >= self.GOD_CLASS_LOC_THRESHOLD:
                    god_classes.append(node.name)
        return len(god_classes) > 0, god_classes

    def _detect_long_methods(self, tree: ast.AST, lines: List[str]):
        long_methods = []
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                if hasattr(node, "end_lineno"):
                    method_loc = (node.end_lineno or 0) - node.lineno
                    if method_loc >= self.LONG_METHOD_THRESHOLD:
                        long_methods.append(node.name)
        return len(long_methods) > 0, long_methods

    # ── Secrets / API Key Detection ────────────────────────────────

    SECRET_PATTERNS = [
        r'(?i)(password|passwd|pwd|secret|token|credential)\s*=\s*["\'][^"\']{6,}["\']',
        r'(?i)(db_password|database_password)\s*=\s*["\'][^"\']+["\']',
    ]
    API_KEY_PATTERNS = [
        r'(?i)(api[_\-]?key|apikey|access[_\-]?key|auth[_\-]?token)\s*=\s*["\'][A-Za-z0-9_\-\.]{16,}["\']',
        r'(?i)(sk-[A-Za-z0-9]{20,})',  # OpenAI-style
        r'(?i)(AKIA[0-9A-Z]{16})',  # AWS key
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
