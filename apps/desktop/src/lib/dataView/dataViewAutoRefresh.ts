/** Auto-refresh scheduling for the Data View runner, modeled on Grafana's
 *  dashboard auto-refresh: a fixed set of intervals plus pure helpers that
 *  turn "tick every N ms" into a setTimeout chain anchored at the last run. */

export interface AutoRefreshInterval {
  /** Stable id persisted in UI state and rendered as the option label. */
  id: string;
  /** Tick period; `null` means auto-refresh is off. */
  ms: number | null;
}

/** Grafana's dashboard auto-refresh presets (short end only — Data View
 *  dashboards are meant for interactive monitoring, not day-long reporting). */
export const AUTO_REFRESH_INTERVALS: readonly AutoRefreshInterval[] = [
  { id: "off", ms: null },
  { id: "5s", ms: 5_000 },
  { id: "10s", ms: 10_000 },
  { id: "30s", ms: 30_000 },
  { id: "1m", ms: 60_000 },
  { id: "5m", ms: 300_000 },
  { id: "15m", ms: 900_000 },
];

/** Resolves an interval id to its tick period; unknown or "off" yields null. */
export function autoRefreshTickMs(id: string): number | null {
  return AUTO_REFRESH_INTERVALS.find((interval) => interval.id === id)?.ms ?? null;
}

/** Delay before the next auto-refresh tick, anchored at the last run start so
 *  slow queries don't stack ticks: `tick - (now - lastRunStartedAt)`, clamped
 *  to >= 0. With no previous run the tick fires immediately (`0`). */
export function nextAutoRefreshDelayMs(tickMs: number, lastRunStartedAtMs: number | null, nowMs: number): number {
  if (lastRunStartedAtMs === null) return 0;
  return Math.max(0, tickMs - (nowMs - lastRunStartedAtMs));
}

/** Compact duration for "refreshed N ago" labels: `45s`, `2m 05s`, `1h 03m`.
 *  Uses unit symbols only so it stays locale-neutral. */
export function formatShortDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  return `${seconds}s`;
}
