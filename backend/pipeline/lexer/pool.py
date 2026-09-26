"""Parallel lexing using multiprocessing.Pool.

REQ-FUNC-27, REQ-FUNC-28, REQ-FUNC-29: run lexing in parallel with the configured pool.
"""

from __future__ import annotations

import time
from multiprocessing.pool import Pool
from pathlib import Path

from ipc.progress import ProgressEmitter
from pipeline.lexer.c_lexer import lex_c_file
from pipeline.lexer.cpp_lexer import lex_cpp_file
from pipeline.lexer.python_lexer import lex_python_file


def _pool_processes(pool: Pool) -> int:
    return max(1, int(getattr(pool, "_processes", 1) or 1))


def _chunk_size(total: int, pool: Pool) -> int:
    return max(1, total // (_pool_processes(pool) * 4))


def _phase_timed_out(phase_started_at: float | None, timeout_seconds: float | None) -> bool:
    return phase_started_at is not None and timeout_seconds is not None and (time.perf_counter() - phase_started_at) > timeout_seconds


def _lex_worker(task: tuple[str, str]) -> dict[str, object]:
    file_name, language = task
    path = Path(file_name)
    if language == "c":
        payload = lex_c_file(path)
    elif language == "cpp":
        payload = lex_cpp_file(path)
    else:
        payload = lex_python_file(path)
    tokens = list(payload["tokens"])
    comparison_tokens = list(payload.get("comparison_tokens") or tokens)
    return {"filename": str(path), "tokens": tokens, "comparison_tokens": comparison_tokens, "line_map": list(payload["line_map"]), "token_count": len(tokens)}


def parallel_lex(
    files: list[Path],
    language: str,
    pool: Pool,
    emitter: ProgressEmitter,
    phase_started_at: float | None = None,
    timeout_seconds: float | None = None,
) -> list[dict[str, object]]:
    """Normalize files in parallel and report progress as each completes."""

    if not files:
        return []

    tasks = [(str(file_path), language) for file_path in files]
    results: list[dict[str, object]] = []
    total = len(tasks)
    last_pct = -1
    chunksize = _chunk_size(total, pool)

    emitter.emit_phase("lexing", 0.0, f"Normalizing {total} files with {_pool_processes(pool)} workers...")

    try:
        iterator = pool.imap_unordered(_lex_worker, tasks, chunksize=chunksize)
    except TypeError:
        iterator = pool.imap_unordered(_lex_worker, tasks)

    for index, result in enumerate(iterator, start=1):
        if _phase_timed_out(phase_started_at, timeout_seconds):
            raise TimeoutError("Phase lexing exceeded timeout")
        percentage = min(90, (index * 100) // total)
        percentage = (percentage // 10) * 10
        if percentage > last_pct:
            emitter.emit_phase("lexing", index / total, f"Normalizing files... ({percentage}%)")
            last_pct = percentage
        results.append(result)

    emitter.emit_phase("lexing", 1.0, f"Normalization complete: {total} files processed")

    return sorted(results, key=lambda item: str(item["filename"]))
