'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { LANGUAGE_CONFIG, FILE_UPLOAD_LIMITS, DEFAULT_ADVANCED_SETTINGS } from '@/lib/constants';
import { validateFileExtension, validateAdvancedSettings, isZipArchive } from '@/lib/validators';
import { AdvancedSettings } from '@/lib/types';
import { clearExpiredCaches, computeBatchFingerprint } from '@/lib/file-cache';

export interface FileWithSize {
  name: string;
  size: number;
  file: File;
}

export type DropzoneState = 'disabled' | 'idle' | 'dragover' | 'invalid' | 'processing';

export interface UseFileUploadReturn {
  selectedLanguage: string | null;
  setSelectedLanguage: (language: string | null) => void;
  files: FileWithSize[];
  setFiles: (files: FileWithSize[]) => void;
  dropzoneState: DropzoneState;
  setDropzoneState: (state: DropzoneState) => void;
  advancedSettings: AdvancedSettings;
  setAdvancedSettings: (settings: AdvancedSettings) => void;
  addFiles: (newFiles: File[]) => void;
  clearAll: () => void;
  resetSettings: () => void;
  batchFingerprint: string | null;
  manifest: {
    validFiles: FileWithSize[];
    ignoredCount: number;
    totalSize: number;
    totalCount: number;
  };
  validateSettings: () => { valid: boolean; errors: Record<string, string> };
}

export function useFileUpload(): UseFileUploadReturn {
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [files, setFiles] = useState<FileWithSize[]>([]);
  const [dropzoneState, setDropzoneState] = useState<DropzoneState>('disabled');
  const [advancedSettings, setAdvancedSettings] = useState<AdvancedSettings>(
    DEFAULT_ADVANCED_SETTINGS
  );
  const [batchFingerprint, setBatchFingerprint] = useState<string | null>(null);

  // Update dropzone state when language changes
  const handleLanguageChange = useCallback((language: string | null) => {
    setSelectedLanguage(language);
    setDropzoneState(language ? 'idle' : 'disabled');
  }, []);

  // Process and filter files
  const addFiles = useCallback(
    (newFiles: File[]) => {
      if (!selectedLanguage) return;

      const validatedFiles: FileWithSize[] = [];
      let totalSize = 0;

      for (const file of newFiles) {
        // Check if file matches language extension
        if (!validateFileExtension(file.name, selectedLanguage)) {
          continue; // Silently discard
        }

        // Check file size
        if (file.size > FILE_UPLOAD_LIMITS.maxFileSize) {
          continue;
        }

        validatedFiles.push({
          name: file.name,
          size: file.size,
          file,
        });
        totalSize += file.size;
      }

      // Check total batch size
      const currentSize = files.reduce((sum, f) => sum + f.size, 0);
      if (currentSize + totalSize > FILE_UPLOAD_LIMITS.maxBatchSize) {
        // Truncate to fit within limit
        const remainingQuota = FILE_UPLOAD_LIMITS.maxBatchSize - currentSize;
        let currentAdded = 0;
        const fittingFiles = [];

        for (const file of validatedFiles) {
          if (currentAdded + file.size <= remainingQuota) {
            fittingFiles.push(file);
            currentAdded += file.size;
          }
        }

        setFiles([...files, ...fittingFiles]);
      } else {
        setFiles([...files, ...validatedFiles]);
      }
    },
    [selectedLanguage, files]
  );

  useEffect(() => {
    let isActive = true;

    if (files.length === 0) {
      setBatchFingerprint(null);
      return () => {
        isActive = false;
      };
    }

    void (async () => {
      const fingerprint = await computeBatchFingerprint(files.map((file) => file.file));
      if (isActive) {
        setBatchFingerprint(fingerprint || null);
      }
      await clearExpiredCaches();
    })();

    return () => {
      isActive = false;
    };
  }, [files]);

  // Calculate manifest
  const manifest = useMemo(() => {
    const validFiles = files.filter((file) => !isZipArchive(file.name));
    const totalSize = validFiles.reduce((sum, f) => sum + f.size, 0);
    return {
      validFiles,
      ignoredCount: 0, // We silently ignore at file boundary
      totalSize,
      totalCount: validFiles.length,
    };
  }, [files]);

  const clearAll = useCallback(() => {
    setFiles([]);
    setSelectedLanguage(null);
    setDropzoneState('disabled');
    setBatchFingerprint(null);
    resetSettings();
  }, []);

  const resetSettings = useCallback(() => {
    setAdvancedSettings(DEFAULT_ADVANCED_SETTINGS);
  }, []);

  const validateSettings = useCallback(() => {
    return validateAdvancedSettings(advancedSettings);
  }, [advancedSettings]);

  return {
    selectedLanguage,
    setSelectedLanguage: handleLanguageChange,
    files,
    setFiles,
    dropzoneState,
    setDropzoneState,
    advancedSettings,
    setAdvancedSettings,
    addFiles,
    clearAll,
    resetSettings,
    batchFingerprint,
    manifest,
    validateSettings,
  };
}
