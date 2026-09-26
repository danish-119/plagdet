"""LSH bucketing and candidate pair generation.

REQ-FUNC-23, REQ-FUNC-24, REQ-NFR-PERF-02: divide signatures into bands and keep only colliding pairs.
"""

from __future__ import annotations

import hashlib
import logging
import time
from collections import defaultdict
from itertools import combinations

from ipc.progress import ProgressEmitter


logger = logging.getLogger(__name__)


def _band_key(filename: str, band_values: list[int], band_index: int) -> str:
    payload = f"42:{band_index}:{','.join(map(str, band_values))}".encode("utf-8")
    return hashlib.blake2b(payload, digest_size=16).hexdigest()


def lsh_bucket(
    signatures: list[dict[str, object]],
    bands: int,
    threshold: float,
    emitter: ProgressEmitter,
    phase_started_at: float | None = None,
    timeout_seconds: float | None = None,
) -> list[tuple[str, str]]:
    """Generate candidate pairs from signatures that collide in at least one bucket."""

    emitter.emit_phase("bucketing", 0.0, f"Running LSH bucketing with {bands} bands...")
    if not signatures:
        emitter.emit_phase("bucketing", 1.0, "LSH complete: 0 candidates from 0 possible (0.0% filtered)")
        return []

    signature_length = len(list(signatures[0]["signature"]))
    rows_per_band = signature_length // bands
    if rows_per_band * bands != signature_length:
        raise ValueError("Signature length must be divisible by the number of bands")

    bucket_map: dict[str, set[str]] = defaultdict(set)
    for record in signatures:
        if phase_started_at is not None and timeout_seconds is not None and (time.perf_counter() - phase_started_at) > timeout_seconds:
            raise TimeoutError("Phase bucketing exceeded timeout")
        filename = str(record["filename"])
        signature = list(record["signature"])
        for band_index in range(bands):
            start_index = band_index * rows_per_band
            band_values = signature[start_index : start_index + rows_per_band]
            bucket_map[_band_key(filename, band_values, band_index)].add(filename)

    non_empty_buckets = sum(1 for filenames in bucket_map.values() if filenames)
    logger.debug("LSH bucket stats: bands=%s rows_per_band=%s non_empty_buckets=%s", bands, rows_per_band, non_empty_buckets)
    emitter.emit_phase(
        "bucketing",
        0.55,
        f"LSH: {bands} bands x {rows_per_band} rows, {non_empty_buckets} non-empty buckets",
    )

    candidate_pairs: set[tuple[str, str]] = set()
    for filenames in bucket_map.values():
        if len(filenames) < 2:
            continue
        for file_a, file_b in combinations(sorted(filenames), 2):
            candidate_pairs.add((file_a, file_b))

    pair_list = sorted(candidate_pairs)
    total_possible = len(signatures) * (len(signatures) - 1) // 2
    filtered_percent = 0.0 if total_possible == 0 else (1.0 - (len(pair_list) / total_possible)) * 100.0
    emitter.emit_phase(
        "bucketing",
        1.0,
        f"LSH complete: {len(pair_list)} candidates from {total_possible} possible ({filtered_percent:.1f}% filtered)",
    )
    return pair_list
