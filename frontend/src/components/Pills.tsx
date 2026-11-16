import type { ReactNode } from "react";

/** Red reason pill, e.g. "unknown device". */
export function ReasonPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block rounded-tt bg-danger-pill px-1.5 py-[2px] text-[11px] leading-[14px] text-danger">
      {children}
    </span>
  );
}

/** Solid red "score N" pill (scored modes only). */
export function ScorePill({ score }: { score: number }) {
  return (
    <span className="inline-block rounded-tt bg-danger px-1.5 py-[2px] font-mono text-[11px] leading-[14px] text-panel">
      score {score}
    </span>
  );
}

/** Neutral mono chip: baseline values, scopes. `danger` for high-risk scopes. */
export function Chip({ children, danger = false }: { children: ReactNode; danger?: boolean }) {
  return (
    <span
      className={
        "inline-block rounded-tt border px-1.5 py-[2px] font-mono text-[11px] leading-[14px] " +
        (danger ? "border-danger/40 bg-danger-pill text-danger" : "border-line bg-raised text-ink")
      }
    >
      {children}
    </span>
  );
}

/** Blue chip for a session id seen on more than one row. */
export function SessionChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block rounded-tt bg-session-chip px-1.5 py-[1px] font-mono text-[11px] text-session">
      {children}
    </span>
  );
}

/** Outlined ochre tag, e.g. "privileged". */
export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block rounded-tt border border-warning px-1 text-[10px] leading-[14px] text-warning">
      {children}
    </span>
  );
}

/** Small square alert-count badge in the users list. */
export function CountBadge({ count }: { count: number }) {
  return (
    <span
      className={
        "inline-flex h-[18px] min-w-[22px] items-center justify-center rounded-tt px-1 font-mono text-[11px] " +
        (count > 0 ? "bg-danger-pill text-danger" : "bg-raised text-muted")
      }
    >
      {count}
    </span>
  );
}

/** Ochre underlined value: outside the user's baseline. */
export function OffBaseline({ children }: { children: ReactNode }) {
  return <span className="text-warning underline underline-offset-2">{children}</span>;
}

/** Section label in caps, e.g. "USERS", "SIGN-IN TIMELINE". */
export function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="text-[11px] font-medium uppercase tracking-[0.02em] text-ink">{children}</div>;
}
