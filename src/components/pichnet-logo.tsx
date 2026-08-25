export function PichnetLogo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <svg viewBox="0 0 40 40" className="h-full w-auto" aria-hidden="true">
        <rect x="1" y="1" width="38" height="38" rx="8" fill="var(--pichnet-black)" />
        <rect x="1" y="1" width="38" height="38" rx="8" fill="none" stroke="var(--pichnet-yellow)" strokeWidth="1.5" />
        <path d="M8 30V10h9a6 6 0 0 1 0 12h-4" fill="none" stroke="var(--pichnet-white)" strokeWidth="3" strokeLinecap="round" />
        <circle cx="29" cy="14" r="3" fill="var(--pichnet-magenta)" />
        <circle cx="29" cy="26" r="3" fill="var(--pichnet-green)" />
      </svg>
      <span className="flex flex-col leading-none">
        <span className="text-sm font-extrabold tracking-tight text-foreground">PICHNET</span>
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-accent">
          Miss &amp; Master 2026
        </span>
      </span>
    </span>
  );
}
