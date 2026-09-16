import createGlobe, { type Arc, type Marker } from "cobe";
import { type RefObject, useEffect, useRef } from "react";

import {
  advanceBeatClock,
  createBeatClock,
  globeSpinRadians,
  readAudioMetrics,
} from "../lib/radio/audio-reactivity";
import { BROADCAST_HUB } from "../lib/radio/constants";
import { globeHeading, shortestAngle, signalArc } from "../lib/radio/globe-view";

type GlobeStationCatalogEntry = {
  id: string;
  broadcastLocation: {
    coordinates: readonly [number, number];
  };
};

type GlobeSpeakerProps = {
  audioRef: RefObject<HTMLAudioElement | null>;
  location: readonly [number, number];
  locationLabel: string;
  stationId: string;
  stations: readonly GlobeStationCatalogEntry[];
  isStreamAudible: boolean;
  isBuffering: boolean;
  hasError: boolean;
};

const EPSILON = 0.0005;

const CATALOG_MARKER_SIZE = 0.035;

const LIVE_MARKER_SIZE = 0.08;

const IDLE_GLOW: [number, number, number] = [0.08, 0.2, 0.3];

const LIVE_GLOW: [number, number, number] = [0.22, 0.72, 0.52];

const BUFFERING_GLOW: [number, number, number] = [0.5, 0.4, 0.18];

const ERROR_GLOW: [number, number, number] = [0.55, 0.18, 0.16];

const MARKER_LIVE_RGB: [number, number, number] = [0.52, 0.95, 0.74];

const MARKER_BUFFERING_RGB: [number, number, number] = [0.95, 0.72, 0.3];

const MARKER_ERROR_RGB: [number, number, number] = [0.95, 0.38, 0.32];

const MARKER_DIM_RGB: [number, number, number] = [0.28, 0.42, 0.55];

const DRAG_YAW = 0.005;

const DRAG_PITCH = 0.003;

const MAX_DRAG_PITCH = 0.7;

function atmosphereClass(
  isStreamAudible: boolean,
  isBuffering: boolean,
  hasError: boolean,
): string {
  if (hasError) return "bg-error/20";

  if (isBuffering) return "bg-warning/20";

  if (isStreamAudible) return "bg-primary/25";

  return "bg-primary/10";
}

