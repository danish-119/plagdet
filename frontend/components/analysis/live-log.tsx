'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Terminal } from 'lucide-react';

interface LogEntry {
  timestamp: string;
  message: string;
}

interface LiveLogProps {
  logs: LogEntry[];
}

export function LiveLog({ logs }: LiveLogProps) {
  const [isOpen, setIsOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll the log body only, never the page
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="surface overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-[var(--color-bg-secondary)] transition-colors"
      >
        <span className="flex items-center gap-2.5 text-sm font-semibold text-[var(--color-text-primary)]">
          <Terminal className="h-4 w-4 text-[var(--color-accent-primary)]" />
          Live log
          <span className="font-mono text-xs font-normal text-[var(--color-text-tertiary)]">{logs.length}</span>
        </span>
        <ChevronDown
          className={`h-4 w-4 text-[var(--color-text-secondary)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          ref={scrollRef}
          className="border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-3 font-mono text-xs leading-6 max-h-72 overflow-y-auto"
        >
          {logs.length === 0 ? (
            <p className="text-[var(--color-text-tertiary)]">Waiting for events...</p>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="text-[var(--color-text-secondary)]">
                <span className="text-[var(--color-text-tertiary)]">{log.timestamp}</span>{' '}
                <span className="text-[var(--color-accent-primary)]">›</span> {log.message}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
