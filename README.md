# PlagDet

A parallel plagiarism detector for source code. Upload a batch of student submissions in C, C++ or Python and PlagDet finds the pairs that look copied, then shows exactly which lines match.

Comparing every file against every other file gets slow quickly. PlagDet avoids that by fingerprinting each file, grouping files that look alike, and only scoring those candidate pairs in detail. The heavy stages run across a pool of worker processes, and the hashing hot path is written in C.

## How it works

1. **Filter.** Only files matching the selected language are kept. Hidden and extension-less files are ignored, and `.zip` archives are unpacked.
2. **Lex.** Each file is tokenised and normalised, so renamed variables and formatting changes do not hide copying.
3. **Hash.** Token k-grams are turned into MinHash signatures using a native C kernel (with a pure Python fallback).
4. **Bucket.** Locality Sensitive Hashing groups similar signatures into candidate pairs.
5. **Score.** Candidates get an exact Jaccard similarity and the matched line ranges.

Progress streams to the browser over server-sent events. Results include a similarity chart, a ranked pairs table, a side-by-side diff with highlighted matches, and a PDF report.

There is no database. Uploaded files and results live in a temporary directory and are deleted automatically after an hour.

## Tech stack

| Part | Stack |
| --- | --- |
| Backend | Python, FastAPI, multiprocessing, ReportLab (PDF) |
| Native kernel | C (rolling hash and MinHash), loaded through `ctypes` |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Recharts |

## Project layout

```
backend/
  app/            FastAPI app and settings
  api/            Job, results, stream and export endpoints
  pipeline/       Filter, lexers, hashing, LSH, scoring, PDF report, orchestrator
  native/         C sources for the hashing kernel
  bridge/         ctypes loader with pure Python fallback
  file_manager/   Temporary storage and cleanup
  ipc/            Progress events
  tests/          Pytest suite and fixtures
frontend/
  app/            Pages: landing, upload, analysis, results, diff
  components/     UI components
  lib/, hooks/    API client, SSE parsing, shared types and hooks
```

## Getting started

### Prerequisites

- Python 3 (developed on 3.14)
- Node.js 20+
- Optional: a C compiler (`gcc`) to build the native kernel. Without it the backend uses the Python fallback.

### Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate    macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt

# optional, builds the C kernel for your platform
python compile_native.py

uvicorn app.main:app --port 8000
```

The API docs are then available at http://localhost:8000/docs.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # optional, defaults to http://localhost:8000
npm run dev
```

Open http://localhost:3000.

### Tests

```bash
cd backend
pytest
```

## API

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/jobs` | Create a job. Multipart form with `language` (`c`, `cpp`, `python`), `files`, and optional `kGramSize`, `signatureLength`, `threshold`, `bands`. |
| `GET` | `/api/jobs/{id}/status` | Current status and progress. |
| `GET` | `/api/jobs/{id}/stream` | Server-sent events for live progress. |
| `GET` | `/api/jobs/{id}/results` | Suspect pairs, file contents and run statistics. |
| `GET` | `/api/jobs/{id}/export/pdf` | Download the PDF report. |
| `DELETE` | `/api/jobs/{id}` | Cancel a job. |

## Configuration

The backend reads these from environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `TMP_DIR` | `/tmp/plagdet` | Where uploads and results are kept |
| `RESULTS_TTL_SECONDS` | `3600` | How long results are kept |
| `POOL_SIZE` | CPU count | Worker processes |
| `MAX_FILE_SIZE` | 10 MB | Per-file upload limit |
| `MAX_BATCH_SIZE` | 500 MB | Per-batch upload limit |
| `MAX_FILES` | `10000` | Files per batch |
| `CORS_ORIGINS` | `localhost:3000` | Allowed frontend origins |

The frontend reads `NEXT_PUBLIC_API_BASE_URL` (default `http://127.0.0.1:8000`).

## Tuning detection

The upload page exposes the main knobs:

- **K-gram size** – length of the token fragments that are hashed.
- **Signature length** – number of MinHash values per file.
- **Bands** – LSH bands. Must divide the signature length evenly.
- **Threshold** – minimum similarity for a pair to be reported.

More bands with fewer rows per band finds more candidates at the cost of more scoring work.

## Sample files

`student_a_submission.c` and `student_b_submission.c` in the repository root are two similar C programs you can upload to try the app.
