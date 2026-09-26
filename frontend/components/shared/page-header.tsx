import type { ReactNode } from 'react';

interface PageHeaderProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--color-text-primary)] break-words">
          {title}
        </h1>
        {description && <div className="mt-2 text-[var(--color-text-secondary)]">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-3 shrink-0">{actions}</div>}
    </div>
  );
}
