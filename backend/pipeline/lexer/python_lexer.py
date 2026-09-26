"""Python tokenizer and normalizer using the standard tokenize module."""

from __future__ import annotations

import ast
import io
import re
import tokenize
import textwrap
from pathlib import Path

from pipeline.lexer.common import PYTHON_KEYWORDS, PY_STD_LIBS, map_identifiers, normalize_whitespace


def _docstring_spans(text: str) -> set[tuple[int, int]]:
    spans: set[tuple[int, int]] = set()
    try:
        tree = ast.parse(textwrap.dedent(text))
    except SyntaxError:
        return spans

    nodes = [tree, *ast.walk(tree)]
    for node in nodes:
        body = getattr(node, "body", None)
        if not body:
            continue
        first = body[0]
        if isinstance(first, ast.Expr) and isinstance(getattr(first, "value", None), ast.Constant):
            if isinstance(first.value.value, str):
                spans.add((first.lineno, getattr(first, "end_lineno", first.lineno)))
    return spans


def lex_python_source(text: str) -> dict[str, list[int] | list[str]]:
    """Tokenize Python source code while stripping comments and docstrings."""

    try:
        cleaned_text = textwrap.dedent(text)
        docstring_spans = _docstring_spans(cleaned_text)
        raw_tokens: list[str] = []
        line_map: list[int] = []
        reader = io.StringIO(cleaned_text).readline
        for token in tokenize.generate_tokens(reader):
            if token.type in {tokenize.ENCODING, tokenize.NL, tokenize.NEWLINE, tokenize.INDENT, tokenize.DEDENT, tokenize.ENDMARKER}:
                continue
            if token.type == tokenize.COMMENT:
                continue
            if token.type == tokenize.STRING and any(start <= token.start[0] <= end for start, end in docstring_spans):
                continue
            raw_tokens.append(token.string)
            line_map.append(token.start[0])

        tokens = raw_tokens or [normalize_whitespace(cleaned_text) or cleaned_text]
        comparison_tokens = map_identifiers(raw_tokens, PYTHON_KEYWORDS, PY_STD_LIBS) or tokens
        if len(tokens) != len(line_map):
            line_map = [1] * len(tokens)
        return {"tokens": tokens, "comparison_tokens": comparison_tokens, "line_map": line_map}
    except (SyntaxError, tokenize.TokenError):
        cleaned_text = textwrap.dedent(text)
        tokens = [normalize_whitespace(cleaned_text) or cleaned_text]
        return {"tokens": tokens, "line_map": [1] * len(tokens)}
    except Exception:
        cleaned_text = textwrap.dedent(text)
        tokens = [normalize_whitespace(cleaned_text) or cleaned_text]
        return {"tokens": tokens, "line_map": [1] * len(tokens)}


def lex_python_file(path: Path) -> dict[str, list[int] | list[str]]:
    """Lex a file path containing Python source."""

    try:
        return lex_python_source(path.read_text(encoding="utf-8", errors="ignore"))
    except Exception:
        tokens = [normalize_whitespace(path.read_text(encoding="utf-8", errors="ignore")) or path.name]
        return {"tokens": tokens, "line_map": [1] * len(tokens)}
