import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { RISK_LEVELS } from './constants';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format elapsed time to human-readable string
 */
export function formatElapsedTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
}

/**
 * Format file size to human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + ' ' + sizes[i];
}

/**
 * Get risk level based on similarity percentage
 */
export function getRiskLevel(similarity: number): 'high' | 'medium' | 'low' {
  if (similarity >= RISK_LEVELS.high.min) return 'high';
  if (similarity >= RISK_LEVELS.medium.min) return 'medium';
  return 'low';
}

/**
 * Get risk color based on similarity percentage
 */
export function getRiskColor(similarity: number): string {
  const level = getRiskLevel(similarity);
  return RISK_LEVELS[level].color;
}

/**
 * Get risk label text
 */
export function getRiskLabel(similarity: number): string {
  const level = getRiskLevel(similarity);
  return RISK_LEVELS[level].label;
}

/**
 * Format similarity as percentage string
 */
export function formatSimilarity(similarity: number): string {
  return `${similarity.toFixed(1)}%`;
}

/**
 * Get the language label from language key
 */
export function getLanguageLabel(languageKey: string): string {
  const labels: Record<string, string> = {
    c: 'C',
    cpp: 'C++',
    python: 'Python',
  };
  return labels[languageKey] || languageKey;
}
