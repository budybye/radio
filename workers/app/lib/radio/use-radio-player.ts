import { useCallback, useEffect, useRef, useState } from "react";

import { METADATA_REFRESH_DEBOUNCE_MS } from "./constants";
import type { CurrentSongClient } from "./serialize";
import { useCurrentSong } from "./use-current-song";
import { useMpdAgentWatch } from "./use-mpd-agent";

function streamOrigin(streamUrl: string): string {
  return new URL(streamUrl).origin;
}

/** エラー再接続時のみ cache bust（初回 play は warm した接続を再利用） */
function liveStreamUrl(base: string): string {
  return `${base}?_${Date.now()}`;
}

function hasWarmStreamSrc(audio: HTMLAudioElement, streamUrl: string): boolean {
  if (!audio.src) return false;
  try {
    return new URL(audio.src).origin === streamOrigin(streamUrl);
  } catch {
    return false;
  }
}

function disconnectAudio(audio: HTMLAudioElement): void {
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
}

type UseRadioPlayerOptions = {
  initialSong: CurrentSongClient | null;
  streamUrl: string;
};

/**
 * Radio Player: ライブ audio + metadata watch を1 interface に統合。
 * songid 変化は metadata のみ更新（audio reconnect なし）。
 */
export function useRadioPlayer({
  initialSong,
  streamUrl,
}: UseRadioPlayerOptions) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const currentSong = useCurrentSong(initialSong);
  const intentRef = useRef(false);
  const genRef = useRef(0);
  const lastMetaRefreshRef = useRef(0);
  const { isActive, refresh } = useMpdAgentWatch();

  const stop = useCallback(() => {
    genRef.current++;
    intentRef.current = false;
    const audio = audioRef.current;
    if (audio) disconnectAudio(audio);
    setIsPlaying(false);
  }, []);

  /** ホバー時のみバッファ温める（マウント時は呼ばない＝ライブ遅れを抑える） */
  const prepareStream = useCallback(() => {
    if (intentRef.current) return;
    const audio = audioRef.current;
    if (!audio || hasWarmStreamSrc(audio, streamUrl)) return;
    audio.src = streamUrl;
    audio.load();
  }, [streamUrl]);

  const connect = useCallback(
    async (options?: { forceReload?: boolean }) => {
      if (!intentRef.current) return;

      const audio = audioRef.current;
      if (!audio) return;

      const gen = ++genRef.current;
      const warm = hasWarmStreamSrc(audio, streamUrl);

      if (!warm || options?.forceReload) {
        disconnectAudio(audio);
        audio.src = options?.forceReload
          ? liveStreamUrl(streamUrl)
          : streamUrl;
        audio.load();
      }

      try {
        await audio.play();
        if (gen !== genRef.current) return;
        if (!intentRef.current) {
          disconnectAudio(audio);
          return;
        }
        setIsPlaying(true);
      } catch {
        if (gen === genRef.current) stop();
      }
    },
    [stop, streamUrl],
  );

  const toggle = useCallback(() => {
    if (intentRef.current) {
      stop();
      return;
    }
    intentRef.current = true;
    setIsPlaying(true);
    void connect();
  }, [connect, stop]);

  const reconnectAudioIfWanted = useCallback(() => {
    if (!intentRef.current) return;
    void connect({ forceReload: true });
  }, [connect]);

  const refreshMetadata = useCallback(async () => {
    if (isActive()) return;

    const now = Date.now();
    if (now - lastMetaRefreshRef.current < METADATA_REFRESH_DEBOUNCE_MS) {
      return;
    }
    lastMetaRefreshRef.current = now;

    try {
      await refresh();
    } catch {
      /* 前の曲名を維持 */
    }
  }, [isActive, refresh]);

  useEffect(() => {
    let link: HTMLLinkElement | null = null;
    try {
      const origin = streamOrigin(streamUrl);
      link = document.createElement("link");
      link.rel = "preconnect";
      link.href = origin;
      document.head.appendChild(link);
    } catch {
      /* invalid streamUrl – skip preconnect */
    }
    return () => {
      link?.remove();
    };
  }, [streamUrl]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      reconnectAudioIfWanted();
      void refreshMetadata();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [reconnectAudioIfWanted, refreshMetadata]);

  useEffect(() => () => stop(), [stop]);

  return {
    audioRef,
    isPlaying,
    toggle,
    prepareStream,
    onAudioError: reconnectAudioIfWanted,
    currentSong,
  };
}
