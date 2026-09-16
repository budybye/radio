import { useCallback, useEffect, useMemo, useRef, useState, type SyntheticEvent } from "react";

import { METADATA_REFRESH_DEBOUNCE_MS } from "./constants";
import type { ConfiguredRadioStation, RadioStationId } from "./stations";
import type { CurrentSongClient } from "./serialize";
import { attachStreamToAudio, type StreamAttachment } from "./stream-playback";
import {
  MpdAgentSync,
  type MpdAgentConnectionStatus,
  type MpdAgentApi,
  type MpdAgentWatchUpdate,
} from "./use-mpd-agent";

function getStreamOrigin(streamUrl: string): string {
  return new URL(streamUrl).origin;
}

/** エラー再接続時のみ cache bust */
function buildReconnectStreamUrl(streamUrl: string): string {
  return `${streamUrl}?_${Date.now()}`;
}

function teardownStreamPlayback(
  audio: HTMLAudioElement,
  attachmentRef: { current: StreamAttachment | null },
  loadedStreamUrlRef: { current: string | null },
): void {
  attachmentRef.current?.destroy();
  attachmentRef.current = null;
  loadedStreamUrlRef.current = null;
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
}

export function getStationPlaybackTransition(station: ConfiguredRadioStation, shouldPlay: boolean) {
  const isMpdStation = station.kind === "mpd";

  return {
    streamUrl: station.streamUrl,
    shouldReconnect: shouldPlay,
    isMpdStation,
    shouldEngageAgent: shouldPlay && isMpdStation,
    shouldClearMpdState: !isMpdStation,
  };
}

export function getMediaErrorMode(station: ConfiguredRadioStation): "unavailable" | "reconnect" {
  return station.kind === "external" ? "unavailable" : "reconnect";
}

export function canApplyPlaybackResult(
  resultGeneration: number,
  currentGeneration: number,
  playbackIntent: boolean,
): boolean {
  return resultGeneration === currentGeneration && playbackIntent;
}

function getInitialPageVisibility(): boolean {
  if (typeof document === "undefined") return true;

  return document.visibilityState === "visible";
}

