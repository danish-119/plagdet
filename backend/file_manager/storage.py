"""Upload persistence and results storage.

REQ-FUNC-07 to REQ-FUNC-14, REQ-FUNC-36, REQ-FUNC-37:
Validate uploads, extract archives, persist temporary files, and store results JSON.
"""

from __future__ import annotations

import io
import json
import zipfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import HTTPException, UploadFile

from app.config import settings


@dataclass(slots=True)
class SavedUploadBundle:
    """Saved upload directory plus file counts."""

    upload_dir: Path
    valid_count: int
    ignored_count: int

    def __iter__(self):
        yield self.upload_dir
        yield self.valid_count
        yield self.ignored_count


def get_job_dir(job_id: str) -> Path:
    """Return the temporary directory for a job."""

    return settings.TMP_DIR / job_id


def _language_extension(language: str) -> str:
    try:
        return settings.ALLOWED_EXTENSIONS[language]
    except KeyError as exc:  # pragma: no cover - validated by API layer
        raise HTTPException(status_code=400, detail={"message": "Unsupported language"}) from exc


def _is_hidden(path_name: str) -> bool:
    return Path(path_name).name.startswith(".")


def _read_upload_bytes(upload: UploadFile) -> bytes:
    file_obj = upload.file
    file_obj.seek(0)
    return file_obj.read()


def _unique_target_path(directory: Path, filename: str) -> Path:
    target = directory / filename
    suffix = 1
    while target.exists():
        target = directory / f"{target.stem}_{suffix}{target.suffix}"
        suffix += 1
    return target


def _save_source_file(
    directory: Path,
    filename: str,
    content: bytes,
    max_batch_bytes: int,
    totals: dict[str, int],
) -> bool:
    if totals["valid_count"] >= settings.MAX_FILES:
        totals["ignored_count"] += 1
        return False
    if len(content) == 0:
        totals["ignored_count"] += 1
        return False
    if totals["batch_size"] + len(content) > max_batch_bytes:
        totals["ignored_count"] += 1
        return False

    target = _unique_target_path(directory, Path(filename).name)
    target.write_bytes(content)
    totals["valid_count"] += 1
    totals["batch_size"] += len(content)
    return True


def _process_zip_bytes(
    archive_bytes: bytes,
    directory: Path,
    language_ext: str,
    totals: dict[str, int],
    depth: int,
) -> None:
    if depth > 3:
        totals["ignored_count"] += 1
        return

    with zipfile.ZipFile(io.BytesIO(archive_bytes)) as archive:
        for member in archive.infolist():
            if member.is_dir():
                continue

            member_name = Path(member.filename).name
            if _is_hidden(member_name):
                totals["ignored_count"] += 1
                continue

            try:
                payload = archive.read(member)
            except KeyError:
                totals["ignored_count"] += 1
                continue

            if len(payload) == 0:
                totals["ignored_count"] += 1
                continue

            if len(payload) > settings.MAX_FILE_SIZE:
                totals["ignored_count"] += 1
                continue

            suffix = Path(member_name).suffix.lower()
            if suffix == ".zip":
                _process_zip_bytes(payload, directory, language_ext, totals, depth + 1)
                continue

            if suffix != language_ext:
                totals["ignored_count"] += 1
                continue

            _save_source_file(directory, member_name, payload, settings.MAX_BATCH_SIZE, totals)


def save_uploaded_files(job_id: str, files: list[UploadFile], language: str) -> SavedUploadBundle:
    """Persist uploaded files for a job.

    REQ-FUNC-03, REQ-FUNC-05, REQ-FUNC-08 to REQ-FUNC-14, REQ-FUNC-36.
    """

    language_ext = _language_extension(language)
    upload_dir = get_job_dir(job_id) / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)

    totals = {"valid_count": 0, "ignored_count": 0, "batch_size": 0}

    for upload in files:
        filename = Path(upload.filename or "").name
        if not filename or _is_hidden(filename):
            totals["ignored_count"] += 1
            continue

        suffix = Path(filename).suffix.lower()
        try:
            payload = _read_upload_bytes(upload)
        except Exception:
            totals["ignored_count"] += 1
            continue

        if len(payload) > settings.MAX_FILE_SIZE:
            totals["ignored_count"] += 1
            continue

        if suffix == ".zip":
            _process_zip_bytes(payload, upload_dir, language_ext, totals, depth=1)
            continue

        if suffix != language_ext:
            totals["ignored_count"] += 1
            continue

        _save_source_file(upload_dir, filename, payload, settings.MAX_BATCH_SIZE, totals)

    if totals["valid_count"] == 0:
        raise HTTPException(status_code=400, detail={"message": f"No {language_ext} files found"})

    return SavedUploadBundle(upload_dir=upload_dir, valid_count=totals["valid_count"], ignored_count=totals["ignored_count"])


def save_results(job_id: str, results: dict[str, Any]) -> Path:
    """Write analysis results to the temporary job directory."""

    job_dir = get_job_dir(job_id)
    job_dir.mkdir(parents=True, exist_ok=True)
    results_path = job_dir / "results.json"
    results_path.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    return results_path


def _is_expired(results: dict[str, Any]) -> bool:
    expires_at = results.get("expiresAt")
    if not isinstance(expires_at, str):
        return True
    try:
        expires_dt = datetime.fromisoformat(expires_at)
    except ValueError:
        return True
    if expires_dt.tzinfo is None:
        expires_dt = expires_dt.replace(tzinfo=timezone.utc)
    return expires_dt < datetime.now(timezone.utc)


def load_results(job_id: str) -> dict[str, Any]:
    """Load persisted results or raise a 404 RESULTS_EXPIRED error."""

    results_path = get_job_dir(job_id) / "results.json"
    if not results_path.exists():
        raise HTTPException(
            status_code=404,
            detail={"code": "RESULTS_EXPIRED", "message": "These results have expired."},
        )

    results = json.loads(results_path.read_text(encoding="utf-8"))
    if _is_expired(results):
        raise HTTPException(
            status_code=404,
            detail={"code": "RESULTS_EXPIRED", "message": "These results have expired."},
        )
    return results
