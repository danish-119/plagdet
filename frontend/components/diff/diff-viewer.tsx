'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomOneDark, atomOneLight } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import type { MatchedRange } from '@/lib/types';
// Register languages
import c from 'react-syntax-highlighter/dist/esm/languages/hljs/c';
import cpp from 'react-syntax-highlighter/dist/esm/languages/hljs/cpp';
import python from 'react-syntax-highlighter/dist/esm/languages/hljs/python';

SyntaxHighlighter.registerLanguage('c', c);
SyntaxHighlighter.registerLanguage('cpp', cpp);
SyntaxHighlighter.registerLanguage('python', python);

interface DiffViewerProps {
  fileA: string;
  contentA: string;
  fileB: string;
  contentB: string;
  language: string;
  matchedRanges?: {
    fileA: MatchedRange[];
    fileB: MatchedRange[];
  };
}

const languageMap: Record<string, string> = {
  c: 'c',
  cpp: 'cpp',
  python: 'python',
};

type MatchConfidence = 'high' | 'partial';

interface MatchBlock {
  index: number;
  fileA?: MatchedRange;
  fileB?: MatchedRange;
}

function getLineConfidence(lineNumber: number, ranges: MatchedRange[]): MatchConfidence | null {
  for (const range of ranges) {
    if (lineNumber >= range.startLine && lineNumber <= range.endLine) {
      return range.confidence;
    }
  }

  return null;
}

function getMatchBlocks(matchedRanges?: DiffViewerProps['matchedRanges']): MatchBlock[] {
  if (!matchedRanges) {
    return [];
  }

  const maxLength = Math.max(matchedRanges.fileA.length, matchedRanges.fileB.length);
  return Array.from({ length: maxLength }, (_, index) => ({
    index,
    fileA: matchedRanges.fileA[index],
    fileB: matchedRanges.fileB[index],
  })).filter((block) => block.fileA || block.fileB);
}

