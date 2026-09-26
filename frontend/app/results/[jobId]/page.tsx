'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { RuntimeStats } from '@/components/results/runtime-stats';
import { SimilarityChart } from '@/components/results/similarity-chart';
import { SuspectPairsTable } from '@/components/results/suspect-pairs-table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getJobResults, getPdfDownloadUrl } from '@/lib/api';
import { AnalysisResults } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { FileText, Plus, Download, ShieldCheck } from 'lucide-react';

export default function ResultsPage() {
  const router = useRouter();
  const params = useParams() as { jobId: string };
  const { toast } = useToast();
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const data = await getJobResults(params.jobId);
        setResults(data);
      } catch (error: any) {
        if (error.code === 'RESULTS_EXPIRED' || error.status === 404) {
          setIsExpired(true);
        } else {
          toast({
            title: 'Error Loading Results',
            description: error.message || 'Failed to load results',
            variant: 'destructive',
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [params.jobId, toast]);

  if (isLoading) {
    return (
      <div className="pt-24 pb-16 container mx-auto px-4">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Results', href: `/results/${params.jobId}` },
          ]}
        />
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-10 w-72 mb-8 rounded-lg" />
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="pt-24 pb-16 container mx-auto px-4">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Results', href: `/results/${params.jobId}` },
          ]}
        />
        <div className="max-w-6xl mx-auto">
          <EmptyState
            illustration={<FileText className="h-14 w-14" />}
            title="Results Expired"
            description="These results have expired. Please run a new analysis to get fresh data."
            action={{
              label: 'Start New Analysis',
              onClick: () => router.push('/upload'),
            }}
          />
        </div>
      </div>
    );
  }

  if (!results) {
    return null;
  }

  const pdfUrl = getPdfDownloadUrl(params.jobId, results.stats.language);

  return (
    <div className="pt-24 pb-16 container mx-auto px-4">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Results', href: `/results/${params.jobId}` },
        ]}
      />

      <div className="max-w-6xl mx-auto">
        <PageHeader
          eyebrow="Analysis results"
          title={
            results.stats.highConfidenceMatches > 0
              ? `${results.stats.highConfidenceMatches} high-confidence ${
                  results.stats.highConfidenceMatches === 1 ? 'match' : 'matches'
                } found`
              : 'No high-confidence matches'
          }
          description={
            <span className="inline-flex flex-wrap items-center gap-2">
              Job
              <code className="rounded-md bg-[var(--color-bg-secondary)] border border-[var(--color-border)] px-2 py-0.5 font-mono text-xs">
                {params.jobId}
              </code>
              <span className="text-[var(--color-text-tertiary)]">·</span>
              <span className="font-mono text-xs uppercase">{results.stats.language}</span>
            </span>
          }
          actions={
            <>
              <Button variant="outline" className="rounded-full" onClick={() => router.push('/upload')}>
                <Plus className="h-4 w-4" />
                New analysis
              </Button>
              <Button asChild className="btn-brand rounded-full border-0">
                <a
                  href={pdfUrl}
                  download={`plagiarism_report_${results.stats.language}_${new Date().toISOString().split('T')[0]}.pdf`}
                >
                  <Download className="h-4 w-4" />
                  Export PDF
                </a>
              </Button>
            </>
          }
        />

        <RuntimeStats stats={results.stats} />

        <section className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight text-[var(--color-text-primary)] mb-4">
            Similarity distribution
          </h2>
          <SimilarityChart pairs={results.pairs} />
        </section>

        <section className="mt-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-1 mb-4">
            <h2 className="text-xl font-semibold tracking-tight text-[var(--color-text-primary)]">Suspect pairs</h2>
            {typeof results.stats.displayedPairs === 'number' &&
              typeof results.stats.totalPairsFound === 'number' && (
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Top {results.stats.displayedPairs.toLocaleString()} of{' '}
                  {results.stats.totalPairsFound.toLocaleString()} above-threshold matches
                </p>
              )}
          </div>
          {results.pairs.length === 0 ? (
            <div className="surface">
              <EmptyState
                illustration={<ShieldCheck className="h-14 w-14 text-[var(--color-success)]" />}
                title="No suspicious pairs found"
                description="Nothing in this batch is similar enough to cross the threshold."
              />
            </div>
          ) : (
            <SuspectPairsTable pairs={results.pairs} jobId={params.jobId} language={results.stats.language} />
          )}
        </section>
      </div>
    </div>
  );
}
