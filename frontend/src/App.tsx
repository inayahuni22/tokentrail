import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiUnreachableError, summaryQuery, usersQuery, type Scope } from "./api";
import type { Mode } from "./types";
import TopBar from "./components/TopBar";
import StatCards from "./components/StatCards";
import UserList, { sortUsers } from "./components/UserList";
import UserDetail from "./components/UserDetail";
import BottomPanel from "./components/BottomPanel";
import { ErrorState } from "./components/States";

export default function App() {
  const [seed, setSeed] = useState(1);
  const [mode, setMode] = useState<Mode>("scored_mfa");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const scope: Scope = { seed, mode };
  const queryClient = useQueryClient();

  // The summary query doubles as the connectivity check: if the API is unreachable,
  // show one page-level error instead of the same message in every panel.
  const summary = useQuery(summaryQuery(scope));
  const users = useQuery(usersQuery(scope));

  const userNames = useMemo(
    () => new Map(users.data?.users.map((u) => [u.id, u.name])),
    [users.data],
  );
  const sortedUsers = useMemo(() => (users.data ? sortUsers(users.data.users) : []), [users.data]);
  const topUserId = sortedUsers[0]?.id ?? null;

  // On load, select the first user in the sorted list (most alerts).
  useEffect(() => {
    if (selectedId === null && topUserId !== null) setSelectedId(topUserId);
  }, [selectedId, topUserId]);

  // Guard against a selection that isn't in the current list: fall back to the top user.
  const effectiveId =
    selectedId !== null && sortedUsers.some((u) => u.id === selectedId) ? selectedId : topUserId;

  const openUser = (id: string) => {
    setSelectedId(id);
    document.getElementById("user-detail")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen">
      <TopBar seed={seed} mode={mode} onSeedChange={setSeed} onModeChange={setMode} />
      <main className="space-y-4 px-5 py-5">
        {summary.error instanceof ApiUnreachableError ? (
          <ErrorState
            error={summary.error}
            onRetry={() => void queryClient.refetchQueries({ type: "all" })}
          />
        ) : (
          <>
            <StatCards scope={scope} />
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[420px_minmax(0,1fr)]">
              <UserList query={users} selectedId={effectiveId} onSelect={setSelectedId} />
              <UserDetail userId={effectiveId} scope={scope} />
            </div>
            <BottomPanel scope={scope} userNames={userNames} onOpenUser={openUser} />
          </>
        )}
      </main>
    </div>
  );
}
