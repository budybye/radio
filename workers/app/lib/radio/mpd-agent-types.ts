import type { CurrentSongPayload } from "./types";

/** MpdAgent DO instance name — shared by client + server */
export const MPD_AGENT_NAME = "MpdAgent";
export const MPD_AGENT_INSTANCE = "radio";

/** useAgent の state 型 — MpdAgent.setState payload */
export type MpdAgentState = {
  songid: string;
  song: Pick<CurrentSongPayload, "title" | "artist" | "album" | "file"> | null;
  mpdState: string | null;
  listenerCount: number;
  lastError: string | null;
};
