"""Shared pytest fixtures for the backend test suite."""

from __future__ import annotations

import asyncio
import queue
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app
from api.jobs import jobs
from ipc.progress import ProgressEmitter


class DummyPool:
    def imap_unordered(self, func, tasks):
        for task in tasks:
            yield func(task)

    def close(self):
        return None

    def join(self):
        return None


@pytest.fixture()
def app_client(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "TMP_DIR", tmp_path / "plagdet", raising=False)
    monkeypatch.setattr(settings, "CLEANUP_INTERVAL_SECONDS", 3600, raising=False)
    monkeypatch.setattr(settings, "RESULTS_TTL_SECONDS", 3600, raising=False)
    jobs.clear()
    with TestClient(app) as client:
        yield client
    jobs.clear()


@pytest.fixture()
def sample_c_files() -> Path:
    return Path(__file__).parent / "fixtures" / "c_original"


@pytest.fixture()
def tmp_job_dir(tmp_path, monkeypatch) -> Path:
    monkeypatch.setattr(settings, "TMP_DIR", tmp_path / "plagdet", raising=False)
    return settings.TMP_DIR


@pytest.fixture()
def mock_emitter() -> ProgressEmitter:
    return ProgressEmitter("test-job", queue.Queue())


@pytest.fixture()
def dummy_pool() -> DummyPool:
    return DummyPool()
