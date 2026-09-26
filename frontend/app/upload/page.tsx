'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { LanguageSelector } from '@/components/upload/language-selector';
import { FileDropzone } from '@/components/upload/file-dropzone';
import { FileManifest } from '@/components/upload/file-manifest';
import { AdvancedSettingsComponent } from '@/components/upload/advanced-settings';
import { ActionBar } from '@/components/upload/action-bar';
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { ToastAction } from '@/components/ui/toast';
import { useFileUpload } from '@/hooks/use-file-upload';
import { useToast } from '@/hooks/use-toast';
import { createJob } from '@/lib/api';
import { cacheFiles, getCachedFiles } from '@/lib/file-cache';

export default function UploadPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showLanguageChangeDialog, setShowLanguageChangeDialog] = useState(false);
  const [pendingLanguage, setPendingLanguage] = useState<string | null>(null);
  const cameFromQuickStart = useRef(false);
  const autoStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoStartToastRef = useRef<ReturnType<typeof toast> | null>(null);

  const {
    selectedLanguage,
    setSelectedLanguage,
    files,
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
  } = useFileUpload();

  // Load preselected language from sessionStorage
  useEffect(() => {
    const preselected = sessionStorage.getItem('preselectedLanguage');
    if (preselected) {
      cameFromQuickStart.current = true;
      setSelectedLanguage(preselected);
      sessionStorage.removeItem('preselectedLanguage');
    }
  }, [setSelectedLanguage]);

  const clearAutoStartCountdown = (completeSession: boolean) => {
    if (autoStartTimerRef.current) {
      clearTimeout(autoStartTimerRef.current);
      autoStartTimerRef.current = null;
    }

    if (autoStartToastRef.current) {
      autoStartToastRef.current.dismiss();
      autoStartToastRef.current = null;
    }

    if (completeSession) {
      cameFromQuickStart.current = false;
    }
  };

  const handleFilesAdded = (newFiles: File[]) => {
    if (autoStartTimerRef.current) {
      clearAutoStartCountdown(true);
    }

    addFiles(newFiles);
  };

  const handleClearAll = () => {
    clearAutoStartCountdown(true);
    clearAll();
  };

  const handleSettingsChange = (settings: typeof advancedSettings) => {
    if (autoStartTimerRef.current) {
      clearAutoStartCountdown(true);
    }

    setAdvancedSettings(settings);
  };

  const handleLanguageChange = (language: string | null) => {
    if (autoStartTimerRef.current) {
      clearAutoStartCountdown(true);
    }

    if (files.length > 0 && language !== selectedLanguage) {
      setPendingLanguage(language);
      setShowLanguageChangeDialog(true);
    } else {
      setSelectedLanguage(language);
    }
  };

  const confirmLanguageChange = () => {
    clearAutoStartCountdown(true);
    clearAll();
    setSelectedLanguage(pendingLanguage);
    setShowLanguageChangeDialog(false);
    setPendingLanguage(null);
  };

  useEffect(() => {
    if (
      !cameFromQuickStart.current ||
      isLoading ||
      files.length === 0 ||
      !selectedLanguage ||
      autoStartTimerRef.current
    ) {
      return;
    }

    // REQ-UX-QUICKSTART: auto-start only when the quick-start batch is left untouched for a short grace period.
    autoStartToastRef.current = toast({
      title: 'Starting analysis automatically...',
      description: 'Starting in 1.5 seconds. Click Cancel to stop it.',
      action: (
        <ToastAction
          altText="Cancel automatic analysis start"
          onClick={() => clearAutoStartCountdown(true)}
        >
          Cancel
        </ToastAction>
      ),
    });

    autoStartTimerRef.current = setTimeout(() => {
      autoStartTimerRef.current = null;
      if (autoStartToastRef.current) {
        autoStartToastRef.current.dismiss();
        autoStartToastRef.current = null;
      }
      cameFromQuickStart.current = false;
      void handleStartAnalysis();
    }, 1500);
  }, [files.length, isLoading, selectedLanguage]);

  const handleStartAnalysis = async () => {
    clearAutoStartCountdown(true);

    // Validate settings
    const validation = validateSettings();
    if (!validation.valid) {
      Object.values(validation.errors).forEach((error) => {
        toast({
          title: 'Invalid Settings',
          description: error,
          variant: 'destructive',
        });
      });
      return;
    }

    if (files.length === 0) {
      toast({
        title: 'No Files',
        description: 'Please add files before starting analysis',
        variant: 'destructive',
      });
      return;
    }

    const invalidFileEntry = files.find((file) => !file.file);
    if (invalidFileEntry) {
      toast({
        title: 'Invalid File Selection',
        description: 'One or more selected files are missing and cannot be uploaded.',
        variant: 'destructive',
      });
      return;
    }

    if (batchFingerprint) {
      const cachedFiles = await getCachedFiles(batchFingerprint);
      if (cachedFiles) {
        toast({
          title: 'Using previously uploaded files',
          description: 'This batch is already cached locally, so the upload flow can reuse it when supported.',
          variant: 'default',
        });
      }
    }

    try {
      // Build FormData for file upload
      const formData = new FormData();
      formData.append('language', selectedLanguage!);

      // Add advanced settings
      formData.append('kGramSize', advancedSettings.kGramSize.toString());
      formData.append('signatureLength', advancedSettings.signatureLength.toString());
      formData.append('threshold', advancedSettings.threshold.toString());
      formData.append('bands', advancedSettings.bands.toString());

      for (const fileEntry of files) {
        if (!fileEntry.file) {
          toast({
            title: 'Invalid File Selection',
            description: `File ${fileEntry.name} is missing its file data. Please reselect your files.`,
            variant: 'destructive',
          });
          return;
        }

        formData.append('files', fileEntry.file);
      }

      setIsLoading(true);
      setDropzoneState('processing');

      // Create job and navigate to analysis page
      const response = await createJob(formData);

      if (batchFingerprint) {
        void cacheFiles(batchFingerprint, files.map((file) => file.file));
      }

      toast({
        title: 'Analysis Started',
        description: `Job ${response.jobId} has been created. Redirecting...`,
        variant: 'default',
      });

      // Navigate to analysis page
      router.push(`/analysis/${response.jobId}`);
    } catch (error: any) {
      toast({
        title: 'Error Starting Analysis',
        description: error.message || 'Failed to start analysis',
        variant: 'destructive',
      });
      setDropzoneState('idle');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setShowCancelDialog(true);
  };

  const confirmCancel = () => {
    setShowCancelDialog(false);
    clearAll();
  };

  return (
    <div className="relative pt-24 pb-32 container mx-auto px-4 max-w-4xl">
      <div className="aurora pointer-events-none fixed inset-x-0 top-0 -z-10 h-[420px] opacity-60" />
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'New Analysis', href: '/upload' },
        ]}
      />

      <PageHeader
        eyebrow="New analysis"
        title="Compare a batch of submissions"
        description="Pick a language, add the files, and we will flag the pairs that look copied."
      />

      {/* Language Selection */}
      <LanguageSelector
        selectedLanguage={selectedLanguage}
        onLanguageChange={handleLanguageChange}
      />

      {/* File Dropzone */}
      <div className="mb-8">
        <FileDropzone
          selectedLanguage={selectedLanguage}
          state={dropzoneState}
          onFilesAdded={handleFilesAdded}
          onStateChange={setDropzoneState}
        />
      </div>

      {/* File Manifest */}
      {files.length > 0 && (
        <FileManifest
          files={manifest.validFiles}
          totalSize={manifest.totalSize}
          ignoredCount={manifest.ignoredCount}
        />
      )}

      {/* Advanced Settings */}
      {files.length > 0 && (
        <AdvancedSettingsComponent
          settings={advancedSettings}
          onSettingsChange={handleSettingsChange}
          onReset={resetSettings}
        />
      )}

      {/* Action Bar */}
      <ActionBar
        hasFiles={files.length > 0}
        isProcessing={isLoading}
        onStartAnalysis={handleStartAnalysis}
        onClearAll={handleClearAll}
        onCancel={isLoading ? handleCancel : undefined}
      />

      {/* Dialogs */}
      <ConfirmationDialog
        open={showLanguageChangeDialog}
        title="Change Language?"
        description="Changing language will discard the current file list. Continue?"
        confirmText="Change Language"
        cancelText="Keep Files"
        variant="destructive"
        onConfirm={confirmLanguageChange}
        onCancel={() => {
          setShowLanguageChangeDialog(false);
          setPendingLanguage(null);
        }}
      />

      <ConfirmationDialog
        open={showCancelDialog}
        title="Cancel Analysis?"
        description="Are you sure? Progress will be lost."
        confirmText="Cancel Analysis"
        cancelText="Continue"
        variant="destructive"
        onConfirm={confirmCancel}
        onCancel={() => setShowCancelDialog(false)}
      />
    </div>
  );
}
