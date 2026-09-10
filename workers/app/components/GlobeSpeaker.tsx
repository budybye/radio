import createGlobe from "cobe";
import { type RefObject, useEffect, useRef } from "react";

import { BROADCAST_HUB } from "../lib/radio/constants";
import { readAudioMetrics } from "../lib/radio/audio-reactivity";

type GlobeSpeakerProps = {
  /** 解析対象の live audio */
  audioRef: RefObject<HTMLAudioElement | null>;
  /** ローカル audio 再生中 */
  active?: boolean;
  /** MpdAgent ブロードキャスト */
  listenerCount?: number;
  mpdState?: string | null;
  hasError?: boolean;
};

const HUB: [number, number] = [BROADCAST_HUB[0], BROADCAST_HUB[1]];

function prefersReducedMotion(): boolean {
  if (!("matchMedia" in globalThis)) return false;
  return globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function GlobeSpeaker({
  audioRef,
  active = false,
  listenerCount = 0,
  mpdState = null,
  hasError = false,
}: GlobeSpeakerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);
  const listenerRef = useRef(listenerCount);
  const mpdStateRef = useRef(mpdState);
  const errorRef = useRef(hasError);

  useEffect(() => {
    activeRef.current = active;
    listenerRef.current = listenerCount;
    mpdStateRef.current = mpdState;
    errorRef.current = hasError;
  }, [active, listenerCount, mpdState, hasError]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const audio = audioRef.current;
    if (!canvas) return;

    let width = 0;
    let phi = 0;
    let frameId = 0;
    let visualLevel = 0;
    let visualBass = 0;
    let visualPulse = 0;
    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let audioSource: MediaElementAudioSourceNode | null = null;
    let frequencyData: Uint8Array<ArrayBuffer> | null = null;
    let resumeAudioContext: (() => void) | null = null;
    const reducedMotion = prefersReducedMotion();

    const measure = () => {
      width = canvas.getBoundingClientRect().width;
    };

    const dpr = () => Math.min(window.devicePixelRatio || 1, 2);

    if (audio && "AudioContext" in globalThis) {
      try {
        audioContext = new globalThis.AudioContext();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.75;
        audioSource = audioContext.createMediaElementSource(audio);
        audioSource.connect(analyser);
        analyser.connect(audioContext.destination);
        frequencyData = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
        resumeAudioContext = () => {
          void audioContext?.resume();
        };
        audio.addEventListener("play", resumeAudioContext);
      } catch {
        void audioContext?.close();
        audioContext = null;
        analyser = null;
        audioSource = null;
        frequencyData = null;
      }
    }

    measure();

    const globe = createGlobe(canvas, {
      devicePixelRatio: dpr(),
      width: Math.round(width * dpr()),
      height: Math.round(width * dpr()),
      phi: 0,
      theta: 0.22,
      dark: 1,
      diffuse: 1.15,
      scale: 1,
      mapSamples: 14000,
      mapBrightness: 5.5,
      mapBaseBrightness: 0.05,
      baseColor: [0.14, 0.17, 0.21],
      markerColor: [0.42, 0.82, 0.52],
      glowColor: [0.18, 0.34, 0.26],
      markerElevation: 0.04,
      markers: [{ location: HUB, size: 0.07, id: "hub" }],
    });

    const onResize = () => {
      measure();
      const ratio = dpr();
      globe.update({
        width: Math.round(width * ratio),
        height: Math.round(width * ratio),
        devicePixelRatio: ratio,
      });
    };

    window.addEventListener("resize", onResize);

    const tick = () => {
      const localActive = activeRef.current;
      const listeners = listenerRef.current;
      const state = mpdStateRef.current;
      const errored = errorRef.current;
      const live =
        localActive || state === "play" || (listeners > 0 && !errored);

      if (analyser && frequencyData && localActive && !errored) {
        analyser.getByteFrequencyData(frequencyData);
        const metrics = readAudioMetrics(frequencyData, visualBass);
        visualLevel +=
          (metrics.level - visualLevel) *
          (metrics.level > visualLevel ? 0.2 : 0.06);
        visualBass +=
          (metrics.bass - visualBass) *
          (metrics.bass > visualBass ? 0.2 : 0.08);
        visualPulse = Math.max(metrics.pulse, visualPulse * 0.82);
      } else {
        visualLevel *= 0.9;
        visualBass *= 0.9;
        visualPulse *= 0.78;
      }

      const boost = listeners > 0 ? 0.02 : 0;
      const audioSpin = reducedMotion
        ? 0
        : visualLevel * 0.0025 + visualPulse * 0.006;
      const spin = reducedMotion
        ? 0
        : errored
          ? 0.0015
          : live
            ? 0.009 + boost * 0.25 + audioSpin
            : 0.0035;

      if (spin > 0) phi += spin;

      const hubSize = (live ? 0.09 : 0.065) + boost + visualPulse * 0.025;

      globe.update({
        phi,
        mapBrightness: errored
          ? 3.2
          : live
            ? 7.8 + boost * 8 + visualLevel * 4 + visualPulse * 3
            : 4.5 + visualLevel * 1.5,
        glowColor: errored
          ? [0.55, 0.18, 0.16]
          : live
            ? [0.32, 0.7, 0.46]
            : [0.16, 0.3, 0.24],
        markerColor: errored ? [0.9, 0.35, 0.3] : [0.42, 0.82, 0.52],
        markers: [{ location: HUB, size: hubSize, id: "hub" }],
      });

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      if (audio && resumeAudioContext) {
        audio.removeEventListener("play", resumeAudioContext);
      }
      audioSource?.disconnect();
      analyser?.disconnect();
      void audioContext?.close();
      globe.destroy();
    };
  }, [audioRef]);

  return (
    <canvas
      ref={canvasRef}
      className={`globe-speaker aspect-square w-full touch-none ${
        hasError ? "globe-speaker-error" : ""
      }`}
      role="img"
      aria-label="Rotating globe"
    />
  );
}
