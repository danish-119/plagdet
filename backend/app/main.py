"""FastAPI application entrypoint.

REQ-FUNC-30 to REQ-FUNC-41: route registration, startup/shutdown handling,
temporary storage initialization, and cleanup task lifecycle.
"""

from __future__ import annotations

import asyncio

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from api.export import router as export_router
from api.jobs import router as jobs_router
from api.results import router as results_router
from api.stream import router as stream_router
from file_manager.cleanup import cleanup_expired_jobs


app = FastAPI(title="PlagDet API", version="3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jobs_router)
app.include_router(stream_router)
app.include_router(results_router)
app.include_router(export_router)


@app.on_event("startup")
async def startup_event() -> None:
    """Create the temp directory and launch the cleanup task."""

    settings.TMP_DIR.mkdir(parents=True, exist_ok=True)
    app.state.cleanup_task = asyncio.create_task(cleanup_expired_jobs())


@app.on_event("shutdown")
async def shutdown_event() -> None:
    """Cancel the cleanup task on shutdown."""

    cleanup_task = getattr(app.state, "cleanup_task", None)
    if cleanup_task is not None:
        cleanup_task.cancel()
        try:
            await cleanup_task
        except asyncio.CancelledError:
            pass


@app.get("/")
async def health_check() -> dict[str, str]:
    """Root health check endpoint."""

    return {"status": "ok", "version": "3.0"}
