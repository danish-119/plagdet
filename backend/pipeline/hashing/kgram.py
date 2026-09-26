"""K-gram generation and shingle hashing.

REQ-FUNC-20, REQ-FUNC-21: create overlapping token shingles and hash them to 32-bit integers.
"""

from __future__ import annotations

import zlib

from bridge import ckernel as bridge


def generate_kggrams(tokens: list[str], k: int = 5) -> set[int]:
    """Create overlapping k-grams from the token list and hash them to 32-bit ints."""

    if not tokens:
        return set()

    min_tokens = max(2 * k, 10)
    if len(tokens) < min_tokens:
        content_hash = zlib.crc32(" ".join(tokens).encode("utf-8", errors="ignore")) & 0xFFFFFFFF
        return {content_hash}

    shingles: set[int] = set()
    window_count = max(1, len(tokens) - k + 1)
    for start_index in range(window_count):
        gram_tokens = tokens[start_index : start_index + k]
        gram_text = " ".join(gram_tokens)
        shingles.add(bridge.rolling_hash(gram_text, seed=0) & 0xFFFFFFFF)
    return shingles
