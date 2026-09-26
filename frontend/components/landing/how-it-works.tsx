import { UploadCloud, Code2, Hash, Boxes, ScanSearch } from 'lucide-react';

const steps = [
  { icon: UploadCloud, title: 'Upload', body: 'Drop a folder or .zip of submissions for one language.' },
  { icon: Code2, title: 'Lex', body: 'Code is tokenised and normalised in parallel worker processes.' },
  { icon: Hash, title: 'Hash', body: 'K-grams become compact MinHash signatures via a native C kernel.' },
  { icon: Boxes, title: 'Bucket', body: 'LSH bands group similar signatures, pruning almost every pair.' },
  { icon: ScanSearch, title: 'Score', body: 'Candidates get an exact Jaccard score and matched line ranges.' },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="py-24 px-4 border-y border-[var(--color-border)] bg-[var(--color-bg-secondary)]/50"
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="eyebrow mb-3">The pipeline</p>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--color-text-primary)] text-balance">
            From a folder of files to ranked suspects
          </h2>
        </div>
        <ol className="grid gap-4 md:grid-cols-5">
          {steps.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="surface p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="btn-brand inline-flex h-9 w-9 items-center justify-center rounded-lg">
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="font-mono text-xs text-[var(--color-text-tertiary)]">0{i + 1}</span>
              </div>
              <h3 className="font-semibold text-[var(--color-text-primary)] mb-1.5">{title}</h3>
              <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
