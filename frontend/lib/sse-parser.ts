import { SSEEvent, SSEPhaseEvent, SSECompleteEvent } from './types';

export interface ParsedSSEMessage {
  event: string;
  data: unknown;
}

/**
 * Parse SSE format from the backend
 * Expected format:
 * event: phase
 * data: {"phase": "lexing", "progress": 0.19, "message": "..."}
 * 
 * OR
 * 
 * event: complete
 * data: {"phase": "completed", "progress": 1.0, "jobId": "abc123", "elapsedSeconds": 11.4}
 */
export function parseSSEMessage(message: string): ParsedSSEMessage | null {
  const lines = message.trim().split('\n');
  const result: ParsedSSEMessage = { event: '', data: null };

  for (const line of lines) {
    if (line.startsWith('event: ')) {
      result.event = line.slice('event: '.length).trim();
    } else if (line.startsWith('data: ')) {
      const dataStr = line.slice('data: '.length).trim();
      try {
        result.data = JSON.parse(dataStr);
      } catch (error) {
        console.error('[v0] Failed to parse SSE data:', dataStr, error);
        return null;
      }
    }
  }

  return result.event && result.data ? result : null;
}

/**
 * Type guard to check if parsed message is a phase event
 */
export function isPhaseEvent(event: SSEEvent): event is SSEPhaseEvent {
  return 'message' in event && event.phase !== 'completed';
}

/**
 * Type guard to check if parsed message is a complete event
 */
export function isCompleteEvent(event: SSEEvent): event is SSECompleteEvent {
  return event.phase === 'completed';
}

/**
 * Validate and normalize SSE event data
 */
export function validateSSEEvent(data: unknown): SSEEvent | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const event = data as Record<string, unknown>;

  // Check for required fields
  if (typeof event.phase !== 'string' || typeof event.progress !== 'number') {
    return null;
  }

  // Validate phase value
  const validPhases = ['queued', 'lexing', 'hashing', 'bucketing', 'analyzing', 'completed'];
  if (!validPhases.includes(event.phase)) {
    return null;
  }

  // Validate progress range
  if (event.progress < 0 || event.progress > 1) {
    return null;
  }

  // If it's a complete event, it should have jobId and elapsedSeconds
  if (event.phase === 'completed') {
    if (typeof event.jobId !== 'string' || typeof event.elapsedSeconds !== 'number') {
      return null;
    }
    return {
      phase: 'completed',
      progress: event.progress,
      jobId: event.jobId,
      elapsedSeconds: event.elapsedSeconds,
    };
  }

  // Otherwise it's a phase event and should have a message
  if (typeof event.message !== 'string') {
    return null;
  }

  return {
    phase: event.phase as any,
    progress: event.progress,
    message: event.message,
  };
}
