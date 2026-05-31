import { useCallback, useEffect, useRef, useState } from "react";

import { METADATA_REFRESH_DEBOUNCE_MS } from "./constants";
import type { CurrentSongClient } from "./client";
import { useMpdAgentWatch } from "./use-mpd-agent";

function liveStreamUrl(base: string): string {
  return `${base}?_${Date.now()}`;
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
  const [currentSong, setCurrentSong] = useState(initialSong);
  const songRef = useRef(currentSong);
  const intentRef = useRef(false);
  const genRef = useRef(0);
  const watchRef = useRef<ReturnType<typeof useMpdAgentWatch> | null>(null);
  const lastMetaRefreshRef = useRef(0);

  songRef.current = currentSong;

  const stop = useCallback(() => {
    genRef.current++;
    intentRef.current = false;
    const audio = audioRef.current;
    if (audio) disconnectAudio(audio);
    setIsPlaying(false);
  }, []);

  const connect = useCallback(async () => {
    if (!intentRef.current) return;

    const audio = audioRef.current;
    if (!audio) return;

    const gen = ++genRef.current;
    disconnectAudio(audio);
    audio.src = liveStreamUrl(streamUrl);
    audio.load();

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
  }, [stop, streamUrl]);

  const toggle = useCallback(() => {
    if (intentRef.current) {
      stop();
      return;
    }
    intentRef.current = true;
    void connect();
  }, [connect, stop]);

  const reconnectAudioIfWanted = useCallback(() => {
    if (!intentRef.current) return;
    void connect();
  }, [connect]);

  const refreshMetadata = useCallback(async () => {
    if (watchRef.current?.isActive()) return;

    const now = Date.now();
    if (now - lastMetaRefreshRef.current < METADATA_REFRESH_DEBOUNCE_MS) {
      return;
    }
    lastMetaRefreshRef.current = now;

    try {
      const next = await watchRef.current?.refresh();
      if (next !== undefined) setCurrentSong(next);
    } catch {
      /* 前の曲名を維持 */
    }
  }, []);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      reconnectAudioIfWanted();
      void refreshMetadata();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [reconnectAudioIfWanted, refreshMetadata]);

  const watch = useMpdAgentWatch(setCurrentSong, () => songRef.current);
  watchRef.current = watch;

  useEffect(() => () => stop(), [stop]);

  return {
    audioRef,
    isPlaying,
    toggle,
    onAudioError: reconnectAudioIfWanted,
    currentSong,
  };
}
