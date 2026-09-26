import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center gap-1.5 text-sm mb-6 min-w-0" aria-label="Breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <div key={index} className="flex items-center gap-1.5 min-w-0">
            {index > 0 && <ChevronRight className="h-3.5 w-3.5 text-[var(--color-text-tertiary)] shrink-0" />}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-[var(--color-text-primary)] font-medium truncate" aria-current="page">
                {item.label}
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
