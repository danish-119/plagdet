import { CreateJobResponse, AnalysisResults, ApiError } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';

/**
 * Custom error class for API errors
 */
export class APIErrorResponse extends Error implements ApiError {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = 'APIErrorResponse';
  }
}

/**
 * Generic fetch wrapper with error handling
 */
async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorMessage = `API Error: ${response.status}`;
      let errorCode: string | undefined;

      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
        errorCode = errorData.code;
      } catch {
        errorMessage = response.statusText || errorMessage;
      }

      throw new APIErrorResponse(response.status, errorMessage, errorCode);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof APIErrorResponse) {
      throw error;
    }
    throw new APIErrorResponse(
      0,
      error instanceof Error ? error.message : 'Unknown error occurred'
    );
  }
}

/**
 * Create a new analysis job
 * POST /api/jobs
 */
export async function createJob(formData: FormData): Promise<CreateJobResponse> {
  const response = await fetch(`${API_BASE_URL}/api/jobs`, {
    method: 'POST',
    body: formData,
    // Don't set Content-Type header, let fetch handle it for multipart/form-data
  });

  if (!response.ok) {
    let errorMessage = `API Error: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new APIErrorResponse(response.status, errorMessage);
  }

  return await response.json();
}

/**
 * Get SSE stream for real-time progress
 * GET /api/jobs/{id}/stream
 */
export function getSSEStream(jobId: string): EventSource {
  const url = `${API_BASE_URL}/api/jobs/${jobId}/stream`;
  return new EventSource(url);
}

/**
 * Poll for job status (fallback when SSE is unavailable)
 * GET /api/jobs/{id}/status
 */
export async function getJobStatus(jobId: string) {
  return fetchAPI(`/api/jobs/${jobId}/status`);
}

/**
 * Get analysis results
 * GET /api/jobs/{id}/results
 * Returns 404 if results have expired
 */
export async function getJobResults(jobId: string): Promise<AnalysisResults> {
  try {
    return await fetchAPI(`/api/jobs/${jobId}/results`);
  } catch (error) {
    if (error instanceof APIErrorResponse && error.status === 404) {
      throw new APIErrorResponse(
        404,
        'Results have expired. Please run a new analysis.',
        'RESULTS_EXPIRED'
      );
    }
    throw error;
  }
}

/**
 * Delete/cancel a job
 * DELETE /api/jobs/{id}
 */
export async function deleteJob(jobId: string): Promise<{ deleted: boolean }> {
  return fetchAPI(`/api/jobs/${jobId}`, {
    method: 'DELETE',
  });
}

/**
 * Get the PDF download URL
 * Constructs the URL for the browser's native download mechanism
 */
export function getPdfDownloadUrl(jobId: string, language: string): string {
  const date = new Date().toISOString().split('T')[0];
  const filename = `plagiarism_report_${language}_${date}.pdf`;
  return `${API_BASE_URL}/api/jobs/${jobId}/export/pdf?filename=${encodeURIComponent(filename)}`;
}
