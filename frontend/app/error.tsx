'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[PlagDet Error]', error);
  }, [error]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 pt-16">
      <div className="max-w-md w-full text-center">
        <span className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--color-danger)_14%,transparent)] text-[var(--color-danger)]">
          <AlertTriangle className="h-7 w-7" />
        </span>
        <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-3">Something went wrong</h1>
        <p className="text-[var(--color-text-secondary)] mb-8">
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        <div className="flex gap-3 flex-col sm:flex-row justify-center">
          <Button onClick={() => reset()} className="btn-brand rounded-full border-0 px-6">
            Try again
          </Button>
          <Button variant="outline" className="rounded-full" onClick={() => (window.location.href = '/')}>
            Go home
          </Button>
        </div>
      </div>
    </div>
  );
}
