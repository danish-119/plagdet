"""Results retrieval endpoint."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from api.jobs import get_job, get_job_status
from file_manager.storage import load_results


router = APIRouter()


@router.get("/api/jobs/{job_id}/results")
async def get_results(job_id: str) -> Any:
    """Load analysis results or return current processing status."""

    state = get_job(job_id)
    if state is not None and state.get("status") in {"queued", "processing"}:
        status_payload = get_job_status(job_id)
        return JSONResponse(status_code=202, content=status_payload)

    results = load_results(job_id)
    return results
