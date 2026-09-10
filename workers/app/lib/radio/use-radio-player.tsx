import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { METADATA_REFRESH_DEBOUNCE_MS } from "./constants";
import type { ConfiguredRadioStation, RadioStationId } from "./stations";
import type { CurrentSongClient } from "./serialize";
import {
  MpdAgentSync,
  type MpdAgentConnectionStatus,
  type MpdAgentApi,
  type MpdAgentWatchUpdate,
} from "./use-mpd-agent";

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

export function stationPlaybackTransition(
  station: ConfiguredRadioStation,
  playbackIntent: boolean,
) {
  const mpdState = station.kind === "mpd";
  return {
    streamUrl: station.streamUrl,
    reconnect: playbackIntent,
    mpdState,
    engageAgent: mpdState && playbackIntent,
    clearMpdState: !mpdState,
  };
}

export function mediaErrorMode(
  station: ConfiguredRadioStation,
): "unavailable" | "reconnect" {
  return station.kind === "external" ? "unavailable" : "reconnect";
}

export function canApplyPlaybackResult(
  resultGeneration: number,
  currentGeneration: number,
  playbackIntent: boolean,
): boolean {
  return resultGeneration === currentGeneration && playbackIntent;
}

function initialPageVisible(): boolean {
  if (!("document" in globalThis)) return true;
  return globalThis.document.visibilityState === "visible";
}

type UseRadioPlayerOptions = {
  initialSong: CurrentSongClient | null;
  initialListenerCount: number;
  stations: readonly ConfiguredRadioStation[];
  defaultStationId: RadioStationId;
};

/**
 * Radio Player: ライブ audio + metadata watch を1 interface に統合。
 * songid 変化は metadata のみ更新（audio reconnect なし）。
 */
