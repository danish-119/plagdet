import { Logo } from '@/components/logo';

export function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] mt-16">
      <div className="container mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Logo className="h-6 w-6" />
          <span className="text-sm font-medium text-[var(--color-text-primary)]">PlagDet</span>
        </div>
        <p className="text-xs text-[var(--color-text-tertiary)]">
          Parallel plagiarism detection for source code. Nothing is stored beyond one hour.
        </p>
      </div>
    </footer>
  );
}
