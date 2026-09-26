from __future__ import annotations

from pipeline.hashing.kgram import generate_kggrams


def test_generate_kggrams_creates_overlapping_hashes():
    shingles = generate_kggrams(["a", "b", "c", "d", "e", "f"], k=5)

    assert len(shingles) == 1
    assert all(isinstance(item, int) for item in shingles)
    assert all(0 <= item <= 0xFFFFFFFF for item in shingles)


def test_generate_kggrams_is_deterministic():
    tokens = ["x", "y", "z", "x", "y"]
    assert generate_kggrams(tokens, k=3) == generate_kggrams(tokens, k=3)
