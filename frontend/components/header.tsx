'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { useThemeKeyboardShortcut } from '@/hooks/use-theme-keyboard-shortcut';

export function Header() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useThemeKeyboardShortcut();

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isDark = resolvedTheme === 'dark';

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 glass transition-colors border-b ${
        scrolled ? 'border-[var(--color-border)]' : 'border-transparent'
      }`}
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <Logo className="h-8 w-8 transition-transform group-hover:rotate-6" />
          <span className="text-lg font-semibold tracking-tight text-[var(--color-text-primary)]">
            Plag<span className="text-gradient">Det</span>
          </span>
        </Link>

        <nav className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            title="Toggle theme (Ctrl+Shift+D)"
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] rounded-full"
          >
            {mounted && isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            <span className="sr-only">Toggle theme</span>
          </Button>
          <Button asChild size="sm" className="btn-brand rounded-full px-4 border-0">
            <Link href="/upload">
              New Analysis
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
