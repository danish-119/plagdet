export const LANGUAGE_CONFIG = {
  c: { label: 'C', extension: '.c' },
  cpp: { label: 'C++', extension: '.cpp' },
  python: { label: 'Python', extension: '.py' },
} as const;

export const DEFAULT_ADVANCED_SETTINGS = {
  kGramSize: 5,
  signatureLength: 100,
  threshold: 70,
  bands: 20,
} as const;

export const ADVANCED_SETTINGS_RANGES = {
  kGramSize: { min: 3, max: 10 },
  signatureLength: { min: 50, max: 200 },
  threshold: { min: 60, max: 99 },
  bands: { min: 1, max: 100 },
} as const;

export const FILE_UPLOAD_LIMITS = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxBatchSize: 500 * 1024 * 1024, // 500MB
} as const;

export const RESULTS_TTL_MINUTES = 60;

export const PIPELINE_STAGES = [
  { id: 'queued', label: 'Queued', icon: 'clock' },
  { id: 'lexing', label: 'Lexing', icon: 'code' },
  { id: 'hashing', label: 'Hashing', icon: 'hash' },
  { id: 'bucketing', label: 'Bucketing', icon: 'bucket' },
  { id: 'analyzing', label: 'Analyzing', icon: 'search' },
  { id: 'completed', label: 'Completed', icon: 'check-circle' },
] as const;

// Risk level thresholds
export const RISK_LEVELS = {
  high: { min: 85, max: 100, color: 'var(--color-danger)', label: 'High' },
  medium: { min: 60, max: 84, color: 'var(--color-warning)', label: 'Medium' },
  low: { min: 0, max: 59, color: 'var(--color-success)', label: 'Low' },
} as const;

// Similarity distribution buckets for chart
export const SIMILARITY_BUCKETS = [
  { range: '0-10%', min: 0, max: 10 },
  { range: '10-20%', min: 10, max: 20 },
  { range: '20-30%', min: 20, max: 30 },
  { range: '30-40%', min: 30, max: 40 },
  { range: '40-50%', min: 40, max: 50 },
  { range: '50-60%', min: 50, max: 60 },
  { range: '60-70%', min: 60, max: 70 },
  { range: '70-80%', min: 70, max: 80 },
  { range: '80-90%', min: 80, max: 90 },
  { range: '90-100%', min: 90, max: 100 },
] as const;
