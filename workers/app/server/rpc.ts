import { RpcTarget } from "capnweb";
import { Result } from "better-result";
import { env } from "cloudflare:workers";

import type {
  CurrentSongListener,
  CurrentSongSerialized,
  RadioPublicApi,
} from "../lib/radio/types";
import { getCurrentSongResult } from "./mpd";
import { mpdAgentStub } from "../../worker/mpd-agent";
import { watchTick } from "./mpd/watch-tick";

/**
 * Cap'n Web RPC 面（/rpc）。
 * MPD ポーリングは MpdAgent DO が担当 — ここは DO への薄いブリッジのみ。
 */
export class RadioApiServer extends RpcTarget implements RadioPublicApi {
  getCurrentSong(songid?: string): Promise<CurrentSongSerialized> {
    return getCurrentSongResult(songid).then(Result.serialize);
  }

  async watchCurrentSong(
    listener: CurrentSongListener,
    clientSongid?: string,
  ): Promise<void> {
    const stub = await mpdAgentStub(env);
    let subSongid = clientSongid;
    let epoch = await stub.getStateEpoch();

    for (;;) {
      const serialized = (await stub.getCurrentSongView(
        subSongid,
      )) as CurrentSongSerialized;
      const result = Result.deserialize(serialized);
      const tick = watchTick(result, subSongid);
      subSongid = tick.songid;
      if (tick.push) {
        const ok = await listener(serialized);
        if (!ok) break;
      }
      epoch = await stub.waitNextState(epoch);
    }
  }
}
