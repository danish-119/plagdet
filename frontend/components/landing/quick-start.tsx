'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function QuickStart() {
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const router = useRouter();

  const languages = [
    { id: 'c', label: 'C' },
    { id: 'cpp', label: 'C++' },
    { id: 'python', label: 'Python' },
  ];

  const handleAnalyze = () => {
    if (selectedLanguage) {
      // Store selected language in sessionStorage for the upload page
      sessionStorage.setItem('preselectedLanguage', selectedLanguage);
      router.push('/upload');
    }
  };

  return (
    <section className="py-20 px-4">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold text-[var(--color-text-primary)] mb-8 text-center">
          Quick Start
        </h2>
        <div className="p-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)]">
          <p className="text-[var(--color-text-secondary)] mb-6 text-center">
            Select a language and start analyzing
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-8 justify-center">
            {languages.map((lang) => (
              <button
                key={lang.id}
                onClick={() => setSelectedLanguage(lang.id)}
                className={`px-6 py-3 rounded-full font-semibold transition-all ${
                  selectedLanguage === lang.id
                    ? 'bg-[var(--color-accent-primary)] text-white'
                    : 'border border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-[var(--color-accent-primary)]'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>

          <div className="flex justify-center">
            <Button
              onClick={handleAnalyze}
              disabled={!selectedLanguage}
              className="bg-[var(--color-accent-primary)] hover:bg-[var(--color-accent-hover)] text-white px-8 py-6"
              size="lg"
            >
              Start Analysis
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
