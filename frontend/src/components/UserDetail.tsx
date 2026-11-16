import { useQuery } from "@tanstack/react-query";
import { userQuery, type Scope } from "../api";
import { Chip, SectionLabel } from "./Pills";
import { Empty, ErrorState, Loading } from "./States";
import Timeline from "./Timeline";

function BaselineRow({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-20 shrink-0 pt-[3px] text-[12px] text-muted">{label}</span>
      <span className="flex flex-wrap gap-2">
        {values.length === 0 ? (
          <span className="pt-[3px] text-[12px] text-faint">none</span>
        ) : (
          values.map((v) => <Chip key={v}>{v}</Chip>)
        )}
      </span>
    </div>
  );
}

export default function UserDetail({ userId, scope }: { userId: string | null; scope: Scope }) {
  const query = useQuery({ ...userQuery(userId ?? "", scope), enabled: userId !== null });

  return (
    <section id="user-detail" className="min-w-0 rounded-tt border border-line bg-panel">
      {userId === null ? (
        <Empty message="Select a user to see their sign-ins." />
      ) : query.isPending ? (
        <Loading label="Loading user…" />
      ) : query.isError ? (
        <div className="p-3">
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        </div>
      ) : (
        <>
          <div className="border-b border-line px-4 py-3.5">
            <h2 className="text-[17px] font-semibold text-ink">{query.data.user.name}</h2>
            <div className="mt-1 font-mono text-[11px] text-muted">
              {query.data.user.id} · {query.data.user.role} · home {query.data.user.home_country} ·{" "}
              {query.data.alerts.length} {query.data.alerts.length === 1 ? "alert" : "alerts"}
            </div>
          </div>

          <div className="space-y-2 border-b border-line px-4 py-4">
            <SectionLabel>Normal baseline</SectionLabel>
            <BaselineRow label="Countries" values={query.data.baseline.countries} />
            <BaselineRow label="Networks" values={query.data.baseline.asns} />
            <BaselineRow label="Devices" values={query.data.baseline.devices} />
          </div>

          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <SectionLabel>Sign-in timeline</SectionLabel>
            <span className="text-[11px] text-faint">shared colour = same session id</span>
          </div>
          <Timeline key={`${userId}|${scope.seed}|${scope.mode}`} detail={query.data} />
        </>
      )}
    </section>
  );
}
