from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class FeatureVector:
    """Structured metrics extracted from a single source file."""
    file_path: str
    language: str
    loc: int = 0
    file_size_bytes: int = 0
    num_classes: int = 0
    num_functions: int = 0
    cyclomatic_complexity: float = 0.0
    max_nesting_depth: int = 0
    import_count: int = 0
    imports: List[str] = field(default_factory=list)
    internal_dep_count: int = 0
    external_dep_count: int = 0
    has_duplicate_code: bool = False
    has_hardcoded_secrets: bool = False
    has_hardcoded_api_keys: bool = False
    has_god_class: bool = False
    has_long_methods: bool = False
    long_method_names: List[str] = field(default_factory=list)
    god_class_names: List[str] = field(default_factory=list)
    class_names: List[str] = field(default_factory=list)
    function_names: List[str] = field(default_factory=list)
    parse_error: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "file": self.file_path,
            "language": self.language,
            "loc": self.loc,
            "file_size_bytes": self.file_size_bytes,
            "classes": self.num_classes,
            "functions": self.num_functions,
            "complexity": self.cyclomatic_complexity,
            "max_nesting_depth": self.max_nesting_depth,
            "import_count": self.import_count,
            "imports": self.imports,
            "internal_deps": self.internal_dep_count,
            "external_deps": self.external_dep_count,
            "duplicate_code": self.has_duplicate_code,
            "hardcoded_secrets": self.has_hardcoded_secrets,
            "hardcoded_api_keys": self.has_hardcoded_api_keys,
            "god_class": self.has_god_class,
            "long_methods": self.has_long_methods,
            "long_method_names": self.long_method_names,
            "god_class_names": self.god_class_names,
        }


class BaseParser(ABC):
    """
    Pluggable language parser interface.
    New languages can be added by subclassing BaseParser and registering in PARSER_REGISTRY.
    """

    @property
    @abstractmethod
    def supported_extensions(self) -> List[str]:
        """File extensions this parser handles, e.g. ['.py']"""
        ...

    @property
    @abstractmethod
    def language_name(self) -> str:
        """Human-readable language name, e.g. 'python'"""
        ...

    @abstractmethod
    def parse(self, file_path: str, project_root: str) -> FeatureVector:
        """
        Parse a single source file and return its feature vector.
        Must never raise — return a FeatureVector with parse_error set on failure.
        """
        ...

    # ── Constants used by all parsers ──
    GOD_CLASS_METHOD_THRESHOLD = 10    # methods per class (lowered from 20)
    GOD_CLASS_LOC_THRESHOLD = 200      # lines per class (lowered from 500)
    LONG_METHOD_THRESHOLD = 20         # lines per method (lowered from 50)
    CYCLOMATIC_HIGH_THRESHOLD = 10     # CC per function
