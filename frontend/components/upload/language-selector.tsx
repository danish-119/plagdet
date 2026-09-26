'use client';

import { Check } from 'lucide-react';
import { LANGUAGE_CONFIG } from '@/lib/constants';

interface LanguageSelectorProps {
  selectedLanguage: string | null;
  onLanguageChange: (language: string | null) => void;
  disabled?: boolean;
}

const BLURB: Record<string, string> = {
  c: 'ANSI / C99 sources',
  cpp: 'C++ sources',
  python: 'Python 3 scripts',
};

export function LanguageSelector({
  selectedLanguage,
  onLanguageChange,
  disabled = false,
}: LanguageSelectorProps) {
  const languages = Object.entries(LANGUAGE_CONFIG).map(([key, config]) => ({
    id: key,
    label: config.label,
    extension: config.extension,
  }));

  return (
    <section className="mb-8" aria-labelledby="language-heading">
      <div className="flex items-center gap-3 mb-4">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-accent-primary)] text-xs font-semibold text-white">
          1
        </span>
        <h2 id="language-heading" className="text-base font-semibold text-[var(--color-text-primary)]">
          Choose a language
        </h2>
      </div>
      <div role="radiogroup" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {languages.map((lang) => {
          const active = selectedLanguage === lang.id;
          return (
            <button
              key={lang.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onLanguageChange(lang.id)}
              disabled={disabled}
              className={`relative text-left rounded-xl border p-4 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                active
                  ? 'border-[var(--color-accent-primary)] bg-[color-mix(in_srgb,var(--color-accent-primary)_10%,var(--card))] shadow-[var(--glow)]'
                  : 'border-[var(--color-border)] bg-[var(--card)] hover:border-[color-mix(in_srgb,var(--color-accent-primary)_50%,var(--color-border))] hover:-translate-y-0.5'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-2xl font-semibold text-[var(--color-text-primary)]">
                  {lang.label}
                </span>
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border transition-all ${
                    active
                      ? 'bg-[var(--color-accent-primary)] border-transparent text-white scale-100'
                      : 'border-[var(--color-border)] text-transparent scale-90'
                  }`}
                >
                  <Check className="h-3 w-3" />
                </span>
              </div>
              <p className="mt-2 text-xs text-[var(--color-text-tertiary)]">
                <span className="font-mono">{lang.extension}</span> · {BLURB[lang.id]}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
