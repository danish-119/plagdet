"""Regex-based C tokenizer and normalizer."""

from __future__ import annotations

import re
from pathlib import Path

from pipeline.lexer.common import C_KEYWORDS, C_STD_LIBS, map_identifiers, normalize_whitespace


TOKEN_PATTERN = re.compile(
    r'"(?:\\.|[^"\\])*"'  # string literal
    r"|'(?:\\.|[^'\\])*'"  # char literal
    r"|0x[0-9A-Fa-f]+"
    r"|\d+\.\d+"
    r"|\d+"
    r"|[A-Za-z_][A-Za-z0-9_]*"
    r"|==|!=|<=|>=|->|::|\+\+|--|&&|\|\||<<|>>"
    r"|[{}()\[\];,\.:?~!%^*/+\-=<>|&]"
)

_COMMENT_SPAN_PATTERN = re.compile(r"//.*?$|/\*.*?\*/", re.MULTILINE | re.DOTALL)


def _strip_comments(text: str) -> str:
    return _COMMENT_SPAN_PATTERN.sub(lambda match: re.sub(r"[^\n]", " ", match.group(0)), text)


def lex_c_source(text: str) -> dict[str, list[int] | list[str]]:
    """Tokenize C source code into normalized semantic tokens."""

    try:
        cleaned = _strip_comments(text)
        raw_tokens = TOKEN_PATTERN.findall(cleaned)
        if not raw_tokens:
            blob = normalize_whitespace(cleaned)
            tokens = [blob or text]
            return {"tokens": tokens, "line_map": [1] * len(tokens)}
        line_map = [cleaned.count("\n", 0, match.start()) + 1 for match in TOKEN_PATTERN.finditer(cleaned)]
        tokens = raw_tokens or [normalize_whitespace(cleaned) or text]
        comparison_tokens = map_identifiers(raw_tokens, C_KEYWORDS, C_STD_LIBS) or tokens
        if len(tokens) != len(line_map):
            line_map = [1] * len(tokens)
        return {"tokens": tokens, "comparison_tokens": comparison_tokens, "line_map": line_map}
    except Exception:
        tokens = [normalize_whitespace(text) or text]
        return {"tokens": tokens, "line_map": [1] * len(tokens)}


def lex_c_file(path: Path) -> dict[str, list[int] | list[str]]:
    """Lex a file path containing C source."""

    try:
        return lex_c_source(path.read_text(encoding="utf-8", errors="ignore"))
    except Exception:
        tokens = [normalize_whitespace(path.read_text(encoding="utf-8", errors="ignore")) or path.name]
        return {"tokens": tokens, "line_map": [1] * len(tokens)}
