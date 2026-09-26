from __future__ import annotations

import queue
from pathlib import Path

from ipc.progress import ProgressEmitter
from pipeline.orchestrator import run_pipeline


class DummyPool:
    def imap_unordered(self, func, tasks):
        for task in tasks:
            yield func(task)

    def close(self):
        return None

    def join(self):
        return None


def test_full_pipeline_detects_plagiarized_variants(tmp_path, monkeypatch):
    source_dir = tmp_path / "uploads"
    source_dir.mkdir()
    (source_dir / "file1.c").write_text(
        """
        int sum(int first, int second) {
            return first + second;
        }
        """,
        encoding="utf-8",
    )
    (source_dir / "file1_copy.c").write_text(
        """
        int add(int left, int right) {
            return left + right;
        }
        """,
        encoding="utf-8",
    )
    (source_dir / "file2.c").write_text(
        """
        int product(int first, int second) {
            return first * second;
        }
        """,
        encoding="utf-8",
    )

    class DummyContext:
        def Pool(self, processes):
            return DummyPool()

    monkeypatch.setattr("pipeline.orchestrator.mp.get_context", lambda method: DummyContext())
    emitter = ProgressEmitter("integration-job", queue=__import__("queue").Queue())

    results = run_pipeline(
        "integration-job",
        source_dir,
        "c",
        {"pool_size": 1, "kGramSize": 3, "signatureLength": 12, "threshold": 70, "bands": 3},
        emitter,
    )

    assert results["stats"]["filesProcessed"] == 3
    assert results["stats"]["candidatePairs"] >= 1
    assert any(pair["similarity"] >= 95.0 for pair in results["pairs"])
    assert results["files"]["file1.c"].strip().startswith("int sum")


def test_direct_student_submissions_are_detected_without_ui(tmp_path, monkeypatch):
    source_dir = tmp_path / "uploads"
    source_dir.mkdir()

    student_a = Path(r"D:\Code\Web Projects\Parallel Palagiarism Detector For Source Code\student_a_submission.c")
    student_b = Path(r"D:\Code\Web Projects\Parallel Palagiarism Detector For Source Code\student_b_submission.c")
    (source_dir / student_a.name).write_text(student_a.read_text(encoding="utf-8"), encoding="utf-8")
    (source_dir / student_b.name).write_text(student_b.read_text(encoding="utf-8"), encoding="utf-8")

    class DummyContext:
        def Pool(self, processes):
            return DummyPool()

    monkeypatch.setattr("pipeline.orchestrator.mp.get_context", lambda method: DummyContext())
    emitter = ProgressEmitter("direct-student-job", queue=__import__("queue").Queue())

    results = run_pipeline(
        "direct-student-job",
        source_dir,
        "c",
        {"pool_size": 1, "kGramSize": 3, "signatureLength": 12, "threshold": 70, "bands": 3},
        emitter,
    )

    assert results["stats"]["candidatePairs"] == 1
    assert results["stats"]["totalPairsFound"] == 1
    assert len(results["pairs"]) == 1
    assert results["pairs"][0]["similarity"] >= 70.0
    assert {results["pairs"][0]["fileA"], results["pairs"][0]["fileB"]} == {student_a.name, student_b.name}


def test_pipeline_completes_with_zero_candidates_and_clean_filenames(tmp_path, monkeypatch):
    source_dir = tmp_path / "uploads"
    source_dir.mkdir()
    sample_file = source_dir / "sample.c"
    sample_file.write_text("int main(void) { return 0; }", encoding="utf-8")

    class DummyContext:
        def Pool(self, processes):
            return DummyPool()

    class DummyManager:
        def dict(self):
            return {}

        def shutdown(self):
            return None

    monkeypatch.setattr("pipeline.orchestrator.mp.get_context", lambda method: DummyContext())
    monkeypatch.setattr("pipeline.orchestrator.mp.Manager", lambda: DummyManager())
    monkeypatch.setattr("pipeline.orchestrator.filter_by_extension", lambda files, language: (list(files), []))
    monkeypatch.setattr(
        "pipeline.orchestrator.parallel_lex",
        lambda files, language, pool, emitter, *args: [
            {"filename": str(sample_file), "tokens": ["int", "main", "return"], "line_map": [1, 1, 1]}
        ],
    )
    monkeypatch.setattr(
        "pipeline.orchestrator.parallel_hash",
        lambda tokenized_files, k, signature_length, pool, emitter, *args: [
            {"filename": tokenized_files[0]["filename"], "signature": [1, 2, 3, 4]}
        ],
    )
    monkeypatch.setattr("pipeline.orchestrator.lsh_bucket", lambda signatures, bands, threshold, emitter, *args: [])
    monkeypatch.setattr(
        "pipeline.orchestrator.parallel_scoring",
        lambda candidate_pairs, file_tokens, threshold, pool, emitter, *args: [],
    )

    emitter = ProgressEmitter("zero-candidate-job", queue.Queue())
    results = run_pipeline(
        "zero-candidate-job",
        source_dir,
        "c",
        {"pool_size": 1, "kGramSize": 5, "signatureLength": 100, "threshold": 85, "bands": 20},
        emitter,
    )

    events = []
    while not emitter.queue.empty():
        events.append(emitter.queue.get_nowait())

    assert results["stats"]["candidatePairs"] == 0
    assert results["stats"]["displayedPairs"] == 0
    assert results["stats"]["summary"]["totalPairsAboveThreshold"] == 0
    assert results["stats"]["averageSimilarity"] == 0.0
    assert results["files"] == {}
    assert any(event.get("type") == "complete" for event in events)
