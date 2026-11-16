import type { UseQueryResult } from "@tanstack/react-query";
import type { AppsResponse } from "../types";
import { Chip } from "./Pills";
import { Empty, ErrorState, Loading } from "./States";

const TH = "px-3 py-2 text-left text-[11px] font-medium uppercase tracking-[0.02em] text-muted";
const TD = "px-3 py-3 align-top";

export default function AppsTable({ query }: { query: UseQueryResult<AppsResponse> }) {
  if (query.isPending) return <Loading label="Loading apps…" />;
  if (query.isError)
    return (
      <div className="p-3">
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      </div>
    );
  if (query.data.apps.length === 0) return <Empty message="No OAuth apps in this tenant." />;

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] border-collapse">
          <thead className="border-y border-line bg-raised">
            <tr>
              <th className={TH + " w-8"} aria-label="Status" />
              <th className={TH}>App</th>
              <th className={TH}>Publisher</th>
              <th className={TH}>Type</th>
              <th className={TH}>Requested scopes</th>
              <th className={TH}>Risk flags</th>
            </tr>
          </thead>
          <tbody>
            {query.data.apps.map((app) => (
              <tr
                key={app.id}
                className={
                  "border-b border-l-2 border-b-line text-[12px] last:border-b-0 " +
                  (app.risky ? "border-l-danger" : "border-l-transparent")
                }
              >
                <td className={TD + " pl-4"}>
                  <span
                    aria-label={app.risky ? "risky" : "not flagged"}
                    className={"mt-[5px] block h-2 w-2 rounded-full " + (app.risky ? "bg-danger" : "bg-ok")}
                  />
                </td>
                <td className={TD}>
                  <div className="text-[13px] text-ink">{app.name}</div>
                  <div className="font-mono text-[10.5px] text-faint">{app.id}</div>
                </td>
                <td className={TD + " font-mono text-[11.5px] " + (app.publisher_verified ? "text-ok" : "text-danger")}>
                  {app.publisher_verified ? "verified" : "unverified"}
                </td>
                <td className={TD + " font-mono text-[11.5px] text-muted"}>
                  {app.first_party ? "first-party" : "third-party"}
                </td>
                <td className={TD}>
                  <div className="flex flex-wrap gap-1.5">
                    {app.scopes.map((s) => (
                      <Chip key={s} danger={app.high_risk_scopes.includes(s)}>
                        {s}
                      </Chip>
                    ))}
                  </div>
                </td>
                <td className={TD}>
                  {app.risk_flags.length === 0 ? (
                    <span className="text-faint">none</span>
                  ) : (
                    <ul className="space-y-0.5 text-danger">
                      {app.risk_flags.map((f) => (
                        <li key={f}>· {f}</li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-line px-4 py-3 text-[11px] text-faint">
        Red scopes = high-risk scopes requested by the app. Red bar = app with risk flags.
      </div>
    </>
  );
}
