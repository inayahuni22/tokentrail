import type { Mode } from "./types";

// Display labels for the API's mode identifiers.
export const MODE_LABELS: Record<Mode, string> = {
  rules: "Rules",
  session_reuse: "Session reuse",
  combined: "Combined",
  scored: "Scored",
  scored_mfa: "Scored + MFA",
};

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

// Timestamps are naive ISO strings ("2026-11-12T09:12:00"). Slice them rather than
// going through Date, so the browser's timezone never shifts what the API sent.

/** "2026-11-12T09:12:00" -> "09:12" */
export function formatTime(ts: string): string {
  return ts.slice(11, 16);
}

/** "2026-11-12T09:12:00" -> "NOV 12" */
export function formatDate(ts: string): string {
  const month = MONTHS[Number(ts.slice(5, 7)) - 1] ?? ts.slice(5, 7);
  return `${month} ${Number(ts.slice(8, 10))}`;
}
