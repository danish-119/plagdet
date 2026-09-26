from __future__ import annotations

from multiprocessing.pool import Pool

from pipeline.scoring.scorer import compute_exact_jaccard, parallel_scoring


class DummyPool:
    def imap_unordered(self, func, tasks):
        for task in tasks:
            yield func(task)

    def close(self):
        return None

    def join(self):
        return None


def test_exact_jaccard_returns_expected_value():
    assert compute_exact_jaccard(["a", "b", "c"], ["b", "c", "d"]) == 0.5


def test_parallel_scoring_filters_and_classifies(mock_emitter):
    pairs = [("a.c", "b.c"), ("a.c", "c.c")]
    file_tokens = {
        "a.c": ["int", "main", "(", ")", "return", "0"],
        "b.c": ["int", "main", "(", ")", "return", "0"],
        "c.c": ["void", "f", "(", ")", "return", "1"],
    }

    results = parallel_scoring(pairs, file_tokens, threshold=50.0, pool=DummyPool(), emitter=mock_emitter)

    assert results[0]["riskLevel"] == "high"
    assert results[0]["similarity"] == 100.0
    assert all(pair["similarity"] >= 50.0 for pair in results)


def test_parallel_scoring_handles_empty_candidate_list(mock_emitter):
    results = parallel_scoring([], {}, threshold=50.0, pool=DummyPool(), emitter=mock_emitter)

    assert results == []
