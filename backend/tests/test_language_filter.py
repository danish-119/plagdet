from __future__ import annotations

from pathlib import Path

from pipeline.language_filter import filter_by_extension


def test_filter_by_extension_handles_mixed_and_hidden(tmp_path):
    good = tmp_path / "main.c"
    good.write_text("int main(void) { return 0; }", encoding="utf-8")
    hidden = tmp_path / ".hidden.c"
    hidden.write_text("int x;", encoding="utf-8")
    no_ext = tmp_path / "README"
    no_ext.write_text("text", encoding="utf-8")
    other = tmp_path / "notes.py"
    other.write_text("print('hi')", encoding="utf-8")

    accepted, ignored = filter_by_extension([good, hidden, no_ext, other], "c")

    assert accepted == [good]
    assert ignored == 3


def test_filter_by_extension_empty_list():
    accepted, ignored = filter_by_extension([], "python")
    assert accepted == []
    assert ignored == 0
