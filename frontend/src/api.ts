import { API_BASE } from "./config";
import type {
  AlertsResponse,
  AppsResponse,
  Mode,
  Summary,
  UserDetail,
  UsersResponse,
} from "./types";

/** The API could not be reached at all (backend down, wrong host, CORS/network failure). */
export class ApiUnreachableError extends Error {
  constructor() {
    super(`Cannot reach the TokenTrail API at ${API_BASE}. Is the backend running?`);
    this.name = "ApiUnreachableError";
  }
}

/** The API answered with a non-2xx status. `detail` is FastAPI's error message when present. */
export class ApiHttpError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(detail);
    this.name = "ApiHttpError";
  }
}

async function getJson<T>(path: string, params?: Record<string, string | number>): Promise<T> {
  const url = new URL(path, API_BASE);
  for (const [k, v] of Object.entries(params ?? {})) url.searchParams.set(k, String(v));

  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new ApiUnreachableError();
  }

  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = (await res.json()) as { detail?: unknown };
      if (typeof body.detail === "string") detail = body.detail;
    } catch {
      /* non-JSON error body: keep status text */
    }
    throw new ApiHttpError(res.status, detail);
  }
  return (await res.json()) as T;
}

export interface Scope {
  seed: number;
  mode: Mode;
}

export const getSummary = ({ seed, mode }: Scope) => getJson<Summary>("/summary", { seed, mode });
export const getApps = () => getJson<AppsResponse>("/apps");
export const getUsers = ({ seed, mode }: Scope) => getJson<UsersResponse>("/users", { seed, mode });
export const getUser = (id: string, { seed, mode }: Scope) =>
  getJson<UserDetail>(`/users/${encodeURIComponent(id)}`, { seed, mode });
export const getAlerts = ({ seed, mode }: Scope) => getJson<AlertsResponse>("/alerts", { seed, mode });

// Query options. Every seed/mode-dependent key includes seed and mode, so changing either refetches.
export const summaryQuery = (s: Scope) => ({
  queryKey: ["summary", s.seed, s.mode] as const,
  queryFn: () => getSummary(s),
});
// /apps takes no parameters and never changes: fetch once, cache for the session.
export const appsQuery = () => ({
  queryKey: ["apps"] as const,
  queryFn: () => getApps(),
  staleTime: Infinity,
  gcTime: Infinity,
});
export const usersQuery = (s: Scope) => ({
  queryKey: ["users", s.seed, s.mode] as const,
  queryFn: () => getUsers(s),
});
export const userQuery = (id: string, s: Scope) => ({
  queryKey: ["user", id, s.seed, s.mode] as const,
  queryFn: () => getUser(id, s),
});
export const alertsQuery = (s: Scope) => ({
  queryKey: ["alerts", s.seed, s.mode] as const,
  queryFn: () => getAlerts(s),
});
