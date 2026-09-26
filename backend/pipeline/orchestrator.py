"""Main pipeline orchestrator.

Coordinates filter, lexing, hashing, bucketing, and scoring phases as described in the SRS.
"""

from __future__ import annotations

import os
import multiprocessing as mp
import threading
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from app.config import settings
from file_manager.cleanup import delete_job_directory
from file_manager.storage import save_results
from ipc.progress import ProgressEmitter
from pipeline.hashing.minhash import parallel_hash
from pipeline.language_filter import filter_by_extension
from pipeline.lexer.pool import parallel_lex
from pipeline.lsh.bucketer import lsh_bucket
from pipeline.scoring.scorer import parallel_scoring


PHASE_TIMEOUTS = {
    "lexing": 300,
    "hashing": 300,
    "bucketing": 120,
    "analyzing": 600,
}

SMALL_BATCH_FALLBACK_LIMIT = 25


class PipelineCancelled(RuntimeError):
    """Raised when a job cancellation flag is observed."""


def _cancelled(emitter: ProgressEmitter) -> bool:
    return bool(getattr(emitter, "cancel_event", None) and emitter.cancel_event.is_set())


def _pair_files(pair: dict[str, Any]) -> set[str]:
    return {str(pair.get("fileA", "")), str(pair.get("fileB", ""))}


