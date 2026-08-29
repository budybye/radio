import { Agent, callable, getAgentByName, getCurrentAgent } from "agents";
import { Result } from "better-result";

import {
  CURRENT_SONG_POLL_MS,
  CURRENT_SONG_UNCHANGED_POLL_MS,
  WATCH_POLL_MS,
} from "../app/lib/radio/constants";
import {
  MpdAckError,
  MpdTransportError,
  mpdErrorFromUnknown,
  type MpdError,
} from "../app/lib/radio/errors";
import {
  MPD_AGENT_INSTANCE,
  type MpdAgentState,
} from "../app/lib/radio/mpd-agent-types";
import { serializeMpdResult, type SerializedMpdResult } from "../app/lib/radio/serialize";
import type {
  CurrentSongPayload,
  CurrentSongView,
} from "../app/lib/radio/types";
import {
  mpcAccessFromEnv,
  mpdBridgeCommand,
} from "../app/server/mpd/bridge";
import { recordToCurrentSong } from "../app/server/mpd/song";
import {
  parseMpdRecord,
  parseMpdStatus,
} from "../app/server/mpd/parse";

/** 連続無変換 tick 数がこの値以上でスローポーリングへ切り替え */
const IDLE_STREAK_FOR_SLOW_POLL = 2;

type ClientConnectionState = {
  playbackActive: boolean;
  watchActive: boolean;
};

type TickOutcome = {
  /** 次に採用候補の state（changed のときだけ setState する） */
  state: MpdAgentState;
  /** クライアントに見える変化があったか */
  changed: boolean;
};

export class MpdAgent extends Agent<CloudflareEnv, MpdAgentState> {
  static override options = {
    hibernate: true,
    hungScheduleTimeoutSeconds: 120, //bridge+Tunnel が遅いとき
  };

  override initialState: MpdAgentState = {
    songid: "",
    song: null,
    mpdState: null,
    listenerCount: 0,
    lastError: null,
  };

  /** pollTick 自己再スケジュール連鎖が生きているか（メモリ内フラグ） */
  private pollChainActive = false;
  /** 連続「変化なし」tick 数（エラーも含む）。ケイデンス決定に使用 */
  private idleStreak = 0;

  private getClientConnections() {
    return [...this.getConnections<ClientConnectionState>()];
  }

  private hasActivePlayback() {
    return this.getClientConnections().some(
      (connection) => connection.state?.playbackActive === true,
    );
  }

  private hasActiveWatch() {
    return this.getClientConnections().some(
      (connection) => connection.state?.watchActive === true,
    );
  }

  private hasPollingInterest() {
    return this.hasActivePlayback() || this.hasActiveWatch();
  }

  private ensurePollChain() {
    if (this.pollChainActive || !this.hasPollingInterest()) return;
    this.pollChainActive = true;
    void this.schedule(0, "pollTick", undefined, { idempotent: true });
  }

  override async onStart() {
    // 休眠・eviction 後は in-memory フラグが消える。接続 state は SQLite に残る。
    this.pollChainActive = false;
    this.idleStreak = 0;
    if (this.hasPollingInterest()) {
      this.ensurePollChain();
    }
  }

  @callable()
  setPlaybackActive(active: boolean) {
    const { connection } = getCurrentAgent<MpdAgent>();
    if (!connection) return;
    connection.setState((prev: ClientConnectionState = { playbackActive: false, watchActive: false }) => ({
      ...prev,
      playbackActive: active,
    }));
    if (active) this.ensurePollChain();
  }

  /** Home 等マウント中は低速ポーリングで listener / mpdState を配信 */
  @callable()
  setWatchActive(active: boolean) {
    const { connection } = getCurrentAgent<MpdAgent>();
    if (!connection) return;
    connection.setState((prev: ClientConnectionState = { playbackActive: false, watchActive: false }) => ({
      ...prev,
      watchActive: active,
    }));
    if (active) this.ensurePollChain();
  }

