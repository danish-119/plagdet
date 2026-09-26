import Link from 'next/link';
import { ArrowRight, FileText, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

const leftCode = [
  'int sum_array(int *a, int n) {',
  '  int total = 0;',
  '  for (int i = 0; i < n; i++) {',
  '    total += a[i];',
  '  }',
  '  return total;',
  '}',
];
const rightCode = [
  'int add_all(int *values, int len) {',
  '  int acc = 0;',
  '  for (int k = 0; k < len; k++) {',
  '    acc += values[k];',
  '  }',
  '  return acc;',
  '}',
];

function CodePane({ name, lines }: { name: string; lines: string[] }) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
        <span className="h-2 w-2 rounded-full bg-[var(--color-danger)]/70" />
        <span className="h-2 w-2 rounded-full bg-[var(--color-warning)]/70" />
        <span className="h-2 w-2 rounded-full bg-[var(--color-success)]/70" />
        <span className="ml-2 font-mono text-[11px] text-[var(--color-text-tertiary)] truncate">{name}</span>
      </div>
      <pre className="p-3 font-mono text-[11px] leading-6 text-[var(--color-text-secondary)] overflow-hidden text-left">
        {lines.map((l, i) => (
          <div
            key={i}
            className="px-2 -mx-2 rounded-sm whitespace-pre"
            style={
              i > 0 && i < 6
                ? {
                    background: 'color-mix(in srgb, var(--color-danger) 14%, transparent)',
                    boxShadow: 'inset 3px 0 0 var(--color-danger)',
                  }
                : undefined
            }
          >
            {l}
          </div>
        ))}
      </pre>
    </div>
  );
}

function Gauge({ value }: { value: number }) {
  return (
    <div
      className="relative h-20 w-20 rounded-full grid place-items-center"
      style={{
        background: `conic-gradient(var(--color-danger) ${value * 3.6}deg, var(--color-bg-tertiary) 0)`,
      }}
    >
      <div className="absolute inset-[7px] rounded-full bg-[var(--card)]" />
      <span className="relative text-lg font-semibold tabular-nums text-[var(--color-text-primary)]">{value}%</span>
    </div>
  );
}

export function HeroSection() {
  return (
    <section className="noise relative overflow-hidden min-h-svh flex items-center pt-28 pb-20 px-4">
      {/* Layered background */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, color-mix(in srgb, var(--color-accent-primary) 12%, var(--color-bg-primary)) 0%, var(--color-bg-primary) 75%)',
          }}
        />
        <div className="blob blob-a -top-24 -left-24 h-[460px] w-[460px] opacity-60" style={{ background: '#6366f1' }} />
        <div className="blob blob-b top-10 right-[-6%] h-[420px] w-[420px] opacity-45" style={{ background: '#22d3ee' }} />
        <div className="blob blob-a bottom-[-12%] left-[38%] h-[380px] w-[380px] opacity-40" style={{ background: '#a855f7' }} />
        <div className="dot-grid absolute inset-0" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[var(--color-bg-primary)]" />
      </div>

      <div className="w-full max-w-7xl mx-auto grid lg:grid-cols-[1.05fr_1fr] gap-14 items-center">
        {/* Copy */}
        <div className="text-center lg:text-left">
          <h1
            className="animate-fade-up text-5xl sm:text-6xl xl:text-7xl font-semibold tracking-tight leading-[1.04] text-[var(--color-text-primary)] text-balance"
          >
            Catch copied code <span className="text-gradient">before it&apos;s graded.</span>
          </h1>

          <p
            className="animate-fade-up mt-6 text-lg sm:text-xl text-[var(--color-text-secondary)] max-w-xl mx-auto lg:mx-0 text-balance"
            style={{ animationDelay: '100ms' }}
          >
            Upload a whole class of C, C++ or Python submissions. PlagDet compares thousands of files in seconds and
            shows you exactly which lines match.
          </p>

          <div
            className="animate-fade-up mt-9 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3"
            style={{ animationDelay: '200ms' }}
          >
            <Button asChild size="lg" className="btn-brand rounded-full h-12 px-8 text-base border-0">
              <Link href="/upload">
                Start New Analysis
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full h-12 px-7 text-base bg-[var(--card)]/60 backdrop-blur"
            >
              <Link href="#how-it-works">See how it works</Link>
            </Button>
          </div>
        </div>

        {/* Composed product visual */}
        <div className="animate-fade-up relative mx-auto w-full max-w-xl lg:max-w-none" style={{ animationDelay: '250ms' }}>
          <div
            className="absolute -inset-10 -z-10 rounded-full blur-3xl"
            style={{ background: 'var(--gradient-brand)', opacity: 0.22 }}
          />

          {/* main diff card */}
          <div className="surface overflow-hidden lg:rotate-[-2deg] lg:translate-x-2">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-mono text-xs text-[var(--color-text-tertiary)]">student_a.c</span>
                <span className="text-[var(--color-text-tertiary)]">vs</span>
                <span className="font-mono text-xs text-[var(--color-text-tertiary)]">student_b.c</span>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-[color-mix(in_srgb,var(--color-danger)_16%,transparent)] text-[var(--color-danger)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-danger)]" />
                94.2% match
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:divide-x divide-[var(--color-border)]">
              <CodePane name="student_a.c" lines={leftCode} />
              <CodePane name="student_b.c" lines={rightCode} />
            </div>
          </div>

          {/* floating: similarity gauge */}
          <div className="float-slow surface absolute -top-16 right-2 sm:-right-4 p-3 flex items-center gap-3 shadow-2xl">
            <Gauge value={94} />
            <div className="pr-1">
              <p className="text-[11px] uppercase tracking-wider text-[var(--color-text-tertiary)]">Similarity</p>
              <p className="text-sm font-semibold text-[var(--color-danger)]">High risk</p>
            </div>
          </div>

          {/* floating: pipeline */}
          <div className="float-mid surface absolute -bottom-20 -left-2 sm:-left-6 w-56 p-3.5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-[var(--color-text-primary)]">Analysing 412 files</p>
              <span className="font-mono text-[11px] text-[var(--color-accent-primary)]">72%</span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--color-bg-tertiary)] overflow-hidden mb-3">
              <div className="h-full w-[72%] rounded-full" style={{ background: 'var(--gradient-brand)' }} />
            </div>
            <ul className="space-y-1.5 text-[11px] text-[var(--color-text-secondary)]">
              {['Lexing', 'Hashing', 'Bucketing'].map((s) => (
                <li key={s} className="flex items-center gap-2">
                  <Check className="h-3 w-3 text-[var(--color-success)]" /> {s}
                </li>
              ))}
              <li className="flex items-center gap-2 text-[var(--color-text-primary)] font-medium">
                <span className="h-2 w-2 rounded-full bg-[var(--color-accent-primary)] animate-pulse ml-0.5 mr-0.5" />
                Scoring pairs
              </li>
            </ul>
          </div>

          {/* floating: pdf chip */}
          <div className="float-slow surface absolute -bottom-12 right-4 hidden sm:flex items-center gap-2 px-3.5 py-2.5 shadow-2xl">
            <FileText className="h-4 w-4 text-[var(--color-accent-primary)]" />
            <span className="text-xs font-semibold text-[var(--color-text-primary)]">report.pdf</span>
          </div>
        </div>
      </div>
    </section>
  );
}
