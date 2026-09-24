import { describe, expect, it } from "vitest";
import { AUTO_REFRESH_INTERVALS, autoRefreshTickMs, formatShortDuration, nextAutoRefreshDelayMs } from "../dataViewAutoRefresh";

describe("AUTO_REFRESH_INTERVALS", () => {
  it("keeps 'off' first and unique ms values ascending", () => {
    expect(AUTO_REFRESH_INTERVALS[0]).toEqual({ id: "off", ms: null });
    const periods = AUTO_REFRESH_INTERVALS.map((interval) => interval.ms).filter((ms): ms is number => ms !== null);
    const sorted = [...periods].sort((a, b) => a - b);
    expect(periods).toEqual(sorted);
    expect(new Set(AUTO_REFRESH_INTERVALS.map((interval) => interval.id)).size).toBe(AUTO_REFRESH_INTERVALS.length);
  });
});

describe("autoRefreshTickMs", () => {
  it("resolves known ids", () => {
    expect(autoRefreshTickMs("5s")).toBe(5_000);
    expect(autoRefreshTickMs("1m")).toBe(60_000);
  });

  it("returns null for off and unknown ids", () => {
    expect(autoRefreshTickMs("off")).toBeNull();
    expect(autoRefreshTickMs("nope")).toBeNull();
    expect(autoRefreshTickMs("")).toBeNull();
  });
});

describe("nextAutoRefreshDelayMs", () => {
  it("fires immediately when no run has started yet", () => {
    expect(nextAutoRefreshDelayMs(10_000, null, 123_456)).toBe(0);
  });

  it("waits the remainder of the period since the last run start", () => {
    expect(nextAutoRefreshDelayMs(10_000, 1_000, 4_000)).toBe(7_000);
  });

  it("clamps to zero when the period already elapsed", () => {
    expect(nextAutoRefreshDelayMs(5_000, 1_000, 60_000)).toBe(0);
  });
});

describe("formatShortDuration", () => {
  it("formats sub-minute ages as seconds", () => {
    expect(formatShortDuration(0)).toBe("0s");
    expect(formatShortDuration(45_678)).toBe("45s");
  });

  it("pads seconds under minutes and hours", () => {
    expect(formatShortDuration(125_000)).toBe("2m 05s");
    expect(formatShortDuration(3_780_000)).toBe("1h 03m");
  });

  it("never goes negative", () => {
    expect(formatShortDuration(-2_500)).toBe("0s");
  });
});
