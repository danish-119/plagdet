'use client';

import { Button } from '@/components/ui/button';
import { Play, Trash2, X, Loader2 } from 'lucide-react';

interface ActionBarProps {
  hasFiles: boolean;
  isProcessing: boolean;
  onStartAnalysis: () => void;
  onClearAll: () => void;
  onCancel?: () => void;
}

export function ActionBar({
  hasFiles,
  isProcessing,
  onStartAnalysis,
  onClearAll,
  onCancel,
}: ActionBarProps) {
  if (!hasFiles && !isProcessing) {
    return null;
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 glass border-t border-[var(--color-border)] animate-fade-up">
      <div className="container mx-auto px-4 py-3.5 flex items-center justify-between gap-4">
        <div className="hidden sm:block text-sm text-[var(--color-text-secondary)]">
          {isProcessing ? 'Uploading and starting your analysis...' : 'Ready when you are.'}
        </div>
        <div className="flex gap-3 ml-auto">
          {isProcessing && onCancel && (
            <Button variant="outline" onClick={onCancel} className="rounded-full text-[var(--color-danger)]">
              <X className="h-4 w-4" />
              Cancel
            </Button>
          )}

          {!isProcessing && (
            <>
              <Button
                variant="ghost"
                onClick={onClearAll}
                disabled={!hasFiles}
                className="rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-danger)]"
              >
                <Trash2 className="h-4 w-4" />
                Clear all
              </Button>

              <Button
                onClick={onStartAnalysis}
                disabled={!hasFiles || isProcessing}
                className="btn-brand rounded-full px-6 border-0"
              >
                <Play className="h-4 w-4" />
                Start analysis
              </Button>
            </>
          )}

          {isProcessing && (
            <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
              <Loader2 className="h-4 w-4 animate-spin text-[var(--color-accent-primary)]" />
              Processing...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
