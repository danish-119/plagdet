from __future__ import annotations

from ipc.progress import ProgressEmitter
from pipeline.lsh.bucketer import lsh_bucket


def test_lsh_bucketer_generates_candidate_pairs(mock_emitter):
    signatures = [
        {"filename": "a.c", "signature": [1, 2, 3, 4, 5, 6, 7, 8]},
        {"filename": "b.c", "signature": [1, 2, 3, 4, 5, 6, 7, 8]},
        {"filename": "c.c", "signature": [8, 7, 6, 5, 4, 3, 2, 1]},
    ]

    pairs = lsh_bucket(signatures, bands=4, threshold=85.0, emitter=mock_emitter)

    assert ("a.c", "b.c") in pairs
    assert len(pairs) == len(set(pairs))
