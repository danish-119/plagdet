from __future__ import annotations

from pipeline.lexer.c_lexer import lex_c_source
from pipeline.lexer.cpp_lexer import lex_cpp_source
from pipeline.lexer.python_lexer import lex_python_source


def test_c_lexer_strips_comments_and_normalizes_identifiers():
    payload = lex_c_source(
        """
        // comment
        int add(int first, int second) {
            return first + second + 42;
        }
        """
    )

    tokens = payload["tokens"]

    assert "comment" not in " ".join(tokens)
    assert "add" in tokens
    assert "first" in tokens
    assert "+" in tokens
    assert "42" in tokens
    assert len(payload["line_map"]) == len(tokens)


def test_cpp_lexer_preserves_standard_library_calls():
    payload = lex_cpp_source(
        """
        #include <iostream>
        int main() {
            std::cout << "Hello" << std::endl;
            return 0;
        }
        """
    )

    tokens = payload["tokens"]

    assert "std" in tokens
    assert "cout" in tokens
    assert "endl" in tokens
    assert "<<" in tokens
    assert len(payload["line_map"]) == len(tokens)


def test_python_lexer_strips_docstrings_and_maps_identifiers():
    payload = lex_python_source(
        '''
        """module docstring"""
        def greet(name):
            """function docstring"""
            print(name)
            return name
        '''
    )

    tokens = payload["tokens"]

    assert "module docstring" not in " ".join(tokens)
    assert "function docstring" not in " ".join(tokens)
    assert "print" in tokens
    assert "greet" in tokens
    assert "name" in tokens
    assert len(payload["line_map"]) == len(tokens)