export function useRadioPlayer({
  initialSong,
  initialListenerCount,
  stations,
  defaultStationId,
}: UseRadioPlayerOptions) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const agentApiRef = useRef<MpdAgentApi | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [agentEngaged, setAgentEngaged] = useState(false);
  const [pageVisible, setPageVisible] = useState(initialPageVisible);
  const [currentSong, setCurrentSong] = useState(initialSong);
  const [listenerCount, setListenerCount] = useState(initialListenerCount);
  const [mpdState, setMpdState] = useState<string | null>(null);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [agentConnection, setAgentConnection] =
    useState<MpdAgentConnectionStatus>({
      connected: false,
      connecting: false,
    });
  const songRef = useRef(currentSong);
  const intentRef = useRef(false);
  const genRef = useRef(0);
  const [stationId, setStationId] = useState(defaultStationId);
  const selectedStation = stations.find(({ id }) => id === stationId) ?? stations[0];
  const isMpdStation = selectedStation?.kind === "mpd";
  const streamUrl = selectedStation?.streamUrl ?? "";
  const reconnectOnStationChangeRef = useRef(false);
  const lastMetaRefreshRef = useRef(0);

  useEffect(() => {
    songRef.current = currentSong;
  }, [currentSong]);

  const engageAgent = useCallback(() => {
    setAgentEngaged(true);
  }, []);

  const handleAgentUpdate = useCallback(
    (update: MpdAgentWatchUpdate) => {
      if (!isMpdStation) return;
      setCurrentSong(update.song);
      setListenerCount(update.listenerCount);
      setMpdState(update.mpdState);
      setAgentError(update.lastError);
    },
    [isMpdStation],
  );

  const handleAgentConnectionStatus = useCallback(
    (status: MpdAgentConnectionStatus) => {
      setAgentConnection(status);
    },
    [],
  );

  const watchActive = isMpdStation && agentEngaged && pageVisible;

  const agentSync = useMemo(
    () => (
      <MpdAgentSync
        engaged={isMpdStation && agentEngaged}
        watchActive={watchActive}
        playbackActive={isPlaying}
        onUpdate={handleAgentUpdate}
        songRef={songRef}
        apiRef={agentApiRef}
        onConnectionStatus={handleAgentConnectionStatus}
      />
    ),
    [
      isMpdStation,
      agentEngaged,
      watchActive,
      isPlaying,
      handleAgentUpdate,
      handleAgentConnectionStatus,
    ],
  );

  const stop = useCallback(() => {
    genRef.current++;
    intentRef.current = false;
    reconnectOnStationChangeRef.current = false;
    const audio = audioRef.current;
    if (audio) disconnectAudio(audio);
    setIsPlaying(false);
    setAgentEngaged(false);
  }, []);

  /** ホバー時にストリームを温めるだけ（DO / WS は Play 時まで接続しない） */
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

      audio.muted = isMuted;

      try {
        await audio.play();
        if (
          !canApplyPlaybackResult(
            gen,
            genRef.current,
            intentRef.current,
          )
        ) {
          return;
        }
        setIsPlaying(true);
        setStreamError(null);
      } catch {
        if (gen === genRef.current) stop();
      }
    },
    [isMuted, stop, streamUrl],
  );

  useEffect(() => {
    if (!reconnectOnStationChangeRef.current || !streamUrl) return;
    reconnectOnStationChangeRef.current = false;
    void connect();
  }, [connect, streamUrl]);

  const toggle = useCallback(() => {
    if (isMpdStation) engageAgent();
    if (intentRef.current) {
      stop();
      return;
    }
    setStreamError(null);
    intentRef.current = true;
    setIsPlaying(true);
    void connect();
  }, [connect, engageAgent, isMpdStation, setStreamError, stop]);

  const selectStation = useCallback(
    (nextStationId: RadioStationId) => {
      const nextStation = stations.find(({ id }) => id === nextStationId);
      if (!nextStation || nextStation.id === stationId) return;

      const transition = stationPlaybackTransition(
        nextStation,
        intentRef.current,
      );
      reconnectOnStationChangeRef.current = transition.reconnect;
      genRef.current++;
      const audio = audioRef.current;
      if (audio) disconnectAudio(audio);
      setStationId(nextStation.id);
      setIsPlaying(false);
      setCurrentSong(null);
      setListenerCount(0);
      setMpdState(null);
      setAgentError(null);
      setStreamError(null);
      setAgentEngaged(transition.engageAgent);
      setAgentConnection({ connected: false, connecting: false });
    },
    [stationId, stations],
  );

  const toggleMute = useCallback(() => {
    setIsMuted((muted) => !muted);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.muted = isMuted;
  }, [isMuted]);

  const reconnectAudioIfWanted = useCallback(() => {
    if (!intentRef.current) return;
    void connect({ forceReload: true });
  }, [connect]);

  const onAudioError = useCallback(() => {
    if (selectedStation && mediaErrorMode(selectedStation) === "unavailable") {
      genRef.current++;
      intentRef.current = false;
      const audio = audioRef.current;
      if (audio) disconnectAudio(audio);
      setIsPlaying(false);
      setStreamError("Station unavailable");
      setAgentEngaged(false);
      return;
    }
    reconnectAudioIfWanted();
  }, [reconnectAudioIfWanted, selectedStation]);

  const refreshMetadata = useCallback(async () => {
    const api = agentApiRef.current;
    if (!api || api.isActive()) return;

    const now = Date.now();
    if (now - lastMetaRefreshRef.current < METADATA_REFRESH_DEBOUNCE_MS) {
      return;
    }
    lastMetaRefreshRef.current = now;

    try {
      await api.refresh();
    } catch {
      /* 前の曲名を維持 */
    }
  }, []);

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
      const visible = document.visibilityState === "visible";
      setPageVisible(visible);
      if (!visible) return;
      reconnectAudioIfWanted();
      void refreshMetadata();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [reconnectAudioIfWanted, refreshMetadata]);

  useEffect(() => () => stop(), [stop]);

  const streamConnected = isPlaying;
  const streamAudible = isPlaying && !isMuted;
  const agentConnected = agentConnection.connected;

  const displayListeners = isMpdStation
    ? Math.max(listenerCount, streamAudible ? 1 : 0)
    : 0;

  return {
    audioRef,
    agentSync,
    isPlaying,
    isMuted,
    station: selectedStation,
    stationId,
    selectStation,
    streamConnected,
    streamAudible,
    toggle,
    toggleMute,
    prepareStream,
    onAudioError,
    currentSong,
    listenerCount: displayListeners,
    mpdState,
    agentError,
    streamError,
    agentEngaged,
    agentConnected,
    agentConnecting: agentConnection.connecting,
  };
}
