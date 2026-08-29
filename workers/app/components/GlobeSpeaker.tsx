import createGlobe from "cobe";
import { useEffect, useRef } from "react";

import { BROADCAST_HUB } from "../lib/radio/constants";

type GlobeSpeakerProps = {
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
    if (!canvas) return;

    let width = 0;
    let phi = 0;
    let frameId = 0;
    const reducedMotion = prefersReducedMotion();

    const measure = () => {
      width = canvas.getBoundingClientRect().width;
    };

    const dpr = () => Math.min(window.devicePixelRatio || 1, 2);

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
      const boost = listeners > 0 ? 0.02 : 0;
      const spin = reducedMotion
        ? 0
        : errored
          ? 0.0015
          : live
            ? 0.009 + boost * 0.25
            : 0.0035;

      if (spin > 0) phi += spin;

      const hubSize = (live ? 0.09 : 0.065) + boost;

      globe.update({
        phi,
        mapBrightness: errored ? 3.2 : live ? 7.8 + boost * 8 : 4.5,
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
      globe.destroy();
    };
  }, []);

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
