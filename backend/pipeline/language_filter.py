"""Language-based file filtering.

REQ-FUNC-01 to REQ-FUNC-06: keep only the selected language extension and ignore
hidden or extension-less files.
"""

from __future__ import annotations

from pathlib import Path

from app.config import settings


def filter_by_extension(file_paths: list[Path], language: str) -> tuple[list[Path], int]:
    """Return matching files and the number of ignored entries."""

    extension = settings.ALLOWED_EXTENSIONS[language]
    accepted: list[Path] = []
    ignored = 0

    for path in file_paths:
        name = path.name
        if name.startswith(".") or path.suffix == "":
            ignored += 1
            continue
        if path.suffix.lower() != extension:
            ignored += 1
            continue
        accepted.append(path)

    return accepted, ignored
