'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { ADVANCED_SETTINGS_RANGES } from '@/lib/constants';
import { validateBands } from '@/lib/validators';
import type { AdvancedSettings } from '@/lib/types';

interface AdvancedSettingsProps {
  settings: AdvancedSettings;
  onSettingsChange: (settings: AdvancedSettings) => void;
  onReset: () => void;
}

function Field({
  label,
  hint,
  range,
  children,
  error,
}: {
  label: string;
  hint: string;
  range?: string;
  children: React.ReactNode;
  error?: string | null;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <label className="text-sm font-medium text-[var(--color-text-primary)]">{label}</label>
        {range && <span className="font-mono text-xs text-[var(--color-text-tertiary)]">{range}</span>}
      </div>
      {children}
      {error ? (
        <p className="text-xs text-[var(--color-danger)] mt-1.5">{error}</p>
      ) : (
        <p className="text-xs text-[var(--color-text-tertiary)] mt-1.5">{hint}</p>
      )}
    </div>
  );
}

export function AdvancedSettingsComponent({
  settings,
  onSettingsChange,
  onReset,
}: AdvancedSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [bandsError, setBandsError] = useState<string | null>(null);

  const handleChange = (key: keyof AdvancedSettings, value: number) => {
    const newSettings = { ...settings, [key]: value };
    onSettingsChange(newSettings);

    // Validate bands when signature length or bands change
    if (key === 'signatureLength' || key === 'bands') {
      if (!validateBands(newSettings.signatureLength, newSettings.bands)) {
        setBandsError(
          `Bands (${newSettings.bands}) must divide Signature Length (${newSettings.signatureLength}) evenly`
        );
      } else {
        setBandsError(null);
      }
    }
  };

  const R = ADVANCED_SETTINGS_RANGES;

  return (
    <section className="mt-6 surface overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-[var(--color-bg-secondary)] transition-colors"
      >
        <span className="flex items-center gap-3">
          <SlidersHorizontal className="h-4 w-4 text-[var(--color-accent-primary)]" />
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">Advanced settings</span>
          <span className="hidden sm:inline text-xs text-[var(--color-text-tertiary)]">
            k={settings.kGramSize} · sig={settings.signatureLength} · b={settings.bands} · ≥{settings.threshold}%
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 text-[var(--color-text-secondary)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="border-t border-[var(--color-border)] p-5 sm:p-6">
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-6">
            <Field label="K-gram size" range={`${R.kGramSize.min}–${R.kGramSize.max}`} hint="Size of each overlapping token fragment">
              <Input
                type="number"
                min={R.kGramSize.min}
                max={R.kGramSize.max}
                value={settings.kGramSize}
                onChange={(e) => handleChange('kGramSize', parseInt(e.target.value, 10))}
                className="font-mono"
              />
            </Field>

            <Field
              label="Signature length"
              range={`${R.signatureLength.min}–${R.signatureLength.max}`}
              hint="Length of the MinHash signature for each file"
            >
              <Input
                type="number"
                min={R.signatureLength.min}
                max={R.signatureLength.max}
                value={settings.signatureLength}
                onChange={(e) => handleChange('signatureLength', parseInt(e.target.value, 10))}
                className="font-mono"
              />
            </Field>

            <Field
              label="Bands (b)"
              range={`${R.bands.min}–${R.bands.max}`}
              hint="LSH bands. Must evenly divide the signature length."
              error={bandsError}
            >
              <Input
                type="number"
                min={R.bands.min}
                max={R.bands.max}
                value={settings.bands}
                onChange={(e) => handleChange('bands', parseInt(e.target.value, 10))}
                aria-invalid={!!bandsError}
                className="font-mono"
              />
            </Field>

            <Field
              label={`Similarity threshold: ${settings.threshold}%`}
              range={`${R.threshold.min}–${R.threshold.max}%`}
              hint="Only pairs above this similarity are reported"
            >
              <input
                type="range"
                min={R.threshold.min}
                max={R.threshold.max}
                value={settings.threshold}
                onChange={(e) => handleChange('threshold', parseInt(e.target.value, 10))}
                className="w-full h-9 accent-[var(--color-accent-primary)] cursor-pointer"
              />
            </Field>
          </div>

          <div className="pt-5 mt-6 border-t border-[var(--color-border)] flex justify-end">
            <Button variant="ghost" size="sm" onClick={onReset} className="text-[var(--color-text-secondary)]">
              Reset to defaults
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
