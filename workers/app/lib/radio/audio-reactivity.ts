export type AudioMetrics = {
  level: number;
  bass: number;
  pulse: number;
};

const BASS_BIN_RATIO = 0.2;
const PULSE_GAIN = 4;

export function readAudioMetrics(
  frequencyData: Uint8Array,
  previousBass: number,
): AudioMetrics {
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
