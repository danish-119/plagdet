"""MinHash signature compression.

REQ-FUNC-22: compress shingle sets into deterministic MinHash signatures.
"""

from __future__ import annotations

import time
from multiprocessing.pool import Pool

from bridge import ckernel as bridge
from ipc.progress import ProgressEmitter
from pipeline.hashing.kgram import generate_kggrams


def compute_minhash(shingle_set: set[int], signature_length: int = 100, seed: int = 42) -> list[int]:
    """Generate a deterministic MinHash signature."""

    if signature_length <= 0:
        return []
    if not shingle_set:
        return [0 for _ in range(signature_length)]

    shingles = sorted(shingle_set)
    return bridge.minhash_batch(shingles, signature_length)


def _hash_worker(task: tuple[str, list[str], int, int, int]) -> dict[str, object]:
    filename, tokens, k, signature_length, seed = task
    shingles = generate_kggrams(tokens, k=k)
    signature = compute_minhash(shingles, signature_length=signature_length, seed=seed)
    return {"filename": filename, "signature": signature}


def _pool_processes(pool: Pool) -> int:
    return max(1, int(getattr(pool, "_processes", 1) or 1))


def _chunk_size(total: int, pool: Pool) -> int:
    return max(1, total // (_pool_processes(pool) * 4))


def _phase_timed_out(phase_started_at: float | None, timeout_seconds: float | None) -> bool:
    return phase_started_at is not None and timeout_seconds is not None and (time.perf_counter() - phase_started_at) > timeout_seconds


def parallel_hash(
    tokenized_files: list[dict[str, object]],
    k: int,
    signature_length: int,
    pool: Pool,
    emitter: ProgressEmitter,
    phase_started_at: float | None = None,
    timeout_seconds: float | None = None,
) -> list[dict[str, object]]:
    """Generate MinHash signatures in parallel."""

    if not tokenized_files:
        return []

    tasks = [
        (str(item["filename"]), list(item.get("comparison_tokens") or item["tokens"]), k, signature_length, 42)
        for item in tokenized_files
    ]
    total = len(tasks)
    results: list[dict[str, object]] = []
    last_pct = -1
    chunksize = _chunk_size(total, pool)

    emitter.emit_phase("hashing", 0.0, f"Generating MinHash signatures for {total} files...")

    try:
        iterator = pool.imap_unordered(_hash_worker, tasks, chunksize=chunksize)
    except TypeError:
        iterator = pool.imap_unordered(_hash_worker, tasks)

    for index, result in enumerate(iterator, start=1):
        if _phase_timed_out(phase_started_at, timeout_seconds):
            raise TimeoutError("Phase hashing exceeded timeout")
        percentage = min(90, (index * 100) // total)
        percentage = (percentage // 10) * 10
        if percentage > last_pct:
            emitter.emit_phase("hashing", index / total, f"Generating MinHash signatures... ({percentage}%)")
            last_pct = percentage
        results.append(result)

    emitter.emit_phase("hashing", 1.0, "MinHash signatures complete")

    return sorted(results, key=lambda item: str(item["filename"]))
