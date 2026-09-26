import React, { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  illustration?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'ghost';
  };
}

export function EmptyState({
  illustration,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {illustration && (
        <div className="mb-6 text-[var(--color-text-tertiary)]">
          {illustration}
        </div>
      )}
      <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-[var(--color-text-secondary)] mb-6 max-w-sm">
          {description}
        </p>
      )}
      {action && (
        <Button
          onClick={action.onClick}
          variant={action.variant as any}
          className={action.variant === 'outline' || action.variant === 'ghost' ? 'rounded-full' : 'btn-brand rounded-full border-0'}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
