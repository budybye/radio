import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from "react";

import { METADATA_REFRESH_DEBOUNCE_MS } from "./constants";
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

function initialPageVisible(): boolean {
  if (!("document" in globalThis)) return true;
  return globalThis.document.visibilityState === "visible";
}

type UseRadioPlayerOptions = {
  initialSong: CurrentSongClient | null;
  initialListenerCount: number;
  streamUrl: string;
};

/**
 * Radio Player: ライブ audio + metadata watch を1 interface に統合。
 * songid 変化は metadata のみ更新（audio reconnect なし）。
 */
export function useRadioPlayer({
  initialSong,
  initialListenerCount,
  streamUrl,
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
  const [agentConnection, setAgentConnection] =
    useState<MpdAgentConnectionStatus>({
      engaged: false,
      connected: false,
      connecting: false,
    });
  const songRef = useRef(currentSong);
  const intentRef = useRef(false);
  const genRef = useRef(0);
  const lastMetaRefreshRef = useRef(0);

  useEffect(() => {
    songRef.current = currentSong;
  }, [currentSong]);

  const engageAgent = useCallback(() => {
    setAgentEngaged(true);
  }, []);

  const handleAgentUpdate = useCallback((update: MpdAgentWatchUpdate) => {
    setCurrentSong(update.song);
    setListenerCount(update.listenerCount);
    setMpdState(update.mpdState);
    setAgentError(update.lastError);
  }, []);

  const handleAgentConnectionStatus = useCallback(
    (status: MpdAgentConnectionStatus) => {
      setAgentConnection(status);
    },
    [],
  );

  const watchActive = agentEngaged && pageVisible;

  const agentSync = useMemo(
    () => (
      <MpdAgentSync
        engaged={agentEngaged}
        watchActive={watchActive}
        playbackActive={isPlaying}
        onUpdate={handleAgentUpdate}
        songRef={songRef}
        apiRef={agentApiRef}
        onConnectionStatus={handleAgentConnectionStatus}
      />
    ),
    [
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
    [isMuted, stop, streamUrl],
  );

  const toggle = useCallback(() => {
    engageAgent();
    if (intentRef.current) {
      stop();
      return;
    }
    intentRef.current = true;
    setIsPlaying(true);
    void connect();
  }, [connect, engageAgent, stop]);

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
    const audio = audioRef.current;
    if (audio) audio.muted = isMuted;
  }, [isMuted]);

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
  /** MPD httpd の listeners が取れない環境でも、再生中は自分を 1 とみなす */
  const displayListeners = Math.max(
    listenerCount,
    streamAudible ? 1 : 0,
  );

  return {
    audioRef,
    agentSync,
    isPlaying,
    isMuted,
    streamConnected,
    streamAudible,
    toggle,
    toggleMute,
    prepareStream,
    onAudioError: reconnectAudioIfWanted,
    currentSong,
    listenerCount: displayListeners,
    mpdState,
    agentError,
    agentEngaged,
    agentConnected,
    agentConnecting: agentConnection.connecting,
  };
}

export type RadioPlayerHandle = ReturnType<typeof useRadioPlayer> & {
  agentSync: ReactElement | null;
};
