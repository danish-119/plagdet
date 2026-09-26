"""SSE job stream and status endpoints."""

from __future__ import annotations

import asyncio
import json
import queue as sync_queue
from typing import Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from api.jobs import get_job, get_job_status


router = APIRouter()
KEEPALIVE_SECONDS = 15


def _sse(event_name: str, data: dict[str, Any]) -> str:
    return f"event: {event_name}\ndata: {json.dumps(data)}\n\n"


async def _next_event(queue: Any) -> dict[str, Any]:
    if hasattr(queue, "get") and asyncio.iscoroutinefunction(queue.get):
        return await asyncio.wait_for(queue.get(), timeout=KEEPALIVE_SECONDS)
    try:
        return await asyncio.to_thread(queue.get, True, KEEPALIVE_SECONDS)
    except sync_queue.Empty as exc:
        raise asyncio.TimeoutError from exc


async def _stream(job_id: str):
    state = get_job(job_id)
    if state is None:
        yield _sse("error", {"message": "Job not found", "code": "JOB_NOT_FOUND"})
        return

    queue = state["queue"]
    while True:
        try:
            event = await _next_event(queue)
        except asyncio.TimeoutError:
            yield ": ping\n\n"
            continue

        event_type = event.get("type")
        if event_type == "complete":
            yield _sse("complete", event)
            return
        if event_type == "error":
            yield _sse("error", event)
            return
        yield _sse("phase", {"phase": event.get("phase"), "progress": event.get("progress", 0.0), "message": event.get("message", "")})


@router.get("/api/jobs/{job_id}/stream")
async def stream_job(job_id: str) -> StreamingResponse:
    """Stream job progress as server-sent events."""

    return StreamingResponse(_stream(job_id), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "Connection": "keep-alive"})


@router.get("/api/jobs/{job_id}/status")
async def get_status(job_id: str) -> dict[str, Any]:
    """Return the current job status for polling fallbacks."""

    status_payload = get_job_status(job_id)
    if status_payload is None:
        raise HTTPException(status_code=404, detail={"message": "Job not found"})
    return status_payload
