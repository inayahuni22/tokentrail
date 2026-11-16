import { Fragment, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { appsQuery } from "../api";
import { formatDate, formatTime } from "../format";
import type { Alert, Baseline, SignIn, UserDetail } from "../types";
import { OffBaseline, ReasonPill, ScorePill, SessionChip } from "./Pills";
import { Empty } from "./States";

export const alertKey = (r: { timestamp: string; session_id: string }) => `${r.timestamp}|${r.session_id}`;

/** Show a value plainly, or ochre-underlined when it isn't in the given baseline list. */
export function BaselineValue({ value, known }: { value: string; known: string[] | undefined }) {
  if (known && !known.includes(value)) return <OffBaseline>{value}</OffBaseline>;
  return <>{value}</>;
}

export function ReasonLine({ alert }: { alert: Alert }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {alert.score !== undefined ? <ScorePill score={alert.score} /> : null}
      {alert.reasons.map((r) => (
        <ReasonPill key={r}>{r}</ReasonPill>
      ))}
    </div>
  );
}

// Fixed column widths keep every row aligned across day groups.
const COLS = "grid grid-cols-[52px_150px_128px_36px_190px_170px_minmax(190px,1fr)] items-center gap-x-3";

function Row({ s, alert, baseline, sharedSession, appName }: {
  s: SignIn;
  alert: Alert | undefined;
  baseline: Baseline;
  sharedSession: boolean;
  appName: string;
}) {
  return (
    <div
      className={
        "border-l-2 px-4 " +
        (alert ? "border-danger bg-danger-row py-1.5" : "border-transparent py-[7px]")
      }
    >
      <div className={COLS + " text-[12px]"}>
        <span className="font-mono text-[11.5px] text-muted">{formatTime(s.timestamp)}</span>
        <span className="truncate text-ink">{appName}</span>
        <span className="font-mono text-[11.5px] text-ink">{s.ip}</span>
        <span className="font-mono text-[11.5px] text-ink">
          <BaselineValue value={s.country} known={baseline.countries} />
        </span>
        <span className="truncate font-mono text-[11.5px] text-ink">
          <BaselineValue value={s.asn} known={baseline.asns} />
        </span>
        <span className="truncate font-mono text-[11.5px] text-ink">
          <BaselineValue value={s.device_id} known={baseline.devices} />
        </span>
        <span className="truncate font-mono text-[11px]">
          {sharedSession ? (
            <SessionChip>{s.session_id}</SessionChip>
          ) : (
            <span className="text-faint">{s.session_id}</span>
          )}
        </span>
      </div>
      {alert ? (
        <div className="mt-1.5 mb-1">
          <ReasonLine alert={alert} />
        </div>
      ) : null}
    </div>
  );
}

export default function Timeline({ detail }: { detail: UserDetail }) {
  const apps = useQuery(appsQuery());

  const { days, alertsByKey, sessionCounts } = useMemo(() => {
    const alertsByKey = new Map(detail.alerts.map((a) => [alertKey(a), a]));
    const sessionCounts = new Map<string, number>();
    for (const s of detail.signins) sessionCounts.set(s.session_id, (sessionCounts.get(s.session_id) ?? 0) + 1);

    const sorted = [...detail.signins].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const days = new Map<number, SignIn[]>();
    for (const s of sorted) {
      const list = days.get(s.day);
      if (list) list.push(s);
      else days.set(s.day, [s]);
    }
    return { days: [...days.entries()], alertsByKey, sessionCounts };
  }, [detail]);

  const appNames = useMemo(() => new Map(apps.data?.apps.map((a) => [a.id, a.name])), [apps.data]);

  // Open scrolled to the bottom (most recent day). UserDetail remounts this component on every
  // user/seed/mode change, so this runs fresh each time. While pinned, a ResizeObserver keeps it
  // at the bottom as late content (app names, web fonts) changes the height; any manual
  // interaction with the box unpins it.
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  const hasRows = detail.signins.length > 0;

  useLayoutEffect(() => {
    pinned.current = true;
    const box = scrollRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [detail]);

  useEffect(() => {
    const box = scrollRef.current;
    const content = contentRef.current;
    if (!box || !content) return;
    const toBottom = () => {
      if (pinned.current) box.scrollTop = box.scrollHeight;
    };
    const unpin = () => {
      pinned.current = false;
    };
    const ro = new ResizeObserver(toBottom);
    ro.observe(content);
    const events = ["wheel", "touchstart", "pointerdown", "keydown"] as const;
    events.forEach((e) => box.addEventListener(e, unpin, { passive: true }));
    return () => {
      ro.disconnect();
      events.forEach((e) => box.removeEventListener(e, unpin));
    };
  }, [hasRows]);

  if (!hasRows) return <Empty message="No sign-ins for this user." />;

  return (
    <div ref={scrollRef} tabIndex={0} className="mb-2 max-h-[520px] overflow-auto border-t border-line">
      <div ref={contentRef} className="min-w-[1000px] pb-2">
        {days.map(([day, rows]) => (
          <Fragment key={day}>
            <div className="px-4 pt-3 pb-1 font-mono text-[10.5px] tracking-[0.04em] text-faint">
              DAY {day} · {rows[0] ? formatDate(rows[0].timestamp) : ""}
            </div>
            {rows.map((s) => (
              <Row
                key={alertKey(s) + s.app}
                s={s}
                alert={alertsByKey.get(alertKey(s))}
                baseline={detail.baseline}
                sharedSession={(sessionCounts.get(s.session_id) ?? 0) > 1}
                appName={appNames.get(s.app) ?? s.app}
              />
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
