import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { alertsQuery, appsQuery, type Scope } from "../api";
import AlertTable from "./AlertTable";
import AppsTable from "./AppsTable";

type Tab = "alerts" | "apps";

interface Props {
  scope: Scope;
  userNames: Map<string, string>;
  onOpenUser: (id: string) => void;
}

export default function BottomPanel({ scope, userNames, onOpenUser }: Props) {
  const [tab, setTab] = useState<Tab>("alerts");
  const alerts = useQuery(alertsQuery(scope));
  const apps = useQuery(appsQuery());

  let meta = "";
  if (tab === "alerts" && alerts.data) {
    const n = alerts.data.alerts.length;
    meta = `${n} ${n === 1 ? "row" : "rows"}`;
  } else if (tab === "apps" && apps.data) {
    meta = `${apps.data.apps.length} apps · ${apps.data.apps.filter((a) => a.risky).length} risky`;
  }

  const tabClass = (t: Tab) =>
    "rounded-tt px-2.5 py-[5px] text-[12.5px] " +
    (tab === t ? "bg-active text-ink" : "text-muted hover:text-ink");

  return (
    <section className="rounded-tt border border-line bg-panel">
      <div className="flex items-center justify-between px-2 py-2">
        <div role="tablist" className="flex gap-1">
          <button type="button" role="tab" aria-selected={tab === "alerts"} className={tabClass("alerts")} onClick={() => setTab("alerts")}>
            Alert timeline
          </button>
          <button type="button" role="tab" aria-selected={tab === "apps"} className={tabClass("apps")} onClick={() => setTab("apps")}>
            OAuth apps
          </button>
        </div>
        <span className="pr-2 font-mono text-[11px] text-faint">{meta}</span>
      </div>
      <div role="tabpanel">
        {tab === "alerts" ? (
          <AlertTable query={alerts} scope={scope} userNames={userNames} onOpenUser={onOpenUser} />
        ) : (
          <AppsTable query={apps} />
        )}
      </div>
    </section>
  );
}
