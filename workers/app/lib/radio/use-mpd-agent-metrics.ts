import { useAgent } from "agents/react";
import { useEffect, useState } from "react";

import {
  EMPTY_MPD_AGENT_STATE,
  MPD_AGENT_INSTANCE,
  MPD_AGENT_NAME,
  type MpdAgentState,
  type MpdPollMetrics,
} from "./mpd-agent-types";

const METRICS_REFRESH_MS = 10_000;

/** MpdAgent DO の poll_metrics（デバッグ表示用） */
export function useMpdAgentMetrics() {
  const agent = useAgent<MpdAgentState>({
    agent: MPD_AGENT_NAME,
    name: MPD_AGENT_INSTANCE,
  });
  const [metrics, setMetrics] = useState<MpdPollMetrics | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        await agent.ready;
        const raw = await agent.call("getPollMetrics", []);
        if (!cancelled) {
          setMetrics(raw as MpdPollMetrics);
          setLoadError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : String(e));
        }
      }
    };

    void load();
    const id = setInterval(() => void load(), METRICS_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [agent]);

  const agentState: MpdAgentState = agent.state ?? EMPTY_MPD_AGENT_STATE;

  return { metrics, loadError, agentState };
}