export function DiffViewer({
  fileA,
  contentA,
  fileB,
  contentB,
  language,
  matchedRanges,
}: DiffViewerProps) {
  const { theme } = useTheme();
  const [syncScroll, setSyncScroll] = useState(true);
  const [currentMatch, setCurrentMatch] = useState(0);
  const containerARef = useRef<HTMLDivElement>(null);
  const containerBRef = useRef<HTMLDivElement>(null);
  const matchBlocks = useMemo(() => getMatchBlocks(matchedRanges), [matchedRanges]);
  const lineMatchesA = useMemo(() => {
    const map = new Map<number, MatchConfidence>();

    for (const range of matchedRanges?.fileA ?? []) {
      for (let lineNumber = range.startLine; lineNumber <= range.endLine; lineNumber += 1) {
        const existing = map.get(lineNumber);
        if (existing === 'high' || range.confidence === 'partial') {
          map.set(lineNumber, existing ?? range.confidence);
        } else {
          map.set(lineNumber, range.confidence);
        }
      }
    }

    return map;
  }, [matchedRanges]);
  const lineMatchesB = useMemo(() => {
    const map = new Map<number, MatchConfidence>();

    for (const range of matchedRanges?.fileB ?? []) {
      for (let lineNumber = range.startLine; lineNumber <= range.endLine; lineNumber += 1) {
        const existing = map.get(lineNumber);
        if (existing === 'high' || range.confidence === 'partial') {
          map.set(lineNumber, existing ?? range.confidence);
        } else {
          map.set(lineNumber, range.confidence);
        }
      }
    }

    return map;
  }, [matchedRanges]);

  // Handle synchronized scrolling
  const handleScroll = (source: 'a' | 'b') => {
    if (!syncScroll) return;

    const sourceEl = source === 'a' ? containerARef.current : containerBRef.current;
    const targetEl = source === 'a' ? containerBRef.current : containerARef.current;

    if (sourceEl && targetEl) {
      const scrollPercentage =
        sourceEl.scrollTop / (sourceEl.scrollHeight - sourceEl.clientHeight);
      targetEl.scrollTop = scrollPercentage * (targetEl.scrollHeight - targetEl.clientHeight);
    }
  };

  // REQ-DIFF-08: matched k-gram blocks highlight per line with confidence-specific styling.
  const getLineStyle = (lineNumber: number, ranges: MatchedRange[] | undefined) => {
    const confidence = getLineConfidence(lineNumber, ranges ?? []);

    if (confidence === 'high') {
      return {
        display: 'flex',
        alignItems: 'center',
        paddingLeft: '8px',
        backgroundColor: 'color-mix(in srgb, var(--color-danger) 22%, transparent)',
        borderLeft: '3px solid var(--color-danger)',
      };
    }

    if (confidence === 'partial') {
      return {
        display: 'flex',
        alignItems: 'center',
        paddingLeft: '8px',
        backgroundColor: 'color-mix(in srgb, var(--color-warning) 20%, transparent)',
        borderLeft: '3px solid color-mix(in srgb, var(--color-warning) 70%, transparent)',
      };
    }

    return {
      display: 'flex',
      alignItems: 'center',
      paddingLeft: '8px',
    };
  };

  const scrollToMatch = (direction: 'previous' | 'next') => {
    if (matchBlocks.length === 0) {
      return;
    }

    const nextIndex =
      direction === 'next'
        ? (currentMatch + 1) % matchBlocks.length
        : (currentMatch - 1 + matchBlocks.length) % matchBlocks.length;

    setCurrentMatch(nextIndex);

    const block = matchBlocks[nextIndex];
    const lineHeight = 24;

    const scrollTarget = (container: HTMLDivElement | null, range?: MatchedRange) => {
      if (!container || !range) {
        return;
      }

      const top = Math.max((range.startLine - 1) * lineHeight - lineHeight, 0);
      container.scrollTo({ top, behavior: 'smooth' });
    };

    scrollTarget(containerARef.current, block.fileA);
    scrollTarget(containerBRef.current, block.fileB);
  };

  const hlLanguage = languageMap[language] || 'text';
  const linesA = contentA.split('\n');
  const linesB = contentB.split('\n');
  const highlighterStyle = theme === 'dark' ? atomOneDark : atomOneLight;
  const hasMatches = matchBlocks.length > 0;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="surface flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <label className="flex items-center gap-2.5 text-sm font-medium text-[var(--color-text-primary)]">
            <Switch checked={syncScroll} onCheckedChange={setSyncScroll} />
            Sync scroll
          </label>
          <div className="flex items-center gap-4 text-xs text-[var(--color-text-secondary)]">
            {hasMatches ? (
              <>
                <span className="inline-flex items-center gap-2">
                  <span
                    className="h-3.5 w-3.5 rounded-sm"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--color-danger) 25%, transparent)',
                      borderLeft: '3px solid var(--color-danger)',
                    }}
                  />
                  High confidence
                </span>
                <span className="inline-flex items-center gap-2">
                  <span
                    className="h-3.5 w-3.5 rounded-sm"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--color-warning) 30%, transparent)',
                      borderLeft: '3px solid var(--color-warning)',
                    }}
                  />
                  Partial
                </span>
              </>
            ) : (
              <span>No matches highlighted</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasMatches && (
            <span className="text-xs tabular-nums text-[var(--color-text-secondary)] mr-1">
              Match {currentMatch + 1} of {matchBlocks.length}
            </span>
          )}
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => scrollToMatch('previous')} disabled={!hasMatches}>
            Previous
          </Button>
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => scrollToMatch('next')} disabled={!hasMatches}>
            Next
          </Button>
        </div>
      </div>

      {/* Side-by-side comparison */}
      <div className="surface grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
        {/* Left Panel */}
        <div className="flex flex-col lg:border-r border-(--color-border)">
          <div className="sticky top-0 bg-(--color-bg-secondary) border-b border-(--color-border) px-4 py-3 z-10">
            <p className="font-mono text-xs font-semibold text-(--color-text-primary) truncate">{fileA}</p>
          </div>
          <div
            ref={containerARef}
            className="flex-1 overflow-y-auto max-h-[32rem]"
            onScroll={() => handleScroll('a')}
          >
            <div className="relative">
              <div className="absolute right-2 top-0 bottom-0 w-2 pointer-events-none">
                {hasMatches &&
                  (matchedRanges?.fileA ?? []).map((range, index) => {
                    const top = `${Math.max(((range.startLine - 1) / Math.max(linesA.length, 1)) * 100, 0)}%`;

                    return (
                      <div
                        key={`${range.startLine}-${range.endLine}-${index}`}
                        className="absolute h-2 w-2 rounded-full"
                        style={{
                          top,
                          backgroundColor:
                            range.confidence === 'high'
                              ? 'var(--color-danger)'
                              : 'var(--color-warning)',
                        }}
                      />
                    );
                  })}
              </div>
              <div className="absolute left-0 top-0 bottom-0 w-12 bg-(--color-bg-secondary) border-r border-(--color-border) flex flex-col items-end pr-2 py-4 text-xs text-(--color-text-tertiary) select-none">
                {linesA.map((_, i) => (
                  <div key={i} className="h-6 flex items-center gap-1">
                    {lineMatchesA.get(i + 1) && (
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{
                          backgroundColor:
                            lineMatchesA.get(i + 1) === 'high'
                              ? 'var(--color-danger)'
                              : 'var(--color-warning)',
                        }}
                        aria-hidden="true"
                      />
                    )}
                    {i + 1}
                  </div>
                ))}
              </div>
              <div className="ml-12">
                <SyntaxHighlighter
                  language={hlLanguage}
                  style={highlighterStyle}
                  showLineNumbers={true}
                  lineNumberStyle={{ display: 'none' }}
                  wrapLines={true}
                  customStyle={{ background: 'transparent', margin: 0, padding: '1rem 0.75rem', fontSize: '0.8rem' }}
                  lineProps={(lineNumber) => ({
                    style: {
                      ...getLineStyle(lineNumber, matchedRanges?.fileA),
                      height: '24px',
                    },
                  })}
                >
                  {contentA}
                </SyntaxHighlighter>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex flex-col">
          <div className="sticky top-0 bg-(--color-bg-secondary) border-b border-(--color-border) px-4 py-3 z-10">
            <p className="font-mono text-xs font-semibold text-(--color-text-primary) truncate">{fileB}</p>
          </div>
          <div
            ref={containerBRef}
            className="flex-1 overflow-y-auto max-h-[32rem]"
            onScroll={() => handleScroll('b')}
          >
            <div className="relative">
              <div className="absolute right-2 top-0 bottom-0 w-2 pointer-events-none">
                {hasMatches &&
                  (matchedRanges?.fileB ?? []).map((range, index) => {
                    const top = `${Math.max(((range.startLine - 1) / Math.max(linesB.length, 1)) * 100, 0)}%`;

                    return (
                      <div
                        key={`${range.startLine}-${range.endLine}-${index}`}
                        className="absolute h-2 w-2 rounded-full"
                        style={{
                          top,
                          backgroundColor:
                            range.confidence === 'high'
                              ? 'var(--color-danger)'
                              : 'var(--color-warning)',
                        }}
                      />
                    );
                  })}
              </div>
              <div className="absolute left-0 top-0 bottom-0 w-12 bg-(--color-bg-secondary) border-r border-(--color-border) flex flex-col items-end pr-2 py-4 text-xs text-(--color-text-tertiary) select-none">
                {linesB.map((_, i) => (
                  <div key={i} className="h-6 flex items-center gap-1">
                    {lineMatchesB.get(i + 1) && (
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{
                          backgroundColor:
                            lineMatchesB.get(i + 1) === 'high'
                              ? 'var(--color-danger)'
                              : 'var(--color-warning)',
                        }}
                        aria-hidden="true"
                      />
                    )}
                    {i + 1}
                  </div>
                ))}
              </div>
              <div className="ml-12">
                <SyntaxHighlighter
                  language={hlLanguage}
                  style={highlighterStyle}
                  showLineNumbers={true}
                  lineNumberStyle={{ display: 'none' }}
                  wrapLines={true}
                  customStyle={{ background: 'transparent', margin: 0, padding: '1rem 0.75rem', fontSize: '0.8rem' }}
                  lineProps={(lineNumber) => ({
                    style: {
                      ...getLineStyle(lineNumber, matchedRanges?.fileB),
                      height: '24px',
                    },
                  })}
                >
                  {contentB}
                </SyntaxHighlighter>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
