"""Exact similarity scoring for candidate pairs.

REQ-FUNC-25, REQ-FUNC-26, REQ-FUNC-27: compute exact Jaccard similarity for candidate pairs only.
"""

from __future__ import annotations

from collections.abc import Sequence
from difflib import SequenceMatcher
import time
from multiprocessing.pool import Pool
from pathlib import Path

from ipc.progress import ProgressEmitter


def compute_exact_jaccard(file_a_content: list[str], file_b_content: list[str]) -> float:
    """Compute exact Jaccard similarity over token sets."""

    set_a = set(file_a_content)
    set_b = set(file_b_content)
    union = set_a | set_b
    if not union:
        return 0.0
    return len(set_a & set_b) / len(union)


def _risk_level(similarity_percent: float) -> str:
    if similarity_percent >= 85.0:
        return "high"
    if similarity_percent >= 60.0:
        return "medium"
    return "low"


def _collapse_line_numbers(line_numbers: Sequence[int], confidence: str) -> list[dict[str, object]]:
    if not line_numbers:
        return []

    sorted_lines = sorted(set(int(line) for line in line_numbers if int(line) > 0))
    if not sorted_lines:
        return []

    ranges: list[dict[str, object]] = []
    start_line = sorted_lines[0]
    previous_line = sorted_lines[0]

    for line in sorted_lines[1:]:
        if line == previous_line + 1:
            previous_line = line
            continue
        ranges.append({"startLine": start_line, "endLine": previous_line, "confidence": confidence})
        start_line = previous_line = line

    ranges.append({"startLine": start_line, "endLine": previous_line, "confidence": confidence})
    return ranges


def _matched_ranges(
    tokens_a: Sequence[str],
    line_map_a: Sequence[int],
    tokens_b: Sequence[str],
    line_map_b: Sequence[int],
    similarity_percent: float,
) -> dict[str, list[dict[str, object]]]:
    matcher = SequenceMatcher(a=tokens_a, b=tokens_b, autojunk=False)
    ranges_a: list[dict[str, object]] = []
    ranges_b: list[dict[str, object]] = []

    for block in matcher.get_matching_blocks():
        if block.size <= 0:
            continue

        matched_lines_a = line_map_a[block.a : block.a + block.size]
        matched_lines_b = line_map_b[block.b : block.b + block.size]
        ranges_a.extend(_collapse_line_numbers(matched_lines_a, "high" if similarity_percent >= 85.0 else "partial"))
        ranges_b.extend(_collapse_line_numbers(matched_lines_b, "high" if similarity_percent >= 85.0 else "partial"))
        if len(ranges_a) >= 5 and len(ranges_b) >= 5:
            break

    if not ranges_a:
        ranges_a.append({"startLine": 1, "endLine": max(1, len(line_map_a)), "confidence": "partial"})
    if not ranges_b:
        ranges_b.append({"startLine": 1, "endLine": max(1, len(line_map_b)), "confidence": "partial"})

    return {"fileA": ranges_a[:5], "fileB": ranges_b[:5]}


def _score_worker(task: tuple[str, str, dict[str, dict[str, list[str] | list[int]]], float]) -> dict[str, object] | None:
    file_a, file_b, file_tokens, threshold = task
    payload_a = file_tokens[file_a]
    payload_b = file_tokens[file_b]
    if isinstance(payload_a, dict):
        tokens_a = list(payload_a.get("tokens", []))
        comparison_tokens_a = list(payload_a.get("comparison_tokens", tokens_a))
        line_map_a = list(payload_a.get("line_map", []))
    else:
        tokens_a = list(payload_a)
        comparison_tokens_a = list(tokens_a)
        line_map_a = [1] * len(tokens_a)
    if isinstance(payload_b, dict):
        tokens_b = list(payload_b.get("tokens", []))
        comparison_tokens_b = list(payload_b.get("comparison_tokens", tokens_b))
        line_map_b = list(payload_b.get("line_map", []))
    else:
        tokens_b = list(payload_b)
        comparison_tokens_b = list(tokens_b)
        line_map_b = [1] * len(tokens_b)
    raw_similarity = compute_exact_jaccard(tokens_a, tokens_b)
    comparison_similarity = compute_exact_jaccard(comparison_tokens_a, comparison_tokens_b)
    similarity_percent = round((0.05 * raw_similarity + 0.95 * comparison_similarity) * 100.0, 1)
    if similarity_percent < threshold:
        return None

    return {
        "fileA": Path(file_a).name,
        "fileB": Path(file_b).name,
        "similarity": similarity_percent,
        "riskLevel": _risk_level(similarity_percent),
        "matchedRanges": _matched_ranges(tokens_a, line_map_a, tokens_b, line_map_b, similarity_percent),
    }


def parallel_scoring(
    candidate_pairs: list[tuple[str, str]],
    file_tokens: dict[str, dict[str, list[str] | list[int]]],
    threshold: float,
    pool: Pool,
    emitter: ProgressEmitter,
    phase_started_at: float | None = None,
    timeout_seconds: float | None = None,
) -> list[dict[str, object]]:
    """Score candidate pairs in parallel and return suspect pairs sorted by similarity."""

    if not candidate_pairs:
        emitter.emit_phase("analyzing", 0.99, "Similarity scoring complete: 0 pairs above threshold")
        return []

    total = len(candidate_pairs)
    results: list[dict[str, object]] = []
    tasks = [(file_a, file_b, file_tokens, threshold) for file_a, file_b in candidate_pairs]
    chunksize = max(1, total // (max(1, int(getattr(pool, "_processes", 1) or 1)) * 4))
    last_pct = -1

    emitter.emit_phase(
        "analyzing",
        0.70,
        f"Computing exact similarity for {total} candidate pairs using {max(1, int(getattr(pool, '_processes', 1) or 1))} workers...",
    )

    try:
        iterator = pool.imap_unordered(_score_worker, tasks, chunksize=chunksize)
    except TypeError:
        iterator = pool.imap_unordered(_score_worker, tasks)

    for index, result in enumerate(iterator, start=1):
        if phase_started_at is not None and timeout_seconds is not None and (time.perf_counter() - phase_started_at) > timeout_seconds:
            raise TimeoutError("Phase analyzing exceeded timeout")
        percentage = min(90, (index * 100) // total)
        percentage = (percentage // 10) * 10
        if percentage > last_pct:
            emitter.emit_phase("analyzing", 0.70 + (index / total) * 0.29, f"Computing exact similarity... ({percentage}%)")
            last_pct = percentage
        if result is not None:
            results.append(result)

    emitter.emit_phase("analyzing", 0.99, f"Similarity scoring complete: {len(results)} pairs above threshold")
    return sorted(results, key=lambda item: float(item["similarity"]), reverse=True)
