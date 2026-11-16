import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { appsQuery, summaryQuery, type Scope } from "../api";
import { MODE_LABELS } from "../format";
import { ErrorState } from "./States";

function Card({ label, value, sub, danger = false }: {
  label: string;
  value: ReactNode;
  sub: ReactNode;
  danger?: boolean;
}) {
  return (
    <div className="rounded-tt border border-line bg-panel px-4 pt-4 pb-3.5">
      <div className="text-[11px] font-medium uppercase tracking-[0.02em] text-ink">{label}</div>
      <div className={"mt-2 text-[34px] leading-none font-medium " + (danger ? "text-danger" : "text-ink")}>
        {value}
      </div>
      <div className="mt-3 text-[11px] text-faint">{sub}</div>
    </div>
  );
}

const pending = <span className="text-faint">…</span>;

export default function StatCards({ scope }: { scope: Scope }) {
  const summary = useQuery(summaryQuery(scope));
  const apps = useQuery(appsQuery());

  if (summary.isError) {
    return <ErrorState error={summary.error} onRetry={() => void summary.refetch()} />;
  }

  const s = summary.data;
  const riskyCount = apps.data?.apps.filter((a) => a.risky).length;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card label="Sign-ins" value={s ? s.signin_count : pending} sub={s ? `${s.user_count} users` : " "} />
      <Card
        label="Alerts"
        value={s ? s.alert_count : pending}
        sub={s ? MODE_LABELS[s.mode] : " "}
        danger={!!s && s.alert_count > 0}
      />
      <Card
        label="Users with alerts"
        value={s ? s.users_with_alerts : pending}
        sub={s ? `of ${s.user_count}` : " "}
      />
      <Card
        label="OAuth apps"
        value={s ? s.app_count : pending}
        sub={
          apps.isError ? (
            <span className="text-danger">apps unavailable</span>
          ) : riskyCount === undefined ? (
            " "
          ) : (
            `${riskyCount} risky`
          )
        }
      />
    </div>
  );
}
