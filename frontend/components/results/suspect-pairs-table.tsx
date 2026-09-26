'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SuspectPair } from '@/lib/types';

interface SuspectPairsTableProps {
  pairs: SuspectPair[];
  jobId: string;
  language: string;
}

type Risk = 'all' | 'high' | 'medium' | 'low';

const riskStyles: Record<string, { text: string; bar: string; chip: string }> = {
  high: {
    text: 'text-[var(--color-danger)]',
    bar: 'var(--color-danger)',
    chip: 'bg-[color-mix(in_srgb,var(--color-danger)_15%,transparent)] text-[var(--color-danger)]',
  },
  medium: {
    text: 'text-[var(--color-warning)]',
    bar: 'var(--color-warning)',
    chip: 'bg-[color-mix(in_srgb,var(--color-warning)_16%,transparent)] text-[var(--color-warning)]',
  },
  low: {
    text: 'text-[var(--color-success)]',
    bar: 'var(--color-success)',
    chip: 'bg-[color-mix(in_srgb,var(--color-success)_15%,transparent)] text-[var(--color-success)]',
  },
};

export function SuspectPairsTable({ pairs, jobId }: SuspectPairsTableProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<Risk>('all');
  const [sortBy, setSortBy] = useState<'similarity' | 'fileName'>('similarity');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const counts = useMemo(
    () => ({
      all: pairs.length,
      high: pairs.filter((p) => p.riskLevel === 'high').length,
      medium: pairs.filter((p) => p.riskLevel === 'medium').length,
      low: pairs.filter((p) => p.riskLevel === 'low').length,
    }),
    [pairs]
  );

  const filteredAndSortedPairs = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const filtered = pairs.filter((pair) => {
      const matchesSearch = pair.fileA.toLowerCase().includes(term) || pair.fileB.toLowerCase().includes(term);
      const matchesRisk = riskFilter === 'all' || pair.riskLevel === riskFilter;
      return matchesSearch && matchesRisk;
    });

    filtered.sort((a, b) => {
      if (sortBy === 'similarity') {
        return sortOrder === 'desc' ? b.similarity - a.similarity : a.similarity - b.similarity;
      }
      const aFile = a.fileA.toLowerCase();
      const bFile = b.fileA.toLowerCase();
      return sortOrder === 'desc' ? bFile.localeCompare(aFile) : aFile.localeCompare(bFile);
    });

    return filtered;
  }, [pairs, searchTerm, riskFilter, sortBy, sortOrder]);

  const paginatedPairs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedPairs.slice(start, start + itemsPerPage);
  }, [filteredAndSortedPairs, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedPairs.length / itemsPerPage);

  const openDiff = (pair: SuspectPair) =>
    router.push(
      `/results/${jobId}/diff?fileA=${encodeURIComponent(pair.fileA)}&fileB=${encodeURIComponent(pair.fileB)}`
    );

  const toggleSort = (key: 'similarity' | 'fileName') => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ k }: { k: 'similarity' | 'fileName' }) =>
    sortBy === k ? (
      sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
    ) : null;

  const filters: { id: Risk; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'high', label: 'High' },
    { id: 'medium', label: 'Medium' },
    { id: 'low', label: 'Low' },
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="relative md:max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-tertiary)]" />
          <Input
            placeholder="Search by filename..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9"
          />
        </div>
        <div className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--card)] p-1 self-start">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setRiskFilter(f.id);
                setCurrentPage(1);
              }}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                riskFilter === f.id
                  ? 'btn-brand'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {f.label}
              <span className="ml-1.5 tabular-nums opacity-70">{counts[f.id]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]/60 text-xs uppercase tracking-wider text-[var(--color-text-tertiary)]">
                <th className="px-4 py-3 text-left font-medium w-12">#</th>
                <th className="px-4 py-3 text-left font-medium">
                  <button type="button" className="inline-flex items-center gap-1 hover:text-[var(--color-text-primary)]" onClick={() => toggleSort('fileName')}>
                    Files <SortIcon k="fileName" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-medium w-56">
                  <button type="button" className="inline-flex items-center gap-1 hover:text-[var(--color-text-primary)]" onClick={() => toggleSort('similarity')}>
                    Similarity <SortIcon k="similarity" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-medium w-28">Risk</th>
                <th className="px-4 py-3 w-28" />
              </tr>
            </thead>
            <tbody>
              {paginatedPairs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-[var(--color-text-tertiary)]">
                    No pairs match your filters.
                  </td>
                </tr>
              )}
              {paginatedPairs.map((pair, index) => {
                const r = riskStyles[pair.riskLevel] ?? riskStyles.low;
                return (
                  <tr
                    key={`${pair.fileA}-${pair.fileB}`}
                    className="group border-b last:border-b-0 border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)] cursor-pointer transition-colors"
                    onClick={() => openDiff(pair)}
                  >
                    <td className="px-4 py-3.5 text-sm tabular-nums text-[var(--color-text-tertiary)]">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="px-4 py-3.5 text-sm">
                      <div className="font-mono font-medium text-[var(--color-text-primary)] truncate max-w-[280px]">
                        {pair.fileA}
                      </div>
                      <div className="font-mono text-xs text-[var(--color-text-tertiary)] truncate max-w-[280px]">
                        vs {pair.fileB}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className={`w-14 text-sm font-semibold tabular-nums ${r.text}`}>
                          {pair.similarity.toFixed(1)}%
                        </span>
                        <div className="h-1.5 flex-1 rounded-full bg-[var(--color-bg-tertiary)] overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${Math.min(pair.similarity, 100)}%`, background: r.bar }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${r.chip}`}>
                        {pair.riskLevel}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-accent-primary)] opacity-70 group-hover:opacity-100 transition-opacity">
                        Compare
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Showing {(currentPage - 1) * itemsPerPage + 1}–
            {Math.min(currentPage * itemsPerPage, filteredAndSortedPairs.length)} of{' '}
            {filteredAndSortedPairs.length} pairs
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 text-sm tabular-nums text-[var(--color-text-secondary)]">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