  async pollTick() {
    // 再生中の接続がなければ連鎖を止めて DO を眠らせる。
    // hibernated WS は残っていても playbackActive=false なら polling しない。
    if (!this.hasPollingInterest()) {
      this.pollChainActive = false;
      return;
    }

    const outcome = await this.tick(this.state);
    this.idleStreak = outcome.changed ? 0 : this.idleStreak + 1;
    // 変化があった tick だけ SQLite 書き込み + 全接続へのブロードキャスト
    if (outcome.changed) this.setState(outcome.state);

    const delaySec = this.hasActivePlayback()
      ? this.idleStreak >= IDLE_STREAK_FOR_SLOW_POLL
        ? CURRENT_SONG_UNCHANGED_POLL_MS / 1000
        : CURRENT_SONG_POLL_MS / 1000
      : WATCH_POLL_MS / 1000;
    await this.schedule(delaySec, "pollTick");
  }

  /** Tunnel 経由は不安定。Result を throw に変換して SDK retry（jitter backoff）に乗せる */
  private async bridge(cmd: string): Promise<Result<string, MpdError>> {
    try {
      return await this.retry(
        async () => {
          const res = await mpdBridgeCommand(
            this.env.MPC_HOST,
            cmd,
            mpcAccessFromEnv(this.env),
            this.env.MPC_BRIDGE_BASE_URL,
          );
          if (res.isErr()) throw res.error;
          return res;
        },
        // ACK は決定的（MPD がコマンドを拒否）なのでリトライしない
        { maxAttempts: 3, shouldRetry: (err) => !MpdAckError.is(err) },
      );
    } catch (err) {
      return Result.err(mpdErrorFromUnknown(err));
    }
  }

  /**
   * MPD status を1回読み、次 state 候補を返す。書き込みは呼び出し側に任せる。
   * エラーは lastError のテキストが変わったときだけ changed 扱い（障害中もスローケイデンスに乗る）。
   */
  private async tick(prev: MpdAgentState): Promise<TickOutcome> {
    const status = await this.bridge("status");
    if (status.isErr()) {
      const error = status.error.message;
      return {
        state: { ...prev, lastError: error },
        changed: error !== prev.lastError,
      };
    }

    const parsed = parseMpdStatus(status.value);
    const songid = parsed.status.songid ?? "";
    const mpdState = parsed.status.state ?? null;
    const listenerCount = parsed.listenerCount;
    let song = prev.song;

    if (songid !== prev.songid) {
      if (!songid) {
        song = null;
      } else {
        const current = await this.bridge("currentsong");
        if (current.isErr()) {
          const error = current.error.message;
          return {
            state: { ...prev, lastError: error },
            changed: error !== prev.lastError,
          };
        }
        song = recordToCurrentSong(parseMpdRecord(current.value)) ?? null;
      }
    }

    return {
      state: { songid, song, mpdState, listenerCount, lastError: null },
      changed:
        songid !== prev.songid ||
        mpdState !== prev.mpdState ||
        listenerCount !== prev.listenerCount ||
        song !== prev.song ||
        prev.lastError !== null,
    };
  }


  private viewForSubscriber(
    clientSongid?: string,
  ): Result<CurrentSongView, MpdError> {
    if (this.state.lastError) {
      return Result.err(
        new MpdTransportError({
          message: this.state.lastError,
        }),
      );
    }

    const songid = this.state.songid;
    if (clientSongid !== undefined && clientSongid === songid) {
      return Result.ok({ unchanged: true as const, songid });
    }
    if (!songid) return Result.ok(null);
    if (!this.state.song) return Result.ok(null);
    return Result.ok({
      ...this.state.song,
      songid,
    } satisfies CurrentSongPayload);
  }

  @callable()
  getCurrentSongView(
    clientSongid?: string,
  ): SerializedMpdResult<CurrentSongView> {
    return serializeMpdResult(this.viewForSubscriber(clientSongid));
  }
}

function requireMpdAgentNamespace(
  env: CloudflareEnv,
): DurableObjectNamespace<MpdAgent> {
  const ns = env.MpdAgent;
  if (!ns) {
    throw new Error("MpdAgent binding is not configured in this environment");
  }
  return ns;
}

export async function mpdAgentStub(env: CloudflareEnv) {
  return getAgentByName(requireMpdAgentNamespace(env), MPD_AGENT_INSTANCE);
}
