"""Progress event emitter for SSE and job status updates.

REQ-FUNC-30, REQ-FUNC-31, REQ-FUNC-32: emit phase and completion events that the
frontend consumes via SSE, while allowing processing to continue independently.
"""

from __future__ import annotations

import asyncio
from collections.abc import Callable
from typing import Any


class ProgressEmitter:
    """Emit pipeline progress into a queue and optional status callback."""

    def __init__(
        self,
        job_id: str,
        queue: Any,
        loop: asyncio.AbstractEventLoop | None = None,
        status_callback: Callable[[dict[str, Any]], None] | None = None,
        cancel_event: Any | None = None,
    ) -> None:
        self.job_id = job_id
        self.queue = queue
        self.loop = loop
        self.status_callback = status_callback
        self.cancel_event = cancel_event

    def _enqueue(self, event: dict[str, Any]) -> None:
        if self.loop is not None and self.loop.is_running():
            self.loop.call_soon_threadsafe(self.queue.put_nowait, event)
        elif hasattr(self.queue, "put_nowait"):
            self.queue.put_nowait(event)
        else:
            self.queue.put(event)

        if self.status_callback is not None:
            self.status_callback(event)

    def emit_phase(self, phase: str, progress: float, message: str) -> None:
        """Emit a phase update."""

        self._enqueue({"type": "phase", "phase": phase, "progress": progress, "message": message})

    def emit_complete(self, elapsed_seconds: float) -> None:
        """Emit a completion event."""

        self._enqueue(
            {
                "type": "complete",
                "phase": "completed",
                "progress": 1.0,
                "jobId": self.job_id,
                "elapsedSeconds": elapsed_seconds,
            }
        )

    def emit_error(self, message: str) -> None:
        """Emit an error event."""

        self._enqueue({"type": "error", "phase": "failed", "progress": 0.0, "message": message})
