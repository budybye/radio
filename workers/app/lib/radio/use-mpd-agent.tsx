import { useAgent } from "agents/react";
import { useCallback, useEffect, useRef, type MutableRefObject, type ReactElement } from "react";

import { MPD_AGENT_RPC_TIMEOUT_MS } from "./constants";
import { MPD_AGENT_INSTANCE, MPD_AGENT_NAME, type MpdAgentState } from "./mpd-agent-types";
import {
  currentSongFromSerialized,
  mpdWireMessage,
  parseSerializedCurrentSongView,
  type CurrentSongClient,
  type RpcSerializedEnvelopeWire,
} from "./serialize";

const EMPTY_MPD_AGENT_STATE: MpdAgentState = {
  songid: "",
  song: null,
  mpdState: null,
  listenerCount: 0,
  lastError: null,
};

function currentSongFromAgentState(state: MpdAgentState): CurrentSongClient | null {
  if (!state.songid || !state.song) return null;

  return { ...state.song, songid: state.songid };
}

function toMpdAgentWatchUpdate(state: MpdAgentState): MpdAgentWatchUpdate {
  return {
    song: currentSongFromAgentState(state),
    listenerCount: state.listenerCount ?? 0,
    lastError: mpdWireMessage(state.lastError),
  };
}

type CurrentSongRef = { current: CurrentSongClient | null };

export type MpdAgentWatchUpdate = {
  song: CurrentSongClient | null;
  listenerCount: number;
  lastError: string | null;
};

export type MpdAgentApi = {
  isConnected: () => boolean;
  refreshCurrentSong: () => Promise<CurrentSongClient | null>;
};

type MpdAgentSyncInnerProps = {
  isWatchActive: boolean;
  hasPlaybackIntent: boolean;
  onUpdate: (update: MpdAgentWatchUpdate) => void;
  songRef: CurrentSongRef;
  apiRef: MutableRefObject<MpdAgentApi | null>;
};

/**
 * MpdAgent DO へ useAgent 接続し、state ブロードキャストで現在曲を更新。
 * - `isWatchActive`: ページ表示中のみ低速ポーリング
 * - `hasPlaybackIntent`: Play 押下後は高速ポーリング + 曲メタ更新
 */
function useMpdAgentWatch({
  isWatchActive,
  hasPlaybackIntent,
  onUpdate,
  songRef,
  apiRef,
}: MpdAgentSyncInnerProps) {
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  const agent = useAgent<MpdAgentState>({
    agent: MPD_AGENT_NAME,
    name: MPD_AGENT_INSTANCE,
    onStateUpdate: (state) => {
      onUpdateRef.current(toMpdAgentWatchUpdate(state));
    },
  });

  const isAgentConnected = useCallback(() => agent.readyState === WebSocket.OPEN, [agent]);

  const refreshCurrentSong = useCallback(async (): Promise<CurrentSongClient | null> => {
    try {
      await agent.ready;

      const wire = await agent.call("getCurrentSongView", [songRef.current?.songid], {
        timeout: MPD_AGENT_RPC_TIMEOUT_MS,
      });

      // SAFETY: Agents RPC returns structured-clone JSON; invalid shapes fail envelope parse.
      const serializedView = parseSerializedCurrentSongView(
        wire as RpcSerializedEnvelopeWire | null | undefined,
      );

      if (!serializedView) return songRef.current;
      const next = currentSongFromSerialized(serializedView, songRef.current);
      onUpdateRef.current({
        ...toMpdAgentWatchUpdate(agent.state ?? EMPTY_MPD_AGENT_STATE),
        song: next,
      });

      return next;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "MpdAgent RPC failed";
      onUpdateRef.current({
        ...toMpdAgentWatchUpdate(agent.state ?? EMPTY_MPD_AGENT_STATE),
        lastError: message,
      });

      return songRef.current;
    }
  }, [agent, songRef]);

  useEffect(() => {
    let isCancelled = false;
    void agent.ready
      .then(async () => {
        if (isCancelled) return;
        await agent.call("setWatchActive", [isWatchActive]);

        if (isCancelled || !isWatchActive) return;
        // SSR の曲名を古い DO 永続 state で上書きしない（Play 直後の曲名ジャンプ防止）
        await refreshCurrentSong();
      })
      .catch(() => {
        /* 接続失敗時は次の状態変更で再試行 */
      });

    return () => {
      isCancelled = true;
    };
  }, [agent, isWatchActive, refreshCurrentSong]);

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
    let isCancelled = false;
    void agent.ready
      .then(() => {
        if (isCancelled) return;

        return agent.call("setPlaybackActive", [hasPlaybackIntent]);
      })
      .catch(() => {
        /* 接続失敗時は次の状態変更で再試行 */
      });

    return () => {
      isCancelled = true;
      void agent.ready
        .then(() => agent.call("setPlaybackActive", [false]))
        .catch(() => {
          /* 切断済み */
        });
    };
  }, [agent, hasPlaybackIntent]);

  useEffect(() => {
    apiRef.current = { isConnected: isAgentConnected, refreshCurrentSong };

    return () => {
      apiRef.current = null;
    };
  }, [apiRef, isAgentConnected, refreshCurrentSong]);
}

function MpdAgentSyncInner(props: MpdAgentSyncInnerProps): null {
  useMpdAgentWatch(props);

  return null;
}

export type MpdAgentSyncProps = {
  /** false のとき WebSocket 接続自体を行わない */
  isEngaged: boolean;
  /** isEngaged && タブ表示中 — DO の低速ポーリング */
  isWatchActive: boolean;
  hasPlaybackIntent: boolean;
  onUpdate: (update: MpdAgentWatchUpdate) => void;
  songRef: CurrentSongRef;
  apiRef: MutableRefObject<MpdAgentApi | null>;
};

/** Play クリック後にのみマウントし、WS 接続コストを抑える */
export function MpdAgentSync({
  isEngaged,
  isWatchActive,
  hasPlaybackIntent,
  onUpdate,
  songRef,
  apiRef,
}: MpdAgentSyncProps): ReactElement | null {
  if (!isEngaged) return null;

  return (
    <MpdAgentSyncInner
      isWatchActive={isWatchActive}
      hasPlaybackIntent={hasPlaybackIntent}
      onUpdate={onUpdate}
      songRef={songRef}
      apiRef={apiRef}
    />
  );
}
