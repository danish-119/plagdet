'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { PipelineStepper } from '@/components/analysis/pipeline-stepper';
import { LiveLog } from '@/components/analysis/live-log';
import { useSSEStream } from '@/hooks/use-sse-stream';
import { useToast } from '@/hooks/use-toast';
import { SSEEvent } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { deleteJob, getJobStatus } from '@/lib/api';

export default function AnalysisPage() {
  const router = useRouter();
  const params = useParams() as { jobId: string };
  const { toast } = useToast();
  const [currentEvent, setCurrentEvent] = useState<SSEEvent | null>(null);
  const [logs, setLogs] = useState<Array<{ timestamp: string; message: string }>>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleSSEEvent = (event: SSEEvent) => {
    const timestamp = new Date().toLocaleTimeString();

    if (event.type === 'phase') {
      setCurrentEvent(event);
      setLogs((prev) => [
        ...prev,
        {
          timestamp,
          message: event.message || `${event.phase}: ${Math.round(event.progress * 100)}%`,
        },
      ]);
    } else if (event.type === 'complete') {
      setCurrentEvent(event);
      setLogs((prev) => [
        ...prev,
        {
          timestamp,
          message: `Analysis complete! Elapsed: ${event.elapsedSeconds.toFixed(1)}s`,
        },
      ]);
      setIsCompleted(true);

      // Redirect to results page after 1 second
      setTimeout(() => {
        router.push(`/results/${params.jobId}`);
      }, 1000);
    }
  };

  const handleSSEError = (error: Error) => {
    toast({
      title: 'Stream Error',
      description: error.message,
      variant: 'destructive',
    });
  };

  useSSEStream({
    jobId: params.jobId,
    onEvent: handleSSEEvent,
    onError: handleSSEError,
    enablePolling: true,
  });

  useEffect(() => {
    if (isCompleted) {
      return;
    }

    let cancelled = false;

    const checkStatus = async () => {
      try {
        const status = await getJobStatus(params.jobId);
        if (cancelled) {
          return;
        }

        if (status.status === 'completed') {
          setIsCompleted(true);
          router.push(`/results/${params.jobId}`);
        }
      } catch {
        // Ignore transient polling failures; SSE remains the primary path.
      }
    };

    checkStatus();
    const intervalId = window.setInterval(checkStatus, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [isCompleted, params.jobId, router]);

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      await deleteJob(params.jobId);
      toast({
        title: 'Analysis Cancelled',
        description: 'The job has been cancelled.',
      });
      setShowCancelDialog(false);
      router.push('/upload');
    } catch (error) {
      toast({
        title: 'Cancel Failed',
        description: error instanceof Error ? error.message : 'Failed to cancel job',
        variant: 'destructive',
      });
      setIsCancelling(false);
    }
  };

  const pct = currentEvent ? Math.round(currentEvent.progress * 100) : 0;

  return (
    <div className="pt-24 pb-16 container mx-auto px-4">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Analysis', href: `/analysis/${params.jobId}` },
        ]}
      />

      <div className="max-w-3xl mx-auto">
        <PageHeader
          eyebrow={isCompleted ? 'Finished' : 'In progress'}
          title={isCompleted ? 'Analysis complete' : 'Analysing submissions'}
          description={
            <span className="inline-flex items-center gap-2">
              Job
              <code className="rounded-md bg-[var(--color-bg-secondary)] border border-[var(--color-border)] px-2 py-0.5 font-mono text-xs">
                {params.jobId}
              </code>
            </span>
          }
        />

        {/* Progress */}
        <div className="surface p-6 mb-5">
          <div className="flex items-end justify-between mb-3">
            <p className="text-sm font-medium text-[var(--color-text-secondary)]">
              {(currentEvent && 'message' in currentEvent && currentEvent.message) || 'Starting up...'}
            </p>
            <p className="text-3xl font-semibold tabular-nums text-gradient leading-none">{pct}%</p>
          </div>
          <div
            className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-bg-tertiary)]"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="relative h-full rounded-full transition-all duration-500 ease-out overflow-hidden"
              style={{ width: `${pct}%`, background: 'var(--gradient-brand)' }}
            >
              {!isCompleted && <div className="progress-shimmer absolute inset-0" />}
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-5">
          {/* Pipeline Stepper */}
          <div className="surface p-6 md:col-span-2">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-5">Pipeline</h3>
            <PipelineStepper currentPhase={isCompleted ? 'completed' : currentEvent?.phase || 'queued'} />
          </div>

          {/* Live Log */}
          <div className="md:col-span-3">
            <LiveLog logs={logs} />
          </div>
        </div>

        {!isCompleted ? (
          <div className="mt-6 flex justify-center">
            <Button
              variant="ghost"
              onClick={() => setShowCancelDialog(true)}
              disabled={isCancelling}
              className="rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-danger)]"
            >
              {isCancelling ? 'Cancelling...' : 'Cancel analysis'}
            </Button>
          </div>
        ) : (
          <p className="mt-6 text-center text-sm text-[var(--color-text-secondary)]">
            Taking you to the results...
          </p>
        )}
      </div>

      {/* Cancel Confirmation Dialog */}
      <ConfirmationDialog
        open={showCancelDialog}
        title="Cancel Analysis?"
        description="Are you sure? Progress will be lost and you will be redirected to the upload page."
        confirmText="Cancel Analysis"
        cancelText="Continue"
        variant="destructive"
        onConfirm={handleCancel}
        onCancel={() => setShowCancelDialog(false)}
      />
    </div>
  );
}