def run_pipeline(
    job_id: str,
    upload_dir: Path,
    language: str,
    settings_dict: dict[str, Any],
    emitter: ProgressEmitter,
) -> dict[str, Any]:
    """Run the full plagiarism detection pipeline and return AnalysisResults-shaped data."""

    started_at = time.perf_counter()
    created_at = datetime.now(timezone.utc)
    expiration = created_at + timedelta(seconds=int(settings.RESULTS_TTL_SECONDS))
    pool = None
    manager = None
    pool_terminated = False
    total_possible_pairs = 0
    pool_size = int(settings_dict.get("pool_size", settings.POOL_SIZE))

    try:
        emitter.emit_phase("queued", 0.0, f"Job received. Initializing worker pool with {pool_size} workers...")
        ctx = mp.get_context("spawn")
        manager = mp.Manager()
        shared_file_data = manager.dict()
        pool = ctx.Pool(processes=pool_size)

        all_files = sorted(path for path in upload_dir.rglob("*") if path.is_file())
        filtered_files, _ignored = filter_by_extension(all_files, language)
        if _cancelled(emitter):
            raise PipelineCancelled()

        phase_started_at = time.perf_counter()
        tokenized_files = parallel_lex(filtered_files, language, pool, emitter, phase_started_at, PHASE_TIMEOUTS["lexing"])
        if _cancelled(emitter):
            raise PipelineCancelled()

        kgram_size = int(settings_dict.get("kGramSize", settings.DEFAULT_KGRAM_SIZE))
        signature_length = int(settings_dict.get("signatureLength", settings.DEFAULT_SIGNATURE_LENGTH))
        threshold = float(settings_dict.get("threshold", settings.DEFAULT_THRESHOLD))
        bands = int(settings_dict.get("bands", settings.DEFAULT_BANDS))

        shared_file_data.clear()
        shared_file_data.update(
            {
                str(item["filename"]): {
                    "tokens": list(item["tokens"]),
                    "comparison_tokens": list(item.get("comparison_tokens", item["tokens"])),
                    "line_map": list(item.get("line_map", [])),
                }
                for item in tokenized_files
            }
        )

        phase_started_at = time.perf_counter()
        signatures = parallel_hash(tokenized_files, kgram_size, signature_length, pool, emitter, phase_started_at, PHASE_TIMEOUTS["hashing"])
        if _cancelled(emitter):
            raise PipelineCancelled()

        phase_started_at = time.perf_counter()
        candidate_pairs = lsh_bucket(signatures, bands, threshold, emitter, phase_started_at, PHASE_TIMEOUTS["bucketing"])
        if _cancelled(emitter):
            raise PipelineCancelled()

        if not candidate_pairs and len(filtered_files) <= SMALL_BATCH_FALLBACK_LIMIT:
            emitter.emit_phase(
                "bucketing",
                0.99,
                f"LSH returned no candidates for a small batch; falling back to exact comparison across {len(filtered_files)} files...",
            )
            candidate_pairs = [
                (str(left["filename"]), str(right["filename"]))
                for left_index, left in enumerate(tokenized_files)
                for right in tokenized_files[left_index + 1 :]
            ]

        phase_started_at = time.perf_counter()
        pairs = parallel_scoring(candidate_pairs, shared_file_data, threshold, pool, emitter, phase_started_at, PHASE_TIMEOUTS["analyzing"])
        if _cancelled(emitter):
            raise PipelineCancelled()

        total_pairs_found = len(pairs)
        displayed_pairs = pairs[:200]
        displayed_files = sorted({filename for pair in displayed_pairs for filename in _pair_files(pair) if filename})

        total_possible_pairs = len(filtered_files) * (len(filtered_files) - 1) // 2
        pair_reduction_ratio = (total_possible_pairs / max(1, len(candidate_pairs))) if total_possible_pairs else 0.0

        files_content = {
            os.path.basename(str(path)): path.read_text(encoding="utf-8", errors="ignore")
            for path in filtered_files
            if os.path.basename(str(path)) in displayed_files
        }
        high_matches = sum(1 for pair in pairs if float(pair["similarity"]) >= 85.0)
        medium_matches = sum(1 for pair in pairs if 60.0 <= float(pair["similarity"]) < 85.0)
        low_matches = sum(1 for pair in pairs if float(pair["similarity"]) < 60.0)
        average_similarity = round(sum(float(pair["similarity"]) for pair in pairs) / len(pairs), 1) if pairs else 0.0
        elapsed_seconds = round(time.perf_counter() - started_at, 3)
        speedup = round(pair_reduction_ratio * max(1, pool_size), 2) if total_possible_pairs else 0.0

        top_offender = None
        top_offender_match_count = 0
        if pairs:
            offender_counts: dict[str, int] = {}
            for pair in pairs:
                for filename in _pair_files(pair):
                    if filename:
                        offender_counts[filename] = offender_counts.get(filename, 0) + 1
            if offender_counts:
                top_offender, top_offender_match_count = max(offender_counts.items(), key=lambda item: (item[1], item[0]))

        results = {
            "stats": {
                "totalElapsedTime": elapsed_seconds,
                "filesProcessed": len(filtered_files),
                "language": language,
                "candidatePairs": len(candidate_pairs),
                "highConfidenceMatches": high_matches,
                "averageSimilarity": average_similarity,
                "speedupAchieved": speedup,
                "displayedPairs": len(displayed_pairs),
                "totalPairsFound": total_pairs_found,
                "summary": {
                    "totalFiles": len(filtered_files),
                    "totalPairsAboveThreshold": total_pairs_found,
                    "highRiskCount": high_matches,
                    "mediumRiskCount": medium_matches,
                    "lowRiskCount": low_matches,
                    "averageSimilarity": average_similarity,
                    "topOffender": top_offender,
                    "topOffenderMatchCount": top_offender_match_count,
                },
            },
            "pairs": displayed_pairs,
            "files": files_content,
            "jobId": job_id,
            "createdAt": created_at.isoformat(),
            "expiresAt": expiration.isoformat(),
        }
        save_results(job_id, results)
        emitter.emit_phase("completed", 1.0, f"Analysis complete! Elapsed: {elapsed_seconds:.1f}s")
        emitter.emit_complete(results["stats"]["totalElapsedTime"])
        return results
    except TimeoutError as exc:
        if pool is not None:
            pool.terminate()
            pool_terminated = True
        delete_job_directory(job_id)
        emitter.emit_error(str(exc))
        raise
    except PipelineCancelled:
        if pool is not None:
            pool.terminate()
            pool_terminated = True
        delete_job_directory(job_id)
        emitter.emit_error("Job cancelled")
        raise
    except Exception as exc:
        if pool is not None:
            pool.terminate()
            pool_terminated = True
        emitter.emit_error(str(exc))
        raise
    finally:
        if manager is not None:
            manager.shutdown()
        if pool is not None:
            if not pool_terminated:
                pool.close()
            pool.join()
