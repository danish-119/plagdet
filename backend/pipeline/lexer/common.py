"""Shared lexer helpers for C, C++, and Python token normalization."""

from __future__ import annotations

import re
from collections.abc import Sequence


IDENTIFIER_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")

C_KEYWORDS = {
    "auto",
    "break",
    "case",
    "char",
    "const",
    "continue",
    "default",
    "do",
    "double",
    "else",
    "enum",
    "extern",
    "float",
    "for",
    "goto",
    "if",
    "inline",
    "int",
    "long",
    "register",
    "restrict",
    "return",
    "short",
    "signed",
    "sizeof",
    "static",
    "struct",
    "switch",
    "typedef",
    "union",
    "unsigned",
    "void",
    "volatile",
    "while",
}

CPP_KEYWORDS = C_KEYWORDS | {
    "alignas",
    "alignof",
    "and",
    "and_eq",
    "asm",
    "bitand",
    "bitor",
    "bool",
    "catch",
    "class",
    "compl",
    "constexpr",
    "const_cast",
    "delete",
    "dynamic_cast",
    "explicit",
    "export",
    "false",
    "friend",
    "mutable",
    "namespace",
    "new",
    "noexcept",
    "not",
    "not_eq",
    "nullptr",
    "operator",
    "or",
    "or_eq",
    "private",
    "protected",
    "public",
    "reinterpret_cast",
    "static_assert",
    "static_cast",
    "template",
    "this",
    "thread_local",
    "throw",
    "true",
    "try",
    "typeid",
    "typename",
    "using",
    "virtual",
    "wchar_t",
    "xor",
    "xor_eq",
}

PYTHON_KEYWORDS = {
    "False",
    "None",
    "True",
    "and",
    "as",
    "assert",
    "async",
    "await",
    "break",
    "class",
    "continue",
    "def",
    "del",
    "elif",
    "else",
    "except",
    "finally",
    "for",
    "from",
    "global",
    "if",
    "import",
    "in",
    "is",
    "lambda",
    "nonlocal",
    "not",
    "or",
    "pass",
    "raise",
    "return",
    "try",
    "while",
    "with",
    "yield",
}

C_STD_LIBS = {
    "abort",
    "abs",
    "calloc",
    "exit",
    "free",
    "malloc",
    "memcpy",
    "memset",
    "printf",
    "scanf",
    "sprintf",
    "sscanf",
    "strlen",
    "strcpy",
    "strncpy",
    "strcmp",
    "puts",
    "putchar",
    "fopen",
    "fclose",
    "fread",
    "fwrite",
    "realloc",
    "qsort",
}

CPP_STD_LIBS = C_STD_LIBS | {
    "cin",
    "cout",
    "cerr",
    "clog",
    "endl",
    "getline",
    "push_back",
    "emplace_back",
    "size",
    "begin",
    "end",
    "string",
    "vector",
    "map",
    "set",
    "unordered_map",
    "unordered_set",
}

PY_STD_LIBS = {
    "abs",
    "all",
    "any",
    "bool",
    "dict",
    "enumerate",
    "float",
    "input",
    "int",
    "isinstance",
    "len",
    "list",
    "map",
    "max",
    "min",
    "open",
    "print",
    "range",
    "set",
    "sorted",
    "str",
    "sum",
    "tuple",
    "type",
    "zip",
}


def normalize_whitespace(text: str) -> str:
    """Collapse all whitespace to a single space."""

    return re.sub(r"\s+", " ", text).strip()


def map_identifiers(tokens: Sequence[str], keywords: set[str], stdlib_names: set[str]) -> list[str]:
    """Map identifiers to VAR_N / FUNC_N while preserving keywords and stdlib names."""

    mapped: list[str] = []
    var_map: dict[str, str] = {}
    func_map: dict[str, str] = {}

    for index, token in enumerate(tokens):
        if token in var_map:
            mapped.append(var_map[token])
            continue
        if token in func_map:
            mapped.append(func_map[token])
            continue

        if not IDENTIFIER_RE.match(token) or token in keywords or token in stdlib_names:
            mapped.append(token)
            continue

        next_token = tokens[index + 1] if index + 1 < len(tokens) else None
        if next_token == "(":
            func_map[token] = f"FUNC_{len(func_map) + 1}"
            mapped.append(func_map[token])
        else:
            var_map[token] = f"VAR_{len(var_map) + 1}"
            mapped.append(var_map[token])

    return mapped


