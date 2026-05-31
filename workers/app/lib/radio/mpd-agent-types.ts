import type { CurrentSongPayload } from "./types";

/** MpdAgent DO instance name — shared by client + server */
export const MPD_AGENT_NAME = "MpdAgent";
export const MPD_AGENT_INSTANCE = "radio";

/** MpdAgent.setState payload (Agents SDK syncs to useAgent clients) */
export type MpdAgentState = {
  songid: string;
  song: Pick<CurrentSongPayload, "title" | "artist" | "album" | "file"> | null;
  mpdState: string | null;
  lastError: string | null;
  unchangedTicks: number;
};

/** useAgent 接続前（agent.state === undefined）のフォールバック */
export const EMPTY_MPD_AGENT_STATE: MpdAgentState = {
  songid: "",
  song: null,
  mpdState: null,
  lastError: null,
  unchangedTicks: 0,
};

/** DO SQL poll_metrics row exposed via @callable getPollMetrics */
export type MpdPollMetrics = {
  lastPollAt: number;
  lastSuccessAt: number;
  errorCount: number;
  pollCount: number;
  lastError: string | null;
};
