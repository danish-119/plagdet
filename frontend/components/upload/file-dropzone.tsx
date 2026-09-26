'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, AlertCircle, Loader2, FileArchive } from 'lucide-react';
import { LANGUAGE_CONFIG } from '@/lib/constants';
import type { DropzoneState } from '@/hooks/use-file-upload';

interface FileDropzoneProps {
  selectedLanguage: string | null;
  state: DropzoneState;
  onFilesAdded: (files: File[]) => void;
  onStateChange: (state: DropzoneState) => void;
}

export function FileDropzone({
  selectedLanguage,
  state,
  onFilesAdded,
  onStateChange,
}: FileDropzoneProps) {
  const extension = selectedLanguage
    ? LANGUAGE_CONFIG[selectedLanguage as keyof typeof LANGUAGE_CONFIG].extension
    : null;

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      if (rejectedFiles.length > 0) {
        onStateChange('invalid');
        setTimeout(() => onStateChange('idle'), 2000);
        return;
      }

      onFilesAdded(acceptedFiles);
      onStateChange('idle');
    },
    [onFilesAdded, onStateChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: extension
      ? {
          'text/plain': [extension, '.zip'],
        }
      : {},
    disabled: state === 'disabled' || state === 'processing',
  });

  const disabled = state === 'disabled';
  const processing = state === 'processing';
  const invalid = state === 'invalid';
  const active = isDragActive || state === 'dragover';

  const frame = disabled
    ? 'border-[var(--color-border)] bg-[var(--color-bg-secondary)]/50 opacity-60 cursor-not-allowed'
    : processing
      ? 'border-[var(--color-border)] bg-[var(--color-bg-secondary)] cursor-wait'
      : invalid
        ? 'border-[var(--color-danger)] bg-[color-mix(in_srgb,var(--color-danger)_7%,transparent)]'
        : active
          ? 'border-[var(--color-accent-primary)] bg-[color-mix(in_srgb,var(--color-accent-primary)_9%,transparent)] scale-[1.01]'
          : 'border-[var(--color-border)] bg-[var(--card)] hover:border-[var(--color-accent-primary)] hover:bg-[color-mix(in_srgb,var(--color-accent-primary)_4%,var(--card))] cursor-pointer';

  const title = disabled
    ? 'Pick a language to unlock uploads'
    : processing
      ? 'Uploading your files...'
      : invalid
        ? `Only ${extension} files and .zip archives are accepted`
        : active
          ? 'Drop to add files'
          : 'Drag & drop your submissions';

  return (
    <section aria-labelledby="upload-heading">
      <div className="flex items-center gap-3 mb-4">
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
            disabled
              ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]'
              : 'bg-[var(--color-accent-primary)] text-white'
          }`}
        >
          2
        </span>
        <h2 id="upload-heading" className="text-base font-semibold text-[var(--color-text-primary)]">
          Add submissions
        </h2>
      </div>

      <div
        {...getRootProps()}
        className={`relative overflow-hidden min-h-72 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-8 text-center transition-all duration-200 ${frame}`}
      >
        <input {...getInputProps()} disabled={disabled || processing} />

        {processing && (
          <div className="animate-scan pointer-events-none absolute inset-x-0 h-24 -translate-y-full bg-gradient-to-b from-transparent via-[color-mix(in_srgb,var(--color-accent-primary)_25%,transparent)] to-transparent" />
        )}

        <div
          className={`mb-5 flex h-16 w-16 items-center justify-center rounded-2xl transition-transform ${
            invalid
              ? 'bg-[color-mix(in_srgb,var(--color-danger)_15%,transparent)] text-[var(--color-danger)]'
              : 'bg-[color-mix(in_srgb,var(--color-accent-primary)_14%,transparent)] text-[var(--color-accent-primary)]'
          } ${active ? 'scale-110 -translate-y-1' : ''}`}
        >
          {invalid ? (
            <AlertCircle className="h-8 w-8" />
          ) : processing ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : (
            <UploadCloud className="h-8 w-8" />
          )}
        </div>

        <p
          className={`text-lg font-semibold ${
            invalid ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-primary)]'
          }`}
        >
          {title}
        </p>

        {!disabled && !processing && !invalid && (
          <>
            <p className="mt-1.5 text-sm text-[var(--color-text-secondary)]">
              <span className="font-mono text-[var(--color-accent-primary)]">{extension}</span> files or a{' '}
              <span className="inline-flex items-center gap-1 font-mono text-[var(--color-accent-primary)]">
                <FileArchive className="h-3.5 w-3.5" />.zip
              </span>{' '}
              archive
            </p>
            <span className="mt-5 inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)]">
              or click to browse
            </span>
          </>
        )}
      </div>
    </section>
  );
}
