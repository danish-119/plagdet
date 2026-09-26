from __future__ import annotations

from api.jobs import jobs
from file_manager.storage import save_results


def test_results_endpoint_returns_completed_results(app_client, tmp_path):
    job_id = "results-job"
    results = {
        "stats": {
            "totalElapsedTime": 1.23,
            "filesProcessed": 1,
            "language": "c",
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
    jobs.pop(job_id, None)

    response = app_client.get(f"/api/jobs/{job_id}/results")
    assert response.status_code == 200
    assert response.json()["jobId"] == job_id


def test_results_endpoint_returns_processing_status(app_client):
    job_id = "processing-job"
    jobs[job_id] = {
        "status": "processing",
        "progress": 0.5,
        "phase": "hashing",
        "message": "working",
        "queue": None,
    }

    response = app_client.get(f"/api/jobs/{job_id}/results")
    assert response.status_code == 202
    assert response.json()["status"] == "processing"

    jobs.pop(job_id, None)


def test_results_endpoint_reports_expiry(app_client, tmp_path):
    job_id = "expired-job"
    results = {
        "stats": {
            "totalElapsedTime": 1.23,
            "filesProcessed": 1,
            "language": "c",
            "candidatePairs": 0,
            "highConfidenceMatches": 0,
            "averageSimilarity": 0.0,
            "speedupAchieved": 1.0,
        },
        "pairs": [],
        "files": {"sample.c": "int main(void) { return 0; }"},
        "jobId": job_id,
        "createdAt": "2026-05-11T00:00:00+00:00",
        "expiresAt": "2000-01-01T00:00:00+00:00",
    }
    save_results(job_id, results)

    response = app_client.get(f"/api/jobs/{job_id}/results")
    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "RESULTS_EXPIRED"
