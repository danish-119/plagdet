from __future__ import annotations

from pipeline.hashing.minhash import compute_minhash


def test_compute_minhash_signature_length_and_determinism():
    shingles = {1, 2, 3, 9999}

    signature_a = compute_minhash(shingles, signature_length=8, seed=42)
    signature_b = compute_minhash(shingles, signature_length=8, seed=42)

    assert len(signature_a) == 8
    assert signature_a == signature_b


def test_compute_minhash_handles_empty_sets():
    assert compute_minhash(set(), signature_length=4, seed=42) == [0, 0, 0, 0]
