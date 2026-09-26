"""Application settings for PlagDet backend.

REQ-FUNC-36, REQ-FUNC-38, REQ-FUNC-39, REQ-FUNC-40:
Configure the temporary job directory, TTL, cleanup interval, and upload limits.
"""

from __future__ import annotations

import os
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


def _default_pool_size() -> int:
    return os.cpu_count() or 4


class Settings(BaseSettings):
    """Runtime settings loaded from environment variables."""

    model_config = SettingsConfigDict(env_prefix="", extra="ignore")

    TMP_DIR: Path = Field(default=Path("/tmp/plagdet"))
    RESULTS_TTL_SECONDS: int = 3600
    CLEANUP_INTERVAL_SECONDS: int = 900
    POOL_SIZE: int = Field(default_factory=_default_pool_size)
    MAX_FILE_SIZE: int = 10 * 1024 * 1024
    MAX_BATCH_SIZE: int = 500 * 1024 * 1024
    MAX_FILES: int = 10000
    DEFAULT_KGRAM_SIZE: int = 5
    DEFAULT_SIGNATURE_LENGTH: int = 200
    DEFAULT_THRESHOLD: int = 70
    DEFAULT_BANDS: int = 50
    ALLOWED_EXTENSIONS: dict[str, str] = Field(
        default_factory=lambda: {"c": ".c", "cpp": ".cpp", "python": ".py"}
    )
    CORS_ORIGINS: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]
    )


settings = Settings()
