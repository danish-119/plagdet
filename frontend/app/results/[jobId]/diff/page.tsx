'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { DiffViewer } from '@/components/diff/diff-viewer';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getJobResults } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft } from 'lucide-react';

export default function DiffPage() {
  const router = useRouter();
  const params = useParams() as { jobId: string };
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const fileA = searchParams.get('fileA') || '';
  const fileB = searchParams.get('fileB') || '';

  const [contentA, setContentA] = useState('');
  const [contentB, setContentB] = useState('');
  const [similarity, setSimilarity] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [language, setLanguage] = useState('');
  const [matchedRanges, setMatchedRanges] = useState<
    | {
        fileA: Array<{ startLine: number; endLine: number; confidence: 'high' | 'partial' }>;
        fileB: Array<{ startLine: number; endLine: number; confidence: 'high' | 'partial' }>;
      }
    | undefined
  >(undefined);

  useEffect(() => {
    if (!fileA || !fileB) {
      router.back();
      return;
    }

    const fetchContent = async () => {
      try {
        const results = await getJobResults(params.jobId);
        const fileContent_A = results.files[fileA] || '';
        const fileContent_B = results.files[fileB] || '';

        setContentA(fileContent_A);
        setContentB(fileContent_B);
        setLanguage(results.stats.language);

        // Find similarity from pairs
        const pair = results.pairs.find(
          (p) =>
            (p.fileA === fileA && p.fileB === fileB) ||
            (p.fileA === fileB && p.fileB === fileA)
        );
        if (pair) {
          setSimilarity(pair.similarity);
          setMatchedRanges(pair.matchedRanges);
        }
      } catch (error: any) {
        toast({
          title: 'Error Loading Files',
          description: error.message || 'Failed to load file contents',
          variant: 'destructive',
        });
        router.back();
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, [params.jobId, fileA, fileB, router, toast]);

  if (!fileA || !fileB) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="pt-24 pb-16 container mx-auto px-4">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Results', href: `/results/${params.jobId}` },
            { label: 'Diff', href: '#' },
          ]}
        />
        <div className="max-w-full">
          <Skeleton className="h-16 w-2/3 mb-8 rounded-lg" />
          <Skeleton className="h-[28rem] w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 container mx-auto px-4">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Results', href: `/results/${params.jobId}` },
          { label: `Diff: ${fileA} vs ${fileB}`, href: '#' },
        ]}
      />

      <div className="max-w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div className="min-w-0">
            <p className="eyebrow mb-2">File comparison</p>
            <h1 className="font-mono text-xl sm:text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] break-all">
              {fileA} <span className="text-[var(--color-text-tertiary)] font-sans font-normal">vs</span> {fileB}
            </h1>
            <div className="flex items-center gap-3 mt-3">
              <span
                className={`text-3xl font-semibold tabular-nums ${
                  similarity >= 85
                    ? 'text-[var(--color-danger)]'
                    : similarity >= 60
                      ? 'text-[var(--color-warning)]'
                      : 'text-[var(--color-success)]'
                }`}
              >
                {similarity.toFixed(1)}%
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  similarity >= 85
                    ? 'bg-[color-mix(in_srgb,var(--color-danger)_15%,transparent)] text-[var(--color-danger)]'
                    : similarity >= 60
                      ? 'bg-[color-mix(in_srgb,var(--color-warning)_16%,transparent)] text-[var(--color-warning)]'
                      : 'bg-[color-mix(in_srgb,var(--color-success)_15%,transparent)] text-[var(--color-success)]'
                }`}
              >
                {similarity >= 85 ? 'High risk' : similarity >= 60 ? 'Medium risk' : 'Low risk'}
              </span>
            </div>
          </div>
          <Button variant="outline" onClick={() => router.back()} className="rounded-full self-start md:self-auto">
            <ChevronLeft className="h-4 w-4" />
            Back to results
          </Button>
        </div>

        {/* Diff Viewer */}
        <DiffViewer
          fileA={fileA}
          contentA={contentA}
          fileB={fileB}
          contentB={contentB}
          language={language}
          matchedRanges={matchedRanges}
        />
      </div>
    </div>
  );
}