type UseRadioPlayerOptions = {
  initialSong: CurrentSongClient | null | undefined;
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
  const loadedStreamUrlRef = useRef<string | null>(null);
  const agentApiRef = useRef<MpdAgentApi | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isMpdAgentEnabled, setIsMpdAgentEnabled] = useState(false);
  const [pageVisible, setPageVisible] = useState(getInitialPageVisibility);
  const [currentSong, setCurrentSong] = useState(initialSong ?? null);
  const [listenerCount, setListenerCount] = useState(initialListenerCount);
  const [mpdState, setMpdState] = useState<string | null>(null);
  const [agentErrorMessage, setAgentErrorMessage] = useState<string | null>(null);
  const [streamErrorMessage, setStreamErrorMessage] = useState<string | null>(null);

  const [, setAgentConnection] = useState<MpdAgentConnectionStatus>({
    isConnected: false,
    isConnecting: false,
  });

  const songRef = useRef(currentSong);
  const playbackIntentRef = useRef(false);
  const playbackGenerationRef = useRef(0);
  const [stationId, setStationId] = useState(defaultStationId);
  const selectedStation = stations.find(({ id }) => id === stationId) ?? stations[0];
  const isMpdStation = selectedStation?.kind === "mpd";
  const streamUrl = selectedStation?.streamUrl ?? "";
  const reconnectOnStationChangeRef = useRef(false);
  const lastMetaRefreshRef = useRef(0);

  useEffect(() => {
    songRef.current = currentSong;
  }, [currentSong]);

  const enableMpdAgent = useCallback(() => {
    setIsMpdAgentEnabled(true);
  }, []);

  const handleAgentUpdate = useCallback(
    (update: MpdAgentWatchUpdate) => {
      if (!isMpdStation) return;
      setCurrentSong(update.song);
      setListenerCount(update.listenerCount);
      setMpdState(update.mpdState);
      setAgentErrorMessage(update.lastError);
    },
    [isMpdStation],
  );

  const handleAgentConnectionStatus = useCallback((status: MpdAgentConnectionStatus) => {
    setAgentConnection(status);
  }, []);

  const isWatchActive = isMpdStation && isMpdAgentEnabled && pageVisible;

  const mpdAgentSync = useMemo(
    () => (
      <MpdAgentSync
        isEngaged={isMpdStation && isMpdAgentEnabled}
        isWatchActive={isWatchActive}
        hasPlaybackIntent={isPlaying}
        onUpdate={handleAgentUpdate}
        songRef={songRef}
        apiRef={agentApiRef}
        onConnectionStatus={handleAgentConnectionStatus}
      />
    ),
    [
      isMpdStation,
      isMpdAgentEnabled,
      isWatchActive,
      isPlaying,
      handleAgentUpdate,
      handleAgentConnectionStatus,
    ],
  );

  const stopStreamPlayback = useCallback(() => {
    playbackGenerationRef.current++;
    playbackIntentRef.current = false;
    reconnectOnStationChangeRef.current = false;
    const audio = audioRef.current;

    if (audio) teardownStreamPlayback(audio, streamAttachmentRef, loadedStreamUrlRef);
    setIsPlaying(false);
    setIsBuffering(false);
    setIsMpdAgentEnabled(false);
  }, []);

  const startStreamPlayback = useCallback(
    async (connectOptions?: { forceReload?: boolean }) => {
      if (!playbackIntentRef.current) return;

      const audio = audioRef.current;

      if (!audio) return;

      setIsBuffering(true);
      const playbackGeneration = ++playbackGenerationRef.current;

      const playbackUrl = connectOptions?.forceReload
        ? buildReconnectStreamUrl(streamUrl)
        : streamUrl;

      if (loadedStreamUrlRef.current !== playbackUrl) {
        teardownStreamPlayback(audio, streamAttachmentRef, loadedStreamUrlRef);
        streamAttachmentRef.current = attachStreamToAudio(audio, playbackUrl);
        loadedStreamUrlRef.current = playbackUrl;
      }

      audio.muted = isMuted;

      try {
        await audio.play();

        if (
          !canApplyPlaybackResult(
            playbackGeneration,
            playbackGenerationRef.current,
            playbackIntentRef.current,
          )
        ) {
          return;
        }

        setIsPlaying(true);
        setStreamErrorMessage(null);
      } catch {
        if (playbackGeneration === playbackGenerationRef.current) {
          stopStreamPlayback();
          setStreamErrorMessage((error) => error ?? "Playback could not start");
        }
      }
    },
    [isMuted, stopStreamPlayback, streamUrl],
  );

  const isCurrentAudioEvent = useCallback(
    (event: SyntheticEvent<HTMLAudioElement>) => {
      const audio = audioRef.current;
      const loaded = loadedStreamUrlRef.current;

      return (
        audio !== null &&
        event.currentTarget === audio &&
        playbackIntentRef.current &&
        loaded !== null &&
        (loaded === streamUrl || loaded.startsWith(`${streamUrl}?_`))
      );
    },
    [streamUrl],
  );

  const onAudioWaiting = useCallback(
    (event: SyntheticEvent<HTMLAudioElement>) => {
      if (isCurrentAudioEvent(event)) setIsBuffering(true);
    },
    [isCurrentAudioEvent],
  );

  const onAudioPlaying = useCallback(
    (event: SyntheticEvent<HTMLAudioElement>) => {
      if (
        isCurrentAudioEvent(event) &&
        !event.currentTarget.paused &&
        event.currentTarget.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
      ) {
        setIsBuffering(false);
      }
    },
    [isCurrentAudioEvent],
  );

  useEffect(() => {
    if (!reconnectOnStationChangeRef.current || !streamUrl) return;
    reconnectOnStationChangeRef.current = false;
    void startStreamPlayback();
  }, [startStreamPlayback, streamUrl]);

  const togglePlayback = useCallback(() => {
    if (isMpdStation) enableMpdAgent();

    if (playbackIntentRef.current) {
      stopStreamPlayback();

      return;
    }

    setStreamErrorMessage(null);
    playbackIntentRef.current = true;
    setIsPlaying(true);
    void startStreamPlayback();
  }, [startStreamPlayback, enableMpdAgent, isMpdStation, stopStreamPlayback]);

  const selectStation = useCallback(
    (nextStationId: RadioStationId) => {
      const nextStation = stations.find(({ id }) => id === nextStationId);

      if (!nextStation || nextStation.id === stationId) return;

      const transition = getStationPlaybackTransition(nextStation, playbackIntentRef.current);
      reconnectOnStationChangeRef.current = transition.shouldReconnect;
      playbackGenerationRef.current++;
      const audio = audioRef.current;

      if (audio) teardownStreamPlayback(audio, streamAttachmentRef, loadedStreamUrlRef);
      setStationId(nextStation.id);
      setIsPlaying(transition.shouldReconnect);
      setIsBuffering(transition.shouldReconnect);
      setMpdState(null);

      if (transition.shouldClearMpdState) setCurrentSong(null);

      setListenerCount(0);
      setIsMpdAgentEnabled(transition.shouldEngageAgent);
      setStreamErrorMessage(null);
      setAgentErrorMessage(null);
      setAgentConnection({ isConnected: false, isConnecting: false });
    },
    [stationId, stations],
  );

  const toggleMute = useCallback(() => {
    setIsMuted((muted) => !muted);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;

    if (audio) {
      audio.muted = isMuted;
      audio.volume = volume;
    }
  }, [isMuted, volume]);

  const reconnectAudioIfWanted = useCallback(() => {
    if (!playbackIntentRef.current) return;
    void startStreamPlayback({ forceReload: true });
  }, [startStreamPlayback]);

  const onAudioError = useCallback(() => {
    setIsBuffering(false);

    if (selectedStation && getMediaErrorMode(selectedStation) === "unavailable") {
      playbackGenerationRef.current++;
      stopStreamPlayback();
      setStreamErrorMessage("Station unavailable");
      setIsMpdAgentEnabled(false);

      return;
    }

    reconnectAudioIfWanted();
  }, [reconnectAudioIfWanted, selectedStation, stopStreamPlayback]);

  const refreshMetadata = useCallback(async () => {
    if (!isMpdStation) return;

    const api = agentApiRef.current;

    if (!api?.isConnected()) return;

    const now = Date.now();

    if (now - lastMetaRefreshRef.current < METADATA_REFRESH_DEBOUNCE_MS) return;

    lastMetaRefreshRef.current = now;

    try {
      await api.refreshCurrentSong();
    } catch {
      /* keep previous title */
    }
  }, [isMpdStation]);

  useEffect(() => {
    let link: HTMLLinkElement | null = null;

    try {
      link = document.createElement("link");
      link.rel = "preconnect";
      link.href = getStreamOrigin(streamUrl);
      document.head.appendChild(link);
    } catch {
      /* invalid streamUrl */
    }

    return () => {
      link?.remove();
    };
  }, [streamUrl]);

  useEffect(() => {
    const onVisibilityChange = () => {
      const visible = document.visibilityState === "visible";
      setPageVisible(visible);

      if (!visible) return;

      reconnectAudioIfWanted();
      void refreshMetadata();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [reconnectAudioIfWanted, refreshMetadata]);

  useEffect(() => () => stopStreamPlayback(), [stopStreamPlayback]);

  const isStreamAudible = isPlaying && !isMuted && volume > 0 && !isBuffering;

  const displayListeners = isMpdStation
    ? Math.max(listenerCount, isStreamAudible ? 1 : 0)
    : 0;

  return {
    audioRef,
    mpdAgentSync,
    isPlaying,
    isMuted,
    volume,
    setVolume,
    station: selectedStation,
    stationId,
    selectStation,
    isStreamAudible,
    isBuffering,
    onAudioWaiting,
    onAudioPlaying,
    togglePlayback,
    toggleMute,
    onAudioError,
    currentSong,
    listenerCount: displayListeners,
    mpdState,
    agentErrorMessage,
    streamErrorMessage,
  };
}
