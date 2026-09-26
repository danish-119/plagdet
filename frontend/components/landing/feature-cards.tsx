import { Zap, Shield, Eye, FileText, GitCompare, Layers } from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'Fast on big batches',
    description: 'Only files that look alike are compared in detail, so hundreds of submissions finish in seconds.',
  },
  {
    icon: Shield,
    title: 'Rename-proof',
    description: 'Variable and function renaming is neutralised at the lexer. Only the structure of the logic matters.',
  },
  {
    icon: Eye,
    title: 'Live progress',
    description: 'Watch every phase stream in real time, from lexing to scoring. No black box, no spinner.',
  },
  {
    icon: GitCompare,
    title: 'Line-level evidence',
    description: 'A synced side-by-side diff highlights the exact matching ranges with confidence levels.',
  },
  {
    icon: Layers,
    title: 'Tunable detection',
    description: 'Adjust k-gram size, signature length, bands and threshold to trade recall for precision.',
  },
  {
    icon: FileText,
    title: 'One-click PDF report',
    description: 'Export a clean report of every suspect pair to attach to an academic-integrity case.',
  },
];

export function FeatureCards() {
  return (
    <section id="features" className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="eyebrow mb-3">Why PlagDet</p>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--color-text-primary)] text-balance">
            Everything you need to review a batch, nothing you don&apos;t
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="surface surface-hover p-7 group">
              <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-accent-primary)_14%,transparent)] text-[var(--color-accent-primary)] transition-transform group-hover:scale-110">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">{title}</h3>
              <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
