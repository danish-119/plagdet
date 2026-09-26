from __future__ import annotations

import asyncio
import queue

from api.jobs import jobs
from api.stream import _stream


def test_stream_event_format_and_keepalive(monkeypatch):
    job_id = "stream-job"
    q = queue.Queue()
    q.put({"type": "phase", "phase": "lexing", "progress": 0.5, "message": "working"})
    jobs[job_id] = {
        "status": "queued",
        "progress": 0.0,
        "phase": "queued",
        "message": "queued",
        "queue": q,
    }

    async def read_chunk():
        return await asyncio.wait_for(_stream(job_id).__anext__(), timeout=1.0)

    chunk = asyncio.run(read_chunk())
    assert "event: phase" in chunk
    assert "data:" in chunk

    jobs.pop(job_id, None)


def test_stream_keepalive_ping(monkeypatch):
    from api import stream as stream_module

    monkeypatch.setattr(stream_module, "KEEPALIVE_SECONDS", 0.01)
    job_id = "keepalive-job"
    q = queue.Queue()
    jobs[job_id] = {
        "status": "queued",
        "progress": 0.0,
        "phase": "queued",
        "message": "queued",
        "queue": q,
    }

    async def read_ping():
        generator = _stream(job_id)
        return await asyncio.wait_for(generator.__anext__(), timeout=1.0)

    ping = asyncio.run(read_ping())
    assert ": ping" in ping

    jobs.pop(job_id, None)
