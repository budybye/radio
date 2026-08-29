import { useAgent } from "agents/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type MutableRefObject,
  type ReactElement,
} from "react";

import { MPD_AGENT_RPC_TIMEOUT_MS } from "./constants";
import {
  MPD_AGENT_INSTANCE,
  MPD_AGENT_NAME,
  type MpdAgentState,
} from "./mpd-agent-types";
import {
  currentSongFromSerialized,
  parseSerializedCurrentSongFromAgentCall,
  type CurrentSongClient,
  type RpcSerializedEnvelopeWire,
} from "./serialize";

function songFromAgentState(state: MpdAgentState): CurrentSongClient | null {
  if (!state.songid || !state.song) return null;
  return { ...state.song, songid: state.songid };
}

function updateFromAgentState(state: MpdAgentState): MpdAgentWatchUpdate {
  return {
    song: songFromAgentState(state),
    listenerCount: state.listenerCount ?? 0,
    mpdState: state.mpdState ?? null,
    lastError: state.lastError ?? null,
  };
}

type SongRef = { current: CurrentSongClient | null };

export type MpdAgentWatchUpdate = {
  song: CurrentSongClient | null;
  listenerCount: number;
  mpdState: string | null;
  lastError: string | null;
};

export type MpdAgentApi = {
  isActive: () => boolean;
  refresh: () => Promise<CurrentSongClient | null>;
};

export type MpdAgentConnectionStatus = {
  engaged: boolean;
  connected: boolean;
  connecting: boolean;
};

type MpdAgentSyncInnerProps = {
  watchActive: boolean;
  playbackActive: boolean;
  onUpdate: (update: MpdAgentWatchUpdate) => void;
  songRef: SongRef;
  apiRef: MutableRefObject<MpdAgentApi | null>;
  onConnectionStatus?: (status: MpdAgentConnectionStatus) => void;
};

/**
 * MpdAgent DO へ useAgent 接続し、state ブロードキャストで現在曲を更新。
 * - `watchActive`: ページ表示中のみ低速ポーリング
 * - `playbackActive`: 再生中は高速ポーリング + 曲メタ更新
 */
function useMpdAgentWatch({
  watchActive,
  playbackActive,
  onUpdate,
  songRef,
  apiRef,
  onConnectionStatus,
}: MpdAgentSyncInnerProps) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  const onConnectionStatusRef = useRef(onConnectionStatus);
  onConnectionStatusRef.current = onConnectionStatus;

  const agent = useAgent<MpdAgentState>({
    agent: MPD_AGENT_NAME,
    name: MPD_AGENT_INSTANCE,
    onStateUpdate: (state) => {
      onUpdateRef.current(updateFromAgentState(state));
    },
  });

  const connected = agent.readyState === WebSocket.OPEN;
  const connecting =
    agent.readyState === WebSocket.CONNECTING ||
    agent.readyState === WebSocket.CLOSING;

  useEffect(() => {
    onConnectionStatusRef.current?.({
      engaged: true,
      connected,
      connecting,
    });
  }, [connected, connecting]);

  const isActive = useCallback(
    () => agent.readyState === WebSocket.OPEN,
    [agent],
  );

  const refresh = useCallback(async (): Promise<CurrentSongClient | null> => {
    try {
      await agent.ready;
      const wire = await agent.call(
        "getCurrentSongView",
        [songRef.current?.songid],
        { timeout: MPD_AGENT_RPC_TIMEOUT_MS },
      );

      // SAFETY: Agents RPC returns structured-clone JSON; invalid shapes fail envelope parse.
      const serialized = parseSerializedCurrentSongFromAgentCall(
        wire as RpcSerializedEnvelopeWire | null,
      );
      if (!serialized) return songRef.current;
      const next = currentSongFromSerialized(serialized, songRef.current);
      onUpdateRef.current({
        ...updateFromAgentState(
          agent.state ?? {
            songid: "",
            song: null,
            mpdState: null,
            listenerCount: 0,
            lastError: null,
          },
        ),
        song: next,
      });
      return next;
    } catch {
      return songRef.current;
    }
  }, [agent, songRef]);

  useEffect(() => {
    let cancelled = false;
    void agent.ready
      .then(async () => {
        if (cancelled) return;
        await agent.call("setWatchActive", [watchActive]);
        if (cancelled || !watchActive) return;
        // SSR の曲名を古い DO 永続 state で上書きしない（Play 直後の曲名ジャンプ防止）
        await refresh();
      })
      .catch(() => {
        /* 接続失敗時は次の状態変更で再試行 */
      });
    return () => {
      cancelled = true;
    };
  }, [agent, refresh, watchActive]);

  useEffect(() => {
    return () => {
      void agent.ready
        .then(() => agent.call("setWatchActive", [false]))
        .catch(() => {
          /* 切断済み */
        });
    };
  }, [agent]);

  useEffect(() => {
    let cancelled = false;
    void agent.ready
      .then(() => {
        if (cancelled) return;
        return agent.call("setPlaybackActive", [playbackActive]);
      })
      .catch(() => {
        /* 接続失敗時は次の状態変更で再試行 */
      });
    return () => {
      cancelled = true;
      void agent.ready
        .then(() => agent.call("setPlaybackActive", [false]))
        .catch(() => {
          /* 切断済み */
        });
    };
  }, [agent, playbackActive]);

  useEffect(() => {
    apiRef.current = { isActive, refresh };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, isActive, refresh]);

  return useMemo(
    () => ({
      isActive,
      refresh,
      mpdState: agent.state?.mpdState ?? null,
      lastError: agent.state?.lastError ?? null,
      agentConnected: connected,
    }),
    [isActive, refresh, agent.state, connected],
  );
}

function MpdAgentSyncInner(props: MpdAgentSyncInnerProps): null {
  useMpdAgentWatch(props);
  return null;
}

export type MpdAgentSyncProps = {
  /** false のとき WebSocket 接続自体を行わない */
  engaged: boolean;
  /** engaged && タブ表示中 — DO の低速ポーリング */
  watchActive: boolean;
  playbackActive: boolean;
  onUpdate: (update: MpdAgentWatchUpdate) => void;
  songRef: SongRef;
  apiRef: MutableRefObject<MpdAgentApi | null>;
  onConnectionStatus?: (status: MpdAgentConnectionStatus) => void;
};

/** Play クリック後にのみマウントし、WS 接続コストを抑える */
export function MpdAgentSync({
  engaged,
  watchActive,
  playbackActive,
  onUpdate,
  songRef,
  apiRef,
  onConnectionStatus,
}: MpdAgentSyncProps): ReactElement | null {
  if (!engaged) return null;
  return (
    <MpdAgentSyncInner
      watchActive={watchActive}
      playbackActive={playbackActive}
      onUpdate={onUpdate}
      songRef={songRef}
      apiRef={apiRef}
      onConnectionStatus={onConnectionStatus}
    />
  );
}
