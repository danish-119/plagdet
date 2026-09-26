'use client';

import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { SIMILARITY_BUCKETS, RISK_LEVELS } from '@/lib/constants';
import { SuspectPair } from '@/lib/types';

interface SimilarityChartProps {
  pairs: SuspectPair[];
}

function bucketColor(min: number) {
  // classify each 10% bucket by its midpoint
  const mid = min + 5;
  if (mid >= RISK_LEVELS.high.min) return RISK_LEVELS.high.color;
  if (mid >= RISK_LEVELS.medium.min) return RISK_LEVELS.medium.color;
  return RISK_LEVELS.low.color;
}

export function SimilarityChart({ pairs }: SimilarityChartProps) {
  const distribution = SIMILARITY_BUCKETS.map((bucket) => ({
    range: bucket.range,
    count: pairs.filter(
      (pair) =>
        pair.similarity >= bucket.min &&
        (pair.similarity < bucket.max || (bucket.max === 100 && pair.similarity <= 100))
    ).length,
    fill: bucketColor(bucket.min),
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      return (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--card)] px-3 py-2 shadow-lg">
          <p className="text-xs font-mono text-[var(--color-text-tertiary)]">{payload[0].payload.range}</p>
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">
            {payload[0].value} {payload[0].value === 1 ? 'pair' : 'pairs'}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="surface p-5 sm:p-6">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={distribution} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="range"
            stroke="var(--color-text-tertiary)"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            stroke="var(--color-text-tertiary)"
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            tick={{ fontSize: 11 }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-bg-tertiary)', opacity: 0.5 }} />
          <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={44}>
            {distribution.map((entry) => (
              <Cell key={entry.range} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 justify-center text-xs text-[var(--color-text-secondary)]">
        {[
          { c: RISK_LEVELS.high.color, l: 'High (≥85%)' },
          { c: RISK_LEVELS.medium.color, l: 'Medium (60–84%)' },
          { c: RISK_LEVELS.low.color, l: 'Low (<60%)' },
        ].map(({ c, l }) => (
          <span key={l} className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c }} />
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}
