// Shapes match API_SPEC.md / backend/api.py exactly.

export const MODES = ["rules", "session_reuse", "combined", "scored", "scored_mfa"] as const;
export type Mode = (typeof MODES)[number];

export const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

// GET /summary
export interface Summary {
  seed: number;
  mode: Mode;
  user_count: number;
  app_count: number;
  signin_count: number;
  alert_count: number;
  users_with_alerts: number;
}

// GET /apps
export interface App {
  id: string;
  name: string;
  publisher_verified: boolean;
  first_party: boolean;
  scopes: string[];
  high_risk_scopes: string[];
  risk_flags: string[];
  risky: boolean;
}
export interface AppsResponse {
  apps: App[];
}

// Tenant user as returned inside GET /users/{id}
export interface User {
  id: string;
  name: string;
  role: string;
  home_country: string;
  privileged: boolean;
}

// GET /users
export interface UserWithAlerts extends User {
  alert_count: number;
}
export interface UsersResponse {
  users: UserWithAlerts[];
}

export interface Baseline {
  countries: string[];
  asns: string[];
  devices: string[];
}

export interface SignIn {
  timestamp: string; // ISO local time, e.g. "2026-11-12T09:12:00"
  day: number;
  user: string; // user id
  app: string; // app id
  ip: string;
  country: string;
  asn: string;
  device_id: string;
  session_id: string;
  auth_method: string;
  result: string;
}

export interface Alert extends SignIn {
  reasons: string[];
  score?: number; // present in scored modes only
}

// GET /users/{user_id}
export interface UserDetail {
  user: User;
  baseline: Baseline;
  signins: SignIn[];
  alerts: Alert[];
}

// GET /alerts
export interface AlertsResponse {
  seed: number;
  mode: Mode;
  alerts: Alert[];
}
