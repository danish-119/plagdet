import { LANGUAGE_CONFIG, ADVANCED_SETTINGS_RANGES } from './constants';

export function validateFileExtension(filename: string, selectedLanguage: string): boolean {
  const extension = LANGUAGE_CONFIG[selectedLanguage as keyof typeof LANGUAGE_CONFIG]?.extension;
  if (!extension) return false;
  return filename.toLowerCase().endsWith(extension) || filename.toLowerCase().endsWith('.zip');
}

export function isZipArchive(filename: string): boolean {
  return filename.toLowerCase().endsWith('.zip');
}

export function validateBands(signatureLength: number, bands: number): boolean {
  return signatureLength % bands === 0;
}

export function validateAdvancedSettings(settings: {
  kGramSize: number;
  signatureLength: number;
  threshold: number;
  bands: number;
}): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (settings.kGramSize < ADVANCED_SETTINGS_RANGES.kGramSize.min || settings.kGramSize > ADVANCED_SETTINGS_RANGES.kGramSize.max) {
    errors.kGramSize = `K-Gram size must be between ${ADVANCED_SETTINGS_RANGES.kGramSize.min} and ${ADVANCED_SETTINGS_RANGES.kGramSize.max}`;
  }

  if (settings.signatureLength < ADVANCED_SETTINGS_RANGES.signatureLength.min || settings.signatureLength > ADVANCED_SETTINGS_RANGES.signatureLength.max) {
    errors.signatureLength = `Signature length must be between ${ADVANCED_SETTINGS_RANGES.signatureLength.min} and ${ADVANCED_SETTINGS_RANGES.signatureLength.max}`;
  }

  if (settings.threshold < ADVANCED_SETTINGS_RANGES.threshold.min || settings.threshold > ADVANCED_SETTINGS_RANGES.threshold.max) {
    errors.threshold = `Threshold must be between ${ADVANCED_SETTINGS_RANGES.threshold.min} and ${ADVANCED_SETTINGS_RANGES.threshold.max}`;
  }

  if (settings.bands < ADVANCED_SETTINGS_RANGES.bands.min || settings.bands > ADVANCED_SETTINGS_RANGES.bands.max) {
    errors.bands = `Bands must be between ${ADVANCED_SETTINGS_RANGES.bands.min} and ${ADVANCED_SETTINGS_RANGES.bands.max}`;
  }

  if (!validateBands(settings.signatureLength, settings.bands)) {
    errors.bands = `Bands (${settings.bands}) must divide Signature Length (${settings.signatureLength}) evenly`;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
