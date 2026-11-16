import type { UseQueryResult } from "@tanstack/react-query";
import type { UserWithAlerts, UsersResponse } from "../types";
import { CountBadge, SectionLabel, Tag } from "./Pills";
import { Empty, ErrorState, Loading } from "./States";

/** Users sorted by alert_count (desc). Array.sort is stable, so ties keep API order. */
export function sortUsers(users: UserWithAlerts[]): UserWithAlerts[] {
  return [...users].sort((a, b) => b.alert_count - a.alert_count);
}

interface Props {
  query: UseQueryResult<UsersResponse>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function UserList({ query, selectedId, onSelect }: Props) {
  return (
    <section className="rounded-tt border border-line bg-panel">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <SectionLabel>Users</SectionLabel>
        <span className="text-[11px] text-faint">sorted by alerts</span>
      </div>

      {query.isPending ? (
        <Loading label="Loading users…" />
      ) : query.isError ? (
        <div className="p-3">
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        </div>
      ) : query.data.users.length === 0 ? (
        <Empty message="No users in this tenant." />
      ) : (
        <ul>
          {sortUsers(query.data.users).map((u) => {
            const selected = u.id === selectedId;
            return (
              <li key={u.id} className="border-b border-line last:border-b-0">
                <button
                  type="button"
                  onClick={() => onSelect(u.id)}
                  aria-current={selected ? "true" : undefined}
                  className={
                    "flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left " +
                    (selected ? "bg-active" : "hover:bg-raised")
                  }
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-[13px] text-ink">
                      {u.name}
                      {u.privileged ? <Tag>privileged</Tag> : null}
                    </span>
                    <span className="mt-0.5 block truncate font-mono text-[11px] text-muted">
                      {u.id} · {u.role} · {u.home_country}
                    </span>
                  </span>
                  <CountBadge count={u.alert_count} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
