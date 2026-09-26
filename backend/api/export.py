"""PDF export endpoint."""

from __future__ import annotations

import io
from datetime import date

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from api.jobs import get_job, get_job_status
from file_manager.storage import load_results
from pipeline.report.pdf_generator import generate_pdf_report


router = APIRouter()


@router.get("/api/jobs/{job_id}/export/pdf")
async def export_pdf(job_id: str) -> StreamingResponse:
    """Generate and stream the PDF report for a completed job."""

    state = get_job(job_id)
    if state is not None and state.get("status") in {"queued", "processing"}:
        status_payload = get_job_status(job_id)
        raise HTTPException(status_code=202, detail=status_payload)

    results = load_results(job_id)
    pdf_bytes = generate_pdf_report(results, settings=state.get("settings") if state else None)
    language = str(results.get("stats", {}).get("language", "unknown"))
    filename = f"plagiarism_report_{language}_{date.today().isoformat()}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
