import { describe, expect, it } from "vitest";

import {
  DEFAULT_BPM,
  advanceBeatClock,
  createBeatClock,
  globeSpinRadians,
  readAudioMetrics,
} from "./audio-reactivity";

describe("readAudioMetrics", () => {
  it("normalizes overall and bass energy from frequency data", () => {
    const metrics = readAudioMetrics(Uint8Array.from([255, 255, 0, 0, 0, 0, 0, 0, 0, 0]), 1);

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
    const metrics = readAudioMetrics(Uint8Array.from([128, 128, 0, 0, 0, 0, 0, 0, 0, 0]), 0.4);

    expect(metrics.pulse).toBeGreaterThan(0);
    expect(metrics.pulse).toBeLessThanOrEqual(1);
  });
});

describe("advanceBeatClock", () => {
  it("keeps the default tempo before the first onset interval", () => {
    const clock = createBeatClock();

    expect(advanceBeatClock(clock, 0.3, 1_000)).toBe(DEFAULT_BPM);
    expect(advanceBeatClock(clock, 0.05, 1_500)).toBe(DEFAULT_BPM);
  });

  it("estimates BPM from median bass-onset intervals", () => {
    const clock = createBeatClock();

    advanceBeatClock(clock, 0.4, 0);
    advanceBeatClock(clock, 0.4, 500);
    advanceBeatClock(clock, 0.4, 1_000);
    advanceBeatClock(clock, 0.4, 1_500);

    expect(clock.bpm).toBe(120);
  });

  it("does not record an onset when pulse stays below the threshold", () => {
    const clock = createBeatClock();

    expect(advanceBeatClock(clock, 0.1, 1_000)).toBe(DEFAULT_BPM);
    expect(clock.lastOnsetMs).toBeNull();
    expect(clock.intervals).toHaveLength(0);
  });

  it("ignores repeated high-pulse frames within the refractory window", () => {
    const clock = createBeatClock();

    advanceBeatClock(clock, 0.4, 0);
    advanceBeatClock(clock, 0.4, 16);
    advanceBeatClock(clock, 0.4, 500);

    expect(clock.bpm).toBe(120);
    expect(clock.intervals).toHaveLength(1);
  });

  it("ignores bass-onset intervals outside the supported tempo range", () => {
    const clock = createBeatClock();

    advanceBeatClock(clock, 0.4, 0);
    advanceBeatClock(clock, 0.4, 100);
    expect(clock.bpm).toBe(DEFAULT_BPM);
    expect(clock.intervals).toHaveLength(0);

    advanceBeatClock(clock, 0.4, 2_100);
    expect(clock.bpm).toBe(DEFAULT_BPM);
    expect(clock.intervals).toHaveLength(0);
  });
});

describe("globeSpinRadians", () => {
  it("completes one turn after the configured beat count", () => {
    expect(globeSpinRadians(96, 10)).toBeCloseTo(Math.PI * 2);
  });
});
