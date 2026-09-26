import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CtaSection() {
  return (
    <section className="py-24 px-4">
      <div className="relative max-w-4xl mx-auto surface overflow-hidden text-center px-6 py-16">
        <div className="aurora absolute inset-0 opacity-70 pointer-events-none" />
        <div className="relative">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--color-text-primary)] text-balance">
            Ready to check your next batch?
          </h2>
          <p className="mt-4 text-[var(--color-text-secondary)] max-w-xl mx-auto">
            It takes about a minute. Files are processed in memory and deleted automatically after an hour.
          </p>
          <Button asChild size="lg" className="btn-brand rounded-full h-12 px-8 text-base border-0 mt-8">
            <Link href="/upload">
              Start New Analysis
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
