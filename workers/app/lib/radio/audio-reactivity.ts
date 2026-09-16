export type AudioMetrics = {
  level: number;
  bass: number;
  pulse: number;
};

const BASS_BIN_RATIO = 0.2;

const PULSE_GAIN = 4;

export function readAudioMetrics(frequencyData: Uint8Array, previousBass: number): AudioMetrics {
  if (frequencyData.length === 0) {
    return { level: 0, bass: 0, pulse: 0 };
  }

  const bassBins = Math.max(1, Math.floor(frequencyData.length * BASS_BIN_RATIO));
  let total = 0;
  let bassTotal = 0;

  for (let index = 0; index < frequencyData.length; index++) {
    const value = (frequencyData[index] ?? 0) / 255;
    total += value;

    if (index < bassBins) bassTotal += value;
  }

  const bass = bassTotal / bassBins;
  const pulse = Math.min(1, Math.max(0, (bass - previousBass) * PULSE_GAIN));

  return {
    level: total / frequencyData.length,
    bass,
    pulse,
  };
}

export type BeatClock = {
  bpm: number;
  lastOnsetMs: number | null;
  intervals: number[];
};

export const DEFAULT_BPM = 96;

export const BEATS_PER_REVOLUTION = 16;

const MIN_BPM = 70;

const MAX_BPM = 180;

const MIN_INTERVAL_MS = 60_000 / MAX_BPM;

const MAX_INTERVAL_MS = 60_000 / MIN_BPM;

const ONSET_PULSE = 0.22;

const INTERVAL_HISTORY = 8;

export function createBeatClock(): BeatClock {
  return {
    bpm: DEFAULT_BPM,
    lastOnsetMs: null,
    intervals: [],
  };
}

function medianInterval(intervals: readonly number[]): number {
  const ordered = intervals.slice().sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  const high = ordered[middle];

  if (high === undefined) return 60_000 / DEFAULT_BPM;

  if (ordered.length % 2 === 1) return high;

  const low = ordered[middle - 1];

  return low === undefined ? high : (low + high) / 2;
}

export function advanceBeatClock(clock: BeatClock, pulse: number, nowMs: number): number {
  if (pulse < ONSET_PULSE) return clock.bpm;

  const previousOnset = clock.lastOnsetMs;

  if (previousOnset !== null && nowMs - previousOnset < MIN_INTERVAL_MS) return clock.bpm;

  clock.lastOnsetMs = nowMs;

  if (previousOnset === null) return clock.bpm;

  const interval = nowMs - previousOnset;

  if (interval < MIN_INTERVAL_MS || interval > MAX_INTERVAL_MS) return clock.bpm;

  clock.intervals.push(interval);

  if (clock.intervals.length > INTERVAL_HISTORY) clock.intervals.shift();

  clock.bpm = 60_000 / medianInterval(clock.intervals);

  return clock.bpm;
}

export function globeSpinRadians(bpm: number, elapsedSeconds: number): number {
  return ((bpm / 60) * elapsedSeconds * Math.PI * 2) / BEATS_PER_REVOLUTION;
}
