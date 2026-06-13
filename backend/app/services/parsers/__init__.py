from app.services.parsers.base import BaseParser, FeatureVector
from app.services.parsers.python_parser import PythonParser
from app.services.parsers.java_parser import JavaParser
from typing import Dict, Optional

# ── Parser Registry ──────────────────────────────────────────────────────────
# To add a new language: instantiate your parser here and it's automatically
# picked up by the analysis engine.

PARSER_REGISTRY: Dict[str, BaseParser] = {}

def _register(parser: BaseParser):
    for ext in parser.supported_extensions:
        PARSER_REGISTRY[ext] = parser

_register(PythonParser())
_register(JavaParser())


def get_parser(file_extension: str) -> Optional[BaseParser]:
    """Return the parser for a given file extension, or None if unsupported."""
    return PARSER_REGISTRY.get(file_extension.lower())


__all__ = ["BaseParser", "FeatureVector", "PythonParser", "JavaParser", "get_parser", "PARSER_REGISTRY"]
