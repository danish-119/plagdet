import { useEffect, useCallback, useRef } from 'react';
import { SSEEvent } from '@/lib/types';

interface UseSSEStreamOptions {
  jobId: string;
  onEvent: (event: SSEEvent) => void;
  onError: (error: Error) => void;
  onClose?: () => void;
  apiBaseUrl?: string;
  pollIntervalMs?: number; // Fallback polling interval in milliseconds
  enablePolling?: boolean; // Enable polling fallback
}

/**
 * Hook for consuming SSE stream with polling fallback
 * 
 * Implements real-time progress streaming with automatic polling fallback
 * if SSE connection fails. Closes gracefully on unmount or error.
 */
export function useSSEStream({
  jobId,
  onEvent,
  onError,
  onClose,
  apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000',
  pollIntervalMs = 2000,
  enablePolling = true,
}: UseSSEStreamOptions) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPollRef = useRef<number>(0);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // SSE event handlers
  const handlePhaseEvent = useCallback((event: Event) => {
    if (!(event instanceof MessageEvent)) return;

    try {
      const data = JSON.parse(event.data);
      onEvent({
        type: 'phase',
        phase: data.phase,
        progress: data.progress,
        message: data.message,
      });
    } catch (error) {
      onError(new Error(`Failed to parse phase event: ${error}`));
    }
  }, [onEvent, onError]);

  const handleCompleteEvent = useCallback((event: Event) => {
    if (!(event instanceof MessageEvent)) return;

    try {
      const data = JSON.parse(event.data);
      onEvent({
        type: 'complete',
        phase: data.phase,
        progress: data.progress,
        jobId: data.jobId,
        elapsedSeconds: data.elapsedSeconds,
      });
      cleanup();
      onClose?.();
    } catch (error) {
      onError(new Error(`Failed to parse complete event: ${error}`));
    }
  }, [onEvent, onError, cleanup, onClose]);

  const handleSSEError = useCallback(() => {
    console.log('[v0] SSE connection failed, attempting polling fallback...');
    cleanup();

    if (enablePolling) {
      // Start polling as fallback
      if (!pollIntervalRef.current) {
        pollIntervalRef.current = setInterval(async () => {
          if (Date.now() - lastPollRef.current < pollIntervalMs * 0.8) {
            return; // Skip if last poll was too recent
          }
          lastPollRef.current = Date.now();

          try {
            const response = await fetch(`${apiBaseUrl}/api/jobs/${jobId}/status`);
            if (!response.ok) {
              throw new Error(`Status poll failed: ${response.status}`);
            }

            const data = await response.json();
            onEvent({
              type: 'phase',
              phase: data.phase,
              progress: data.progress,
              message: data.message || '',
            });

            // If completed, fire complete event and stop polling
            if (data.status === 'completed') {
              onEvent({
                type: 'complete',
                phase: 'completed',
                progress: 1.0,
                jobId: jobId,
                elapsedSeconds: data.elapsedSeconds || 0,
              });
              cleanup();
              onClose?.();
            }
          } catch (error) {
            console.error('[v0] Polling error:', error);
            onError(error instanceof Error ? error : new Error('Polling failed'));
          }
        }, pollIntervalMs);
      }
    } else {
      onError(new Error('SSE connection failed and polling is disabled'));
    }
  }, [jobId, apiBaseUrl, pollIntervalMs, enablePolling, onEvent, onError, cleanup, onClose]);

  // Connect to SSE stream
  useEffect(() => {
    try {
      const eventSource = new EventSource(`${apiBaseUrl}/api/jobs/${jobId}/stream`);
      eventSourceRef.current = eventSource;

      eventSource.addEventListener('phase', handlePhaseEvent);
      eventSource.addEventListener('complete', handleCompleteEvent);
      eventSource.addEventListener('error', handleSSEError);

      return () => {
        cleanup();
      };
    } catch (error) {
      onError(error instanceof Error ? error : new Error('Failed to create EventSource'));
      return () => cleanup();
    }
  }, [jobId, apiBaseUrl, handlePhaseEvent, handleCompleteEvent, handleSSEError, cleanup, onError]);

  // Return cleanup function
  return cleanup;
}
