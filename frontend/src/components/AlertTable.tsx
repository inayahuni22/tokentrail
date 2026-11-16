import { useMemo, useState } from "react";
import { useQueries, useQuery, type UseQueryResult } from "@tanstack/react-query";
import { appsQuery, userQuery, type Scope } from "../api";
import { formatTime } from "../format";
import type { Alert, AlertsResponse, Baseline } from "../types";
import { BaselineValue, ReasonLine, alertKey } from "./Timeline";
import { Empty, ErrorState, Loading } from "./States";

interface Props {
  query: UseQueryResult<AlertsResponse>;
  scope: Scope;
  userNames: Map<string, string>;
  onOpenUser: (id: string) => void;
}

type SortKey = "timestamp" | "user" | "app" | "ip" | "country" | "asn" | "device_id" | "score";
type Dir = "asc" | "desc";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "timestamp", label: "Time" },
  { key: "user", label: "User" },
  { key: "app", label: "App" },
  { key: "ip", label: "IP" },
  { key: "country", label: "CC" },
  { key: "asn", label: "ASN" },
  { key: "device_id", label: "Device" },
  { key: "score", label: "Score / reasons" },
];

// Time and score read most naturally newest/highest first; text columns A→Z.
const DEFAULT_DIR: Record<SortKey, Dir> = {
  timestamp: "desc",
  score: "desc",
  user: "asc",
  app: "asc",
  ip: "asc",
  country: "asc",
  asn: "asc",
  device_id: "asc",
};

const TH = "px-3 py-2 text-left text-[11px] font-medium uppercase tracking-[0.02em] text-muted";
const TD = "px-3 py-2.5 align-top";

export default function AlertTable({ query, scope, userNames, onOpenUser }: Props) {
  const [sort, setSort] = useState<{ key: SortKey; dir: Dir }>({ key: "timestamp", dir: "desc" });

  const apps = useQuery(appsQuery());
  const appNames = useMemo(() => new Map(apps.data?.apps.map((a) => [a.id, a.name])), [apps.data]);

  // Baselines for the users who appear in alerts (shares cache with the detail panel).
  const alertUsers = useMemo(
    () => [...new Set(query.data?.alerts.map((a) => a.user) ?? [])],
    [query.data],
  );
  const baselineQueries = useQueries({ queries: alertUsers.map((id) => userQuery(id, scope)) });
  const baselines = new Map<string, Baseline>();
  alertUsers.forEach((id, i) => {
    const b = baselineQueries[i]?.data?.baseline;
    if (b) baselines.set(id, b);
  });

  const rows = useMemo(() => {
    if (!query.data) return [];
    // Sort by what's displayed: names for user/app, the full timestamp string for time.
    const value = (a: Alert): string | number => {
      switch (sort.key) {
        case "user":
          return userNames.get(a.user) ?? a.user;
        case "app":
          return appNames.get(a.app) ?? a.app;
        case "score":
          return a.score ?? Number.NEGATIVE_INFINITY;
        default:
          return a[sort.key];
      }
    };
    const sign = sort.dir === "asc" ? 1 : -1;
    return [...query.data.alerts].sort((x, y) => {
      const a = value(x);
      const b = value(y);
      const primary =
        typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b));
      // Ties: newest first.
      return primary !== 0 ? sign * primary : y.timestamp.localeCompare(x.timestamp);
    });
  }, [query.data, sort, userNames, appNames]);

  const onHeaderClick = (key: SortKey) =>
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: DEFAULT_DIR[key] },
    );

  if (query.isPending) return <Loading label="Loading alerts…" />;
  if (query.isError)
    return (
      <div className="p-3">
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      </div>
    );
  if (query.data.alerts.length === 0)
    return <Empty message={`No alerts for seed ${scope.seed} in this mode.`} />;

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] border-collapse">
          <thead className="border-y border-line bg-raised">
            <tr>
              {COLUMNS.map((c, i) => {
                const active = sort.key === c.key;
                return (
                  <th
                    key={c.key}
                    aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                    className={TH + (i === 0 ? " pl-4" : "")}
                  >
                    <button
                      type="button"
                      onClick={() => onHeaderClick(c.key)}
                      className={"uppercase hover:text-ink " + (active ? "text-ink" : "")}
                    >
                      {c.label}
                      {active ? (sort.dir === "asc" ? " ↑" : " ↓") : ""}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => {
              const b = baselines.get(a.user);
              return (
                <tr
                  key={alertKey(a) + a.user}
                  onClick={() => onOpenUser(a.user)}
                  className="cursor-pointer border-l-2 border-danger text-[12px] hover:bg-danger-row"
                >
                  <td className={TD + " pl-4 font-mono text-[11.5px] whitespace-nowrap text-muted"}>
                    D{a.day} {formatTime(a.timestamp)}
                  </td>
                  <td className={TD}>
                    <div className="text-[13px] text-ink">{userNames.get(a.user) ?? a.user}</div>
                    <div className="font-mono text-[10.5px] text-faint">{a.user}</div>
                  </td>
                  <td className={TD + " text-ink"}>{appNames.get(a.app) ?? a.app}</td>
                  <td className={TD + " font-mono text-[11.5px] text-ink"}>{a.ip}</td>
                  <td className={TD + " font-mono text-[11.5px] text-ink"}>
                    <BaselineValue value={a.country} known={b?.countries} />
                  </td>
                  <td className={TD + " font-mono text-[11.5px] whitespace-nowrap text-ink"}>
                    <BaselineValue value={a.asn} known={b?.asns} />
                  </td>
                  <td className={TD + " font-mono text-[11.5px] whitespace-nowrap text-ink"}>
                    <BaselineValue value={a.device_id} known={b?.devices} />
                  </td>
                  <td className={TD + " max-w-[480px]"}>
                    <ReasonLine alert={a} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="border-t border-line px-4 py-3 text-[11px] text-faint">
        Amber = value outside the user's baseline. Click a row to open the user.
      </div>
    </>
  );
}
