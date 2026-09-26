// Job and Analysis Types
export interface JobStatus {
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  phase: 'queued' | 'lexing' | 'hashing' | 'bucketing' | 'analyzing' | 'completed';
  message: string;
  jobId?: string;
  elapsedSeconds?: number;
}

export interface SuspectPair {
  fileA: string;
  fileB: string;
  similarity: number; // 0-100
  riskLevel: 'high' | 'medium' | 'low';
  matchedRanges?: {
    fileA: MatchedRange[];
    fileB: MatchedRange[];
  };
}

export interface MatchedRange {
  startLine: number;
  endLine: number;
  confidence: 'high' | 'partial';
}

export interface AnalysisResults {
  stats: {
    totalElapsedTime: number;
    filesProcessed: number;
    language: string;
    candidatePairs: number;
    highConfidenceMatches: number;
    averageSimilarity: number;
    speedupAchieved: number;
    displayedPairs?: number;
    totalPairsFound?: number;
  };
  pairs: SuspectPair[];
  files: Record<string, string>; // filename -> content
  jobId: string;
  createdAt: string;
  expiresAt: string;
}

export interface AdvancedSettings {
  kGramSize: number;
  signatureLength: number;
  threshold: number;
  bands: number;
}

export interface SSEPhaseEvent {
  type: 'phase';
  phase: 'lexing' | 'hashing' | 'bucketing' | 'analyzing';
  progress: number; // 0-1
  message: string;
}

export interface SSECompleteEvent {
  type: 'complete';
  phase: 'completed';
  progress: number; // 1.0
  jobId: string;
  elapsedSeconds: number;
}

export type SSEEvent = SSEPhaseEvent | SSECompleteEvent;

// API Response types
export interface CreateJobResponse {
  jobId: string;
}

export interface ApiError {
  status: number;
  message: string;
  code?: string;
}
