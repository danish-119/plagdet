import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="relative min-h-[80vh] flex items-center justify-center px-4 pt-16 overflow-hidden">
      <div className="aurora absolute inset-x-0 top-0 h-96 -z-10 opacity-70" />
      <div className="max-w-md w-full text-center">
        <p className="text-8xl font-semibold tracking-tight text-gradient mb-2">404</p>
        <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-3">Page not found</h1>
        <p className="text-[var(--color-text-secondary)] mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <Button asChild className="btn-brand rounded-full border-0 px-6">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </Button>
      </div>
    </div>
  );
}
