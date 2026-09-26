export function Logo({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="plagdet-g" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5b5bf0" />
          <stop offset="0.55" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#0ea5c6" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#plagdet-g)" />
      <path d="M11 9 7 16l4 7M21 9l4 7-4 7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17.5 10.5 14.5 21.5" stroke="#fff" strokeOpacity="0.75" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
