"""Job creation and cancellation endpoints.

REQ-FUNC-01 to REQ-FUNC-14, REQ-FUNC-36 to REQ-FUNC-41, REQ-ANL-11, REQ-ANL-12.
"""

from __future__ import annotations

import asyncio
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, TypedDict

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.config import settings
from file_manager.cleanup import delete_job_directory
from file_manager.storage import save_uploaded_files
from ipc.progress import ProgressEmitter
from pipeline.orchestrator import PipelineCancelled, run_pipeline


router = APIRouter()


class JobState(TypedDict, total=False):
    status: str
    progress: float
    phase: str
    message: str
    queue: Any
    cancel_event: threading.Event
    thread: threading.Thread
    settings: dict[str, Any]
    upload_dir: str
    createdAt: str
    elapsedSeconds: float


jobs: dict[str, JobState] = {}
_jobs_lock = threading.Lock()


def _update_job_state(job_id: str, event: dict[str, Any]) -> None:
    with _jobs_lock:
        state = jobs.get(job_id)
        if state is None:
            return

        event_type = event.get("type")
        if event_type == "phase":
            phase = str(event.get("phase", "queued"))
            state.update(
                {
                    "status": "queued" if phase == "queued" else "processing",
                    "progress": float(event.get("progress", 0.0)),
                    "phase": phase,
                    "message": str(event.get("message", "")),
                }
            )
        elif event_type == "complete":
            state.update(
                {
                    "status": "completed",
                    "progress": 1.0,
                    "phase": "completed",
                    "message": "Analysis complete",
                    "elapsedSeconds": float(event.get("elapsedSeconds", 0.0)),
                }
            )
        elif event_type == "error":
            state.update(
                {
                    "status": "failed",
                    "progress": 0.0,
                    "phase": "failed",
                    "message": str(event.get("message", "")),
                }
            )


def get_job(job_id: str) -> JobState | None:
    with _jobs_lock:
        state = jobs.get(job_id)
        return dict(state) if state is not None else None


def get_job_status(job_id: str) -> dict[str, Any] | None:
    state = get_job(job_id)
    if state is None:
        return None
    return {
        "status": state.get("status", "queued"),
        "progress": float(state.get("progress", 0.0)),
        "phase": state.get("phase", "queued"),
        "message": state.get("message", ""),
        "jobId": job_id,
        **({"elapsedSeconds": state["elapsedSeconds"]} if "elapsedSeconds" in state else {}),
    }


def _job_runner(job_id: str, upload_dir: str, language: str, settings_payload: dict[str, Any], emitter: ProgressEmitter) -> None:
    try:
        result = run_pipeline(job_id, Path(upload_dir), language, settings_payload, emitter)
        with _jobs_lock:
            if job_id in jobs:
                jobs[job_id]["result"] = result  # type: ignore[index]
    except PipelineCancelled:
        with _jobs_lock:
            if job_id in jobs:
                jobs[job_id]["status"] = "cancelled"
    except Exception:
        with _jobs_lock:
            if job_id in jobs:
                jobs[job_id]["status"] = "failed"


@router.post("/api/jobs", status_code=status.HTTP_202_ACCEPTED)
async def create_job(
    language: str = Form(...),
    files: list[UploadFile] = File(...),
    kGramSize: int = Form(default=settings.DEFAULT_KGRAM_SIZE),
    signatureLength: int = Form(default=settings.DEFAULT_SIGNATURE_LENGTH),
    threshold: int = Form(default=settings.DEFAULT_THRESHOLD),
    bands: int = Form(default=settings.DEFAULT_BANDS),
) -> dict[str, str]:
    """Create a new analysis job and launch the pipeline in the background."""

    if language not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail={"message": "Unsupported language"})
    if signatureLength <= 0 or bands <= 0 or signatureLength % bands != 0:
        raise HTTPException(status_code=400, detail={"message": "Bands must divide signature length evenly"})

    job_id = uuid.uuid4().hex
    uploaded = save_uploaded_files(job_id, files, language)
    queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
    cancel_event = threading.Event()
    loop = asyncio.get_running_loop()

    settings_payload = {
        "pool_size": settings.POOL_SIZE,
        "kGramSize": kGramSize,
        "signatureLength": signatureLength,
        "threshold": threshold,
        "bands": bands,
    }

    state: JobState = {
        "status": "queued",
        "progress": 0.0,
        "phase": "queued",
        "message": "Job queued",
        "queue": queue,
        "cancel_event": cancel_event,
        "settings": settings_payload,
        "upload_dir": str(uploaded.upload_dir),
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    with _jobs_lock:
        jobs[job_id] = state

    emitter = ProgressEmitter(
        job_id,
        queue,
        loop=loop,
        status_callback=lambda event: _update_job_state(job_id, event),
        cancel_event=cancel_event,
    )

    thread = threading.Thread(
        target=_job_runner,
        args=(job_id, str(uploaded.upload_dir), language, settings_payload, emitter),
        daemon=True,
    )
    with _jobs_lock:
        jobs[job_id]["thread"] = thread
    thread.start()
    return {"jobId": job_id}


@router.delete("/api/jobs/{job_id}")
async def delete_job(job_id: str) -> dict[str, bool]:
    """Cancel and delete a job."""

    with _jobs_lock:
        state = jobs.get(job_id)
        if state is None:
            raise HTTPException(status_code=404, detail={"message": "Job not found"})
        cancel_event = state.get("cancel_event")
        if isinstance(cancel_event, threading.Event):
            cancel_event.set()
        jobs.pop(job_id, None)

    delete_job_directory(job_id)
    return {"deleted": True}