export function GlobeSpeaker({
  audioRef,
  location,
  locationLabel,
  stationId,
  stations,
  isStreamAudible,
  isBuffering,
  hasError,
}: GlobeSpeakerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wakeRef = useRef<(() => void) | null>(null);
  const propsRef = useRef({ location, stationId, stations, isStreamAudible, isBuffering, hasError });

  useEffect(() => {
    propsRef.current = { location, stationId, stations, isStreamAudible, isBuffering, hasError };
    wakeRef.current?.();
  }, [location, stationId, stations, isStreamAudible, isBuffering, hasError]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const audio = audioRef.current;

    if (!canvas) return;

    const initial = propsRef.current;
    let [phi, theta] = globeHeading(initial.location[0], initial.location[1]);
    let dragYaw = 0;
    let dragPitch = 0;
    let spinPhi = 0;
    let trackedStationId = initial.stationId;
    let pointerId: number | null = null;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let frameId = 0;
    let lastTime = 0;
    let level = 0;
    let bass = 0;
    let pulse = 0;
    let dirty = true;
    const beatClock = createBeatClock();
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = motionQuery.matches;
    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let audioSource: MediaElementAudioSourceNode | null = null;
    let frequencyData: Uint8Array<ArrayBuffer> | null = null;
    const markers: Marker[] = [];
    const arcs: Arc[] = [];
    const pixelRatio = () => Math.min(window.devicePixelRatio || 1, 2);
    const width = canvas.getBoundingClientRect().width;

    const syncCatalog = (current: typeof initial, markerSize: number) => {
      let markerIndex = 0;

      for (const station of current.stations) {
        const selected = station.id === current.stationId;
        const latitude = station.broadcastLocation.coordinates[0];
        const longitude = station.broadcastLocation.coordinates[1];
        const size = selected ? markerSize : CATALOG_MARKER_SIZE;
        const color = selected ? undefined : MARKER_DIM_RGB;
        const existing = markers[markerIndex];

        if (existing) {
          existing.location[0] = latitude;
          existing.location[1] = longitude;
          existing.size = size;
          existing.id = station.id;

          if (selected) delete existing.color;
          else existing.color = MARKER_DIM_RGB;
        } else {
          markers.push({
            location: [latitude, longitude],
            size,
            color,
            id: station.id,
          });
        }

        markerIndex += 1;
      }

      markers.length = markerIndex;

      if (markers.length === 0) {
        markers.push({
          location: [current.location[0], current.location[1]],
          size: markerSize,
          id: "broadcast",
        });
      }

      const nextArc = signalArc(BROADCAST_HUB, current.location);
      arcs.length = 0;

      if (nextArc) arcs.push(nextArc);
    };

    syncCatalog(initial, LIVE_MARKER_SIZE);

    const globe = createGlobe(canvas, {
      // v2 multiplies logical width/height by devicePixelRatio internally.
      width,
      height: width,
      devicePixelRatio: pixelRatio(),
      phi,
      theta,
      dark: 1,
      diffuse: 1.28,
      scale: 1.06,
      mapSamples: 16_000,
      mapBrightness: 4.8,
      mapBaseBrightness: 0.07,
      baseColor: [0.06, 0.13, 0.22],
      markerColor: MARKER_LIVE_RGB,
      glowColor: IDLE_GLOW,
      markerElevation: 0.05,
      offset: [0, 0.04],
      arcColor: LIVE_GLOW,
      arcWidth: 0.55,
      arcHeight: 0.28,
      markers,
      arcs,
    });

    const renderFrame = (now: number) => {
      frameId = 0;

      if (document.hidden) return;
      const current = propsRef.current;

      if (current.stationId !== trackedStationId) {
        trackedStationId = current.stationId;
        spinPhi = 0;
      }

      const dragging = pointerId !== null;

      const audible =
        current.isStreamAudible &&
        !current.isBuffering &&
        !current.hasError &&
        !!audio &&
        !audio.muted &&
        audio.volume > 0;

      const dt = lastTime ? Math.min((now - lastTime) / (1000 / 60), 3) : 1;
      lastTime = now;

      if (reducedMotion) {
        spinPhi = 0;
        level = 0;
        bass = 0;
        pulse = 0;

        if (!dragging) {
          dragYaw = 0;
          dragPitch = 0;
        }
      } else if (analyser && frequencyData && audible) {
        analyser.getByteFrequencyData(frequencyData);
        const metrics = readAudioMetrics(frequencyData, bass);
        level += (metrics.level - level) * (1 - Math.pow(0.8, dt));
        bass += (metrics.bass - bass) * (1 - Math.pow(0.8, dt));
        pulse = Math.max(metrics.pulse, pulse * Math.pow(0.82, dt));
        advanceBeatClock(beatClock, pulse, now);
      } else {
        level *= Math.pow(0.8, dt);
        bass *= Math.pow(0.8, dt);
        pulse *= Math.pow(0.78, dt);
      }

      if (!reducedMotion && !dragging) {
        dragYaw *= Math.pow(0.9, dt);
        dragPitch *= Math.pow(0.9, dt);

        if (Math.abs(dragYaw) < EPSILON) dragYaw = 0;

        if (Math.abs(dragPitch) < EPSILON) dragPitch = 0;
      }

      if (!reducedMotion && audible && !dragging) {
        spinPhi += globeSpinRadians(beatClock.bpm, dt / 60);
      } else if (!reducedMotion && !dragging) {
        spinPhi *= Math.pow(0.9, dt);

        if (Math.abs(spinPhi) < EPSILON) spinPhi = 0;
      }

      const [targetPhi, targetTheta] = globeHeading(current.location[0], current.location[1]);
      const headingPhi = targetPhi + dragYaw + spinPhi;
      const headingTheta = targetTheta + dragPitch;
      const delta = shortestAngle(phi, headingPhi);
      const moving = Math.abs(delta) > EPSILON || Math.abs(theta - headingTheta) > EPSILON;

      if (reducedMotion) {
        phi = headingPhi;
        theta = headingTheta;
      } else {
        const easing = 1 - Math.pow(0.88, dt);
        phi += moving ? delta * easing : delta;
        theta += moving ? (headingTheta - theta) * easing : headingTheta - theta;
      }

      const decaying = level > EPSILON || bass > EPSILON || pulse > EPSILON;
      const spinning = spinPhi !== 0;

      if (!decaying) {
        level = 0;
        bass = 0;
        pulse = 0;
      }

      const markerSize = LIVE_MARKER_SIZE + bass * 0.03 + pulse * 0.03;
      syncCatalog(current, markerSize);

      if (
        dirty ||
        moving ||
        audible ||
        decaying ||
        spinning ||
        dragging ||
        dragYaw !== 0 ||
        dragPitch !== 0
      ) {
        dirty = false;

        let glowColor: [number, number, number] = IDLE_GLOW;
        let markerColor: [number, number, number] = MARKER_LIVE_RGB;
        let mapBrightness = 4.5 + level * 1.5;

        if (current.hasError) {
          glowColor = ERROR_GLOW;
          markerColor = MARKER_ERROR_RGB;
          mapBrightness = 3.2;
        } else if (current.isBuffering) {
          glowColor = BUFFERING_GLOW;
          markerColor = MARKER_BUFFERING_RGB;
          mapBrightness = 5.4;
        } else if (audible) {
          glowColor = LIVE_GLOW;
          markerColor = MARKER_LIVE_RGB;
          mapBrightness = 7.8 + level * 4 + pulse * 3;
        }

        globe.update({
          phi,
          theta,
          glowColor,
          markerColor,
          mapBrightness,
          markers,
          arcs,
        });
      }

      if (
        !document.hidden &&
        (dirty ||
          moving ||
          audible ||
          decaying ||
          spinning ||
          dragging ||
          dragYaw !== 0 ||
          dragPitch !== 0)
      ) {
        frameId = requestAnimationFrame(renderFrame);
      }
    };

    const wake = () => {
      if (frameId !== 0 || document.hidden) return;

      dirty = true;
      lastTime = 0;
      frameId = requestAnimationFrame(renderFrame);
    };

    wakeRef.current = wake;

    if (audio && "AudioContext" in globalThis) {
      try {
        audioContext = new AudioContext();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.75;
        audioSource = audioContext.createMediaElementSource(audio);
        audioSource.connect(analyser);
        analyser.connect(audioContext.destination);
        frequencyData = new Uint8Array(analyser.frequencyBinCount);
      } catch {
        void audioContext?.close();
        audioContext = null;
        analyser = null;
        audioSource = null;
        frequencyData = null;
      }
    }

    const onPlay = () => {
      void audioContext?.resume();
      wake();
    };

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frameId);
        frameId = 0;
      } else {
        wake();
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      if (pointerId !== null) return;

      pointerId = event.pointerId;
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      canvas.setPointerCapture(event.pointerId);
      canvas.style.cursor = "grabbing";
      wake();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (pointerId !== event.pointerId) return;

      const deltaX = event.clientX - lastPointerX;
      const deltaY = event.clientY - lastPointerY;
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      dragYaw -= deltaX * DRAG_YAW;
      dragPitch = Math.max(
        -MAX_DRAG_PITCH,
        Math.min(MAX_DRAG_PITCH, dragPitch - deltaY * DRAG_PITCH),
      );
      wake();
    };

    const onPointerUp = (event: PointerEvent) => {
      if (pointerId !== event.pointerId) return;

      pointerId = null;

      try {
        canvas.releasePointerCapture(event.pointerId);
      } catch {
        /* already released */
      }

      canvas.style.cursor = "";

      if (reducedMotion) {
        dragYaw = 0;
        dragPitch = 0;
      }

      wake();
    };

    const onMotion = () => {
      reducedMotion = motionQuery.matches;
      wake();
    };

    const onResize = () => {
      const size = canvas.getBoundingClientRect().width;
      globe.update({ width: size, height: size, devicePixelRatio: pixelRatio() });
      wake();
    };

    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(canvas);
    motionQuery.addEventListener("change", onMotion);
    document.addEventListener("visibilitychange", onVisibility);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    audio?.addEventListener("play", onPlay);
    audio?.addEventListener("volumechange", wake);
    wake();

    return () => {
      wakeRef.current = null;
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      motionQuery.removeEventListener("change", onMotion);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      audio?.removeEventListener("play", onPlay);
      audio?.removeEventListener("volumechange", wake);
      audioSource?.disconnect();
      analyser?.disconnect();
      void audioContext?.close();
      globe.destroy();
    };
  }, [audioRef]);

  return (
    <div className="relative">
      <div
        className={`pointer-events-none absolute inset-[-18%] rounded-full blur-3xl motion-reduce:opacity-40 ${atmosphereClass(isStreamAudible, isBuffering, hasError)}`}
        aria-hidden="true"
      />
      <svg
        className="pointer-events-none absolute inset-[-4%] size-[108%] motion-reduce:opacity-50"
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        <ellipse
          cx="50"
          cy="54"
          rx="39"
          ry="13"
          fill="none"
          className="stroke-base-content/15"
          strokeWidth="0.4"
        />
      </svg>
      <canvas
        ref={canvasRef}
        className="globe-speaker relative z-10 aspect-square w-full cursor-grab touch-none active:cursor-grabbing"
        role="img"
        aria-label={`Broadcast location: ${locationLabel}. Drag to look around.`}
      />
    </div>
  );
}
