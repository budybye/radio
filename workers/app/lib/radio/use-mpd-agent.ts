import { useAgent } from "agents/react";
import { type SerializedResult } from "better-result";
import { useCallback, useEffect, useRef } from "react";

import {
  WS_RECONNECT_BASE_MS,
  WS_RECONNECT_MAX_MS,
} from "./constants";
import type { MpdError } from "./errors";
import {
  MPD_AGENT_INSTANCE,
  MPD_AGENT_NAME,
  type MpdAgentState,
} from "./mpd-agent-types";
import {
  currentSongFromSerialized,
  type CurrentSongClient,
} from "./serialize";
import type { CurrentSongView } from "./types";

export type MpdAgentWatchHandle = {
  /** Agents WebSocket + streaming watch が生きてる */
  isActive: () => boolean;
  /** watch 切断時の metadata 再取得（Cap'n Web HTTP 不要） */
  refresh: () => Promise<CurrentSongClient | null>;
};

/**
 * MpdAgent DO へ useAgent 接続し、watchCurrentSong streaming で metadata を受信。
 * Cap'n Web RPC watch の置き換え。
 */
export function useMpdAgentWatch(
  onUpdate: (song: CurrentSongClient | null) => void,
  getCache: () => CurrentSongClient | null,
): MpdAgentWatchHandle {
  const onUpdateRef = useRef(onUpdate);
  const getCacheRef = useRef(getCache);
  const cacheRef = useRef(getCache());
  const streamActiveRef = useRef(false);
  const reconnectAttemptRef = useRef(0);

  onUpdateRef.current = onUpdate;
  getCacheRef.current = getCache;

  const agent = useAgent<MpdAgentState>({
    agent: MPD_AGENT_NAME,
    name: MPD_AGENT_INSTANCE,
    onStateUpdate: (state) => {
      // 接続直後の bootstrap（streaming 開始前）
      if (streamActiveRef.current) return;
      if (!state.songid || !state.song) {
        cacheRef.current = null;
      } else {
        cacheRef.current = { ...state.song, songid: state.songid };
      }
      onUpdateRef.current(cacheRef.current);
    },
  });

  const isActive = useCallback(
    () =>
      streamActiveRef.current &&
      agent.readyState === WebSocket.OPEN,
    [agent],
  );

  useEffect(() => {
    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    const clearReconnect = () => {
      if (reconnectTimer !== undefined) {
        clearTimeout(reconnectTimer);
        reconnectTimer = undefined;
      }
    };

    const scheduleRestart = () => {
      if (cancelled || reconnectTimer !== undefined) return;
      const delay = Math.min(
        WS_RECONNECT_MAX_MS,
        WS_RECONNECT_BASE_MS * 2 ** reconnectAttemptRef.current,
      );
      reconnectAttemptRef.current++;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = undefined;
        if (!cancelled) void runWatch();
      }, delay);
    };

    const runWatch = async () => {
      clearReconnect();
      try {
        await agent.ready;
      } catch {
        if (!cancelled) scheduleRestart();
        return;
      }
      if (cancelled) return;

      cacheRef.current = getCacheRef.current();
      streamActiveRef.current = true;
      reconnectAttemptRef.current = 0;

      try {
        await agent.call(
          "watchCurrentSong",
          [cacheRef.current?.songid],
          {
            stream: {
              onChunk: (chunk) => {
                if (cancelled) return;
                const serialized = chunk as SerializedResult<
                  CurrentSongView,
                  MpdError
                >;
                cacheRef.current = currentSongFromSerialized(
                  serialized,
                  cacheRef.current,
                );
                onUpdateRef.current(cacheRef.current);
              },
              onError: () => {
                streamActiveRef.current = false;
              },
            },
          },
        );
      } catch {
        streamActiveRef.current = false;
      }

      if (!cancelled) scheduleRestart();
    };

    void runWatch();

    return () => {
      cancelled = true;
      streamActiveRef.current = false;
      clearReconnect();
    };
  }, [agent]);

  const refresh = useCallback(async (): Promise<CurrentSongClient | null> => {
    try {
      await agent.ready;
      const serialized = (await agent.call("getCurrentSongView", [
        cacheRef.current?.songid,
      ])) as SerializedResult<CurrentSongView, MpdError>;
      cacheRef.current = currentSongFromSerialized(
        serialized,
        cacheRef.current,
      );
      onUpdateRef.current(cacheRef.current);
      return cacheRef.current;
    } catch {
      return cacheRef.current;
    }
  }, [agent]);

  return { isActive, refresh };
}
