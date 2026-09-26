"""Temporary job cleanup.

REQ-FUNC-38 to REQ-FUNC-41: periodic TTL purge plus immediate deletion helpers.
"""

from __future__ import annotations

import asyncio
import json
import logging
import shutil
from datetime import datetime, timedelta, timezone
from pathlib import Path

from app.config import settings


logger = logging.getLogger(__name__)


def delete_job_directory(job_id: str) -> None:
    """Delete a job directory immediately."""

    shutil.rmtree(settings.TMP_DIR / job_id, ignore_errors=True)


def _job_expiry_from_results(job_dir: Path) -> datetime | None:
    results_path = job_dir / "results.json"
    if not results_path.exists():
        return None

    try:
        payload = json.loads(results_path.read_text(encoding="utf-8"))
        expires_at = payload.get("expiresAt")
        if not isinstance(expires_at, str):
            return None
        expires_dt = datetime.fromisoformat(expires_at)
        if expires_dt.tzinfo is None:
            expires_dt = expires_dt.replace(tzinfo=timezone.utc)
        return expires_dt
    except Exception:
        return None


def _is_orphan_too_old(job_dir: Path) -> bool:
    mtime = datetime.fromtimestamp(job_dir.stat().st_mtime, tz=timezone.utc)
    return datetime.now(timezone.utc) - mtime > timedelta(hours=2)


async def cleanup_expired_jobs() -> None:
    """Sweep for expired or orphaned job directories forever."""

    settings.TMP_DIR.mkdir(parents=True, exist_ok=True)
    while True:
        try:
            now = datetime.now(timezone.utc)
            for job_dir in settings.TMP_DIR.iterdir():
                if not job_dir.is_dir():
                    continue

                expires_at = _job_expiry_from_results(job_dir)
                if expires_at is not None and expires_at < now:
                    logger.info("Deleting expired job directory %s", job_dir)
                    shutil.rmtree(job_dir, ignore_errors=True)
                    continue

                if expires_at is None and _is_orphan_too_old(job_dir):
                    logger.info("Deleting orphaned job directory %s", job_dir)
                    shutil.rmtree(job_dir, ignore_errors=True)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Cleanup sweep failed")

        await asyncio.sleep(settings.CLEANUP_INTERVAL_SECONDS)
