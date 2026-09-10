import { describe, expect, it } from "vitest";

import { readAudioMetrics } from "./audio-reactivity";

describe("readAudioMetrics", () => {
  it("normalizes overall and bass energy from frequency data", () => {
    const metrics = readAudioMetrics(
      Uint8Array.from([255, 255, 0, 0, 0, 0, 0, 0, 0, 0]),
      1,
    );

    expect(metrics.level).toBeCloseTo(0.2);
    expect(metrics.bass).toBe(1);
    expect(metrics.pulse).toBe(0);
  });

  it("returns zero metrics for empty frequency data", () => {
    expect(readAudioMetrics(new Uint8Array(), 0.5)).toEqual({
      level: 0,
      bass: 0,
      pulse: 0,
    });
  });

  it("detects rising bass as a bounded pulse", () => {
    const metrics = readAudioMetrics(
      Uint8Array.from([128, 128, 0, 0, 0, 0, 0, 0, 0, 0]),
      0.4,
    );

    expect(metrics.pulse).toBeGreaterThan(0);
    expect(metrics.pulse).toBeLessThanOrEqual(1);
  });
});
