import { useAgent } from "agents/react";
import { type SerializedResult } from "better-result";
import { useCallback, useEffect, useMemo, useRef } from "react";

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
import { useCurrentSongMutate } from "./use-current-song";

function songFromAgentState(state: MpdAgentState): CurrentSongClient | null {
  if (!state.songid || !state.song) return null;
  return { ...state.song, songid: state.songid };
}

/**
 * MpdAgent DO へ useAgent 接続し、watchCurrentSong streaming で SWR キャッシュを更新。
 */
export function useMpdAgentWatch() {
  const { get, set } = useCurrentSongMutate();
  const streamActiveRef = useRef(false);
  const reconnectAttemptRef = useRef(0);

  const agent = useAgent<MpdAgentState>({
    agent: MPD_AGENT_NAME,
    name: MPD_AGENT_INSTANCE,
    onStateUpdate: (state) => {
      if (streamActiveRef.current) return;
      void set(songFromAgentState(state));
    },
  });

  const applySerialized = useCallback(
    async (
      serialized: SerializedResult<CurrentSongView, MpdError>,
    ): Promise<CurrentSongClient | null> => {
      await set((prev) => currentSongFromSerialized(serialized, prev));
      return get();
    },
    [get, set],
  );

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

      streamActiveRef.current = true;
      reconnectAttemptRef.current = 0;

      try {
        await agent.call(
          "watchCurrentSong",
          [get()?.songid],
          {
            stream: {
              onChunk: (chunk) => {
                if (cancelled) return;
                void applySerialized(
                  chunk as SerializedResult<CurrentSongView, MpdError>,
                );
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
  }, [agent, applySerialized, get]);

  const refresh = useCallback(async (): Promise<CurrentSongClient | null> => {
    try {
      await agent.ready;
      const serialized = (await agent.call("getCurrentSongView", [
        get()?.songid,
      ])) as SerializedResult<CurrentSongView, MpdError>;
      return await applySerialized(serialized);
    } catch {
      return get();
    }
  }, [agent, applySerialized, get]);

  return useMemo(
    () => ({ isActive, refresh }),
    [isActive, refresh],
  );
}
