from __future__ import annotations

from pipeline.report.pdf_generator import generate_pdf_report


def test_generate_pdf_report_contains_title_and_footer():
    results = {
        "stats": {
            "totalElapsedTime": 1.23,
            "filesProcessed": 2,
            "language": "c",
            "candidatePairs": 1,
            "highConfidenceMatches": 1,
            "averageSimilarity": 100.0,
            "speedupAchieved": 1.0,
            "totalPairsFound": 1,
            "displayedPairs": 1,
            "summary": {
                "totalFiles": 2,
                "totalPairsAboveThreshold": 1,
                "highRiskCount": 1,
                "mediumRiskCount": 0,
                "lowRiskCount": 0,
                "averageSimilarity": 100.0,
                "topOffender": "a.c",
                "topOffenderMatchCount": 1,
            },
        },
        "pairs": [
            {
                "fileA": "a.c",
                "fileB": "b.c",
                "similarity": 100.0,
                "riskLevel": "high",
                "matchedRanges": {"fileA": [], "fileB": []},
            }
        ],
        "files": {"a.c": "int main(void) { return 0; }", "b.c": "int main(void) { return 0; }"},
        "jobId": "job-1",
        "createdAt": "2026-05-11T00:00:00+00:00",
        "expiresAt": "2026-05-11T01:00:00+00:00",
    }

    pdf_bytes = generate_pdf_report(results, settings={"threshold": 85, "kGramSize": 5, "signatureLength": 100, "bands": 20})

    assert pdf_bytes.startswith(b"%PDF")
    assert b"Plagiarism Detection Report" in pdf_bytes
    assert b"Teacher Summary" in pdf_bytes
    assert b"Student Copy Impact" in pdf_bytes
    assert b"Top involved submission" in pdf_bytes
    assert b"Immediate review" in pdf_bytes
    assert b"Group 14, CSC344" in pdf_bytes


def test_generate_pdf_report_caps_visible_pairs_for_teacher_readability():
    pairs = []
    for index in range(30):
        pairs.append(
            {
                "fileA": f"student_{index:02d}_a.c",
                "fileB": f"student_{index:02d}_b.c",
                "similarity": 90.0 - index * 0.1,
                "riskLevel": "high",
                "matchedRanges": {"fileA": [], "fileB": []},
            }
        )

    results = {
        "stats": {
            "totalElapsedTime": 12.34,
            "filesProcessed": 30,
            "language": "c",
            "candidatePairs": 30,
            "highConfidenceMatches": 30,
            "averageSimilarity": 88.5,
            "speedupAchieved": 12.0,
            "totalPairsFound": 30,
            "displayedPairs": 25,
            "summary": {
                "totalFiles": 30,
                "totalPairsAboveThreshold": 30,
                "highRiskCount": 30,
                "mediumRiskCount": 0,
                "lowRiskCount": 0,
                "averageSimilarity": 88.5,
                "topOffender": "student_00_a.c",
                "topOffenderMatchCount": 3,
            },
        },
        "pairs": pairs,
        "files": {f"student_{index:02d}_a.c": "int main(void) { return 0; }" for index in range(30)},
        "jobId": "job-2",
        "createdAt": "2026-05-11T00:00:00+00:00",
        "expiresAt": "2026-05-11T01:00:00+00:00",
    }

    pdf_bytes = generate_pdf_report(results, settings={"threshold": 85, "kGramSize": 5, "signatureLength": 100, "bands": 20})

    assert b"Only the top 25 pairs are shown here to keep the report teacher-ready" in pdf_bytes
