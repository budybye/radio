import { newHttpBatchRpcSession } from "capnweb";
import type { SerializedResult } from "better-result";

import type { MpdError } from "./errors";
import {
  currentSongFromSerialized,
  type CurrentSongClient,
} from "./serialize";
import type { CurrentSongView, RadioPublicApi } from "./types";

export type { CurrentSongClient };

let httpRpc: ReturnType<typeof newHttpBatchRpcSession<RadioPublicApi>> | undefined;

function radioHttpRpc() {
  httpRpc ??= newHttpBatchRpcSession<RadioPublicApi>("/rpc");
  return httpRpc;
}

/** HTTP batch — 外部クライアント / visibility フォールバック用 */
export async function pollCurrentSong(
  cache: CurrentSongClient | null,
): Promise<CurrentSongClient | null> {
  const serialized = await radioHttpRpc().getCurrentSong(cache?.songid);
  return currentSongFromSerialized(serialized, cache);
}

/** Cap'n Web 型（WS watch は MpdAgent Agents SDK を推奨） */
export type { RadioPublicApi, CurrentSongView };
export type { SerializedResult, MpdError };
