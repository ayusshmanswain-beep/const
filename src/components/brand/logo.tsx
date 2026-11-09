export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="2.75" y="2.75" width="26.5" height="26.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2.75 21.5H10.5V29.25" fill="none" stroke="#AA8A61" strokeWidth="1.5" />
      <rect x="13" y="13" width="6" height="6" fill="currentColor" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="text-[13px] font-medium tracking-[0.16em] text-ink">
      CONSTRUCT<span className="text-accent">360</span>
    </span>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5 text-ink">
      <Mark />
      {compact ? <span className="sr-only">CONSTRUCT360</span> : <Wordmark />}
    </span>
  );
}
