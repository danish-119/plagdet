'use client';

import { FileCode } from 'lucide-react';
import { formatFileSize } from '@/lib/utils';
import type { FileWithSize } from '@/hooks/use-file-upload';

interface FileManifestProps {
  files: FileWithSize[];
  totalSize: number;
  ignoredCount?: number;
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'accent' | 'warn' }) {
  return (
    <div className="surface p-4">
      <p className="text-xs uppercase tracking-wider text-[var(--color-text-tertiary)] mb-1.5">{label}</p>
      <p
        className={`text-2xl font-semibold tabular-nums ${
          tone === 'accent'
            ? 'text-gradient'
            : tone === 'warn'
              ? 'text-[var(--color-warning)]'
              : 'text-[var(--color-text-primary)]'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export function FileManifest({ files, totalSize, ignoredCount = 0 }: FileManifestProps) {
  if (files.length === 0) {
    return null;
  }

  const sizes = files.map((f) => f.size);
  const minSize = Math.min(...sizes);
  const maxSize = Math.max(...sizes);

  return (
    <section className="mt-10 animate-fade-up" aria-labelledby="manifest-heading">
      <div className="flex items-center gap-3 mb-4">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-accent-primary)] text-xs font-semibold text-white">
          3
        </span>
        <h2 id="manifest-heading" className="text-base font-semibold text-[var(--color-text-primary)]">
          Review files
        </h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat label="Valid files" value={String(files.length)} tone="accent" />
        {ignoredCount > 0 ? (
          <Stat label="Ignored" value={String(ignoredCount)} tone="warn" />
        ) : (
          <Stat label="Ignored" value="0" />
        )}
        <Stat label="Total size" value={formatFileSize(totalSize)} />
        <Stat label="Range" value={`${formatFileSize(minSize)} – ${formatFileSize(maxSize)}`} />
      </div>

      <div className="surface overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]/60 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Files</h3>
          <span className="text-xs text-[var(--color-text-tertiary)]">{files.length} total</span>
        </div>
        <ul className="max-h-72 overflow-y-auto divide-y divide-[var(--color-border)]">
          {files.map((file, index) => (
            <li
              key={index}
              className="px-4 py-2.5 flex items-center gap-3 hover:bg-[var(--color-bg-secondary)] transition-colors"
            >
              <FileCode className="h-4 w-4 text-[var(--color-accent-primary)] shrink-0" />
              <span className="font-mono text-sm text-[var(--color-text-primary)] flex-1 truncate">
                {file.name}
              </span>
              <span className="text-xs tabular-nums text-[var(--color-text-tertiary)] shrink-0">
                {formatFileSize(file.size)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
