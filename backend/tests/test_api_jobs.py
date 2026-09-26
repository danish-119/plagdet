from __future__ import annotations

import time

import pytest

from api.jobs import jobs
from file_manager.storage import save_results


def _fake_run_pipeline(job_id, upload_dir, language, settings_payload, emitter):
    results = {
        "stats": {
            "totalElapsedTime": 0.01,
            "filesProcessed": 1,
            "language": language,
            "candidatePairs": 0,
            "highConfidenceMatches": 0,
            "averageSimilarity": 0.0,
            "speedupAchieved": 1.0,
        },
        "pairs": [],
        "files": {"sample.c": "int main(void) { return 0; }"},
        "jobId": job_id,
        "createdAt": "2026-05-11T00:00:00+00:00",
        "expiresAt": "2099-05-11T01:00:00+00:00",
    }
    save_results(job_id, results)
    emitter.emit_complete(0.01)
    return results


def test_create_job_and_cancel(app_client, monkeypatch, tmp_path):
    monkeypatch.setattr("api.jobs.run_pipeline", _fake_run_pipeline)

    response = app_client.post(
        "/api/jobs",
        data={"language": "c", "kGramSize": 5, "signatureLength": 100, "threshold": 85, "bands": 20},
        files={"files": ("sample.c", b"int main(void) { return 0; }", "text/plain")},
    )

    assert response.status_code == 202
    job_id = response.json()["jobId"]

    for _ in range(20):
        status_response = app_client.get(f"/api/jobs/{job_id}/status")
        if status_response.json()["status"] == "completed":
            break
        time.sleep(0.05)

    delete_response = app_client.delete(f"/api/jobs/{job_id}")
    assert delete_response.status_code == 200
    assert delete_response.json() == {"deleted": True}


def test_create_job_validation_errors(app_client):
    response = app_client.post(
        "/api/jobs",
        data={"language": "go", "kGramSize": 5, "signatureLength": 100, "threshold": 85, "bands": 20},
        files={"files": ("sample.c", b"int main(void) { return 0; }", "text/plain")},
    )
    assert response.status_code == 400


def test_create_job_rejects_bad_band_configuration(app_client):
    response = app_client.post(
        "/api/jobs",
        data={"language": "c", "kGramSize": 5, "signatureLength": 99, "threshold": 85, "bands": 20},
        files={"files": ("sample.c", b"int main(void) { return 0; }", "text/plain")},
    )
    assert response.status_code == 400
