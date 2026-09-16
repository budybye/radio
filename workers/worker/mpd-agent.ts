import { Agent, callable, getCurrentAgent, type Connection, type ConnectionContext } from "agents";
import { Result } from "better-result";

import {
  CURRENT_SONG_POLL_MS,
  CURRENT_SONG_UNCHANGED_POLL_MS,
  WATCH_POLL_MS,
} from "../app/lib/radio/constants";
import { MpdAckError, mpdErrorFromUnknown, type MpdError } from "../app/lib/radio/errors";
import type { MpdAgentState } from "../app/lib/radio/mpd-agent-types";
import {
  hydrateMpdError,
  mpdErrorToWire,
  mpdWireEqual,
  serializeMpdResult,
  type SerializedMpdResult,
} from "../app/lib/radio/serialize";
import type { CurrentSongPayload, CurrentSongView } from "../app/lib/radio/types";
import { mpcAccessFromEnv, mpdBridgeCommand } from "../app/server/mpd/bridge";
import { recordToCurrentSong } from "../app/server/mpd/song";
import { parseMpdRecord, parseMpdStatus } from "../app/server/mpd/parse";

/** 連続無変換 tick 数がこの値以上でスローポーリングへ切り替え */
const IDLE_STREAK_FOR_SLOW_POLL = 2;

const DEFAULT_CLIENT_CONNECTION_STATE: MpdClientConnectionState = {
  playbackActive: false,
  watchActive: false,
};

type MpdClientConnectionState = {
  playbackActive: boolean;
  watchActive: boolean;
};

type MpdPollOutcome = {
  /** 次に採用候補の state（hasChanged のときだけ setState する） */
  nextState: MpdAgentState;
  /** クライアントに見える変化があったか */
  hasChanged: boolean;
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

  /** リスナーは DO 状態を変更できない（pollTick のみが setState する） */
  override shouldConnectionBeReadonly(_connection: Connection, _ctx: ConnectionContext): boolean {
    return true;
  }

  /** pollTick 自己再スケジュール連鎖が生きているか（メモリ内フラグ） */
  private isPollChainActive = false;
  /** 連続「変化なし」tick 数（エラーも含む）。ケイデンス決定に使用 */
  private unchangedPollStreak = 0;

  private listClientConnections() {
    return [...this.getConnections<MpdClientConnectionState>()];
  }

  private hasActivePlaybackClient() {
    return this.listClientConnections().some(
      (connection) => connection.state?.playbackActive === true,
    );
  }

  private countActivePlaybackClients(): number {
    return this.listClientConnections().filter(
      (connection) => connection.state?.playbackActive === true,
    ).length;
  }

  private hasActiveWatchClient() {
    return this.listClientConnections().some(
      (connection) => connection.state?.watchActive === true,
    );
  }

  private hasPollingInterest() {
    return this.hasActivePlaybackClient() || this.hasActiveWatchClient();
  }

  private ensurePollingChain() {
    if (this.isPollChainActive || !this.hasPollingInterest()) return;
    this.isPollChainActive = true;
    void this.schedule(0, "pollTick", undefined, { idempotent: true });
  }

  private updateCurrentConnectionState(patch: Partial<MpdClientConnectionState>): boolean {
    const { connection } = getCurrentAgent<MpdAgent>();

    if (!connection) return false;
    connection.setState(
      (previousState: MpdClientConnectionState = DEFAULT_CLIENT_CONNECTION_STATE) => ({
        ...previousState,
        ...patch,
      }),
    );

    return true;
  }

  override async onStart() {
    // 休眠・eviction 後は in-memory フラグが消える。接続 state は SQLite に残る。
    this.isPollChainActive = false;
    this.unchangedPollStreak = 0;

    if (this.hasPollingInterest()) {
      this.ensurePollingChain();
    }
  }

  @callable()
  async setPlaybackActive(isPlaybackActive: boolean) {
    if (!this.updateCurrentConnectionState({ playbackActive: isPlaybackActive })) return;

    if (!isPlaybackActive) return;
    this.ensurePollingChain();
    const outcome = await this.pollMpdState(this.state);

    if (outcome.hasChanged) this.setState(outcome.nextState);
  }

  /** Play 後の watch 用。接続直後の tick は pollTick 連鎖に任せる（余分な bridge 呼び出しを避ける） */
  @callable()
  async setWatchActive(isWatchActive: boolean) {
    if (!this.updateCurrentConnectionState({ watchActive: isWatchActive })) return;

    if (!isWatchActive) return;
    this.ensurePollingChain();
  }

  async pollTick() {
    // 再生中の接続がなければ連鎖を止めて DO を眠らせる。
    // hibernated WS は残っていても playbackActive=false なら polling しない。
    if (!this.hasPollingInterest()) {
      this.isPollChainActive = false;

      return;
    }

    const outcome = await this.pollMpdState(this.state);
    this.unchangedPollStreak = outcome.hasChanged ? 0 : this.unchangedPollStreak + 1;

    // 変化があった tick だけ SQLite 書き込み + 全接続へのブロードキャスト
    if (outcome.hasChanged) this.setState(outcome.nextState);

    const delaySec = this.hasActivePlaybackClient()
      ? this.unchangedPollStreak >= IDLE_STREAK_FOR_SLOW_POLL
        ? CURRENT_SONG_UNCHANGED_POLL_MS / 1000
        : CURRENT_SONG_POLL_MS / 1000
      : WATCH_POLL_MS / 1000;

    await this.schedule(delaySec, "pollTick");
  }

  /** Tunnel 経由は不安定。Result を throw に変換して SDK retry（jitter backoff）に乗せる */
  private async executeMpdCommand(command: string): Promise<Result<string, MpdError>> {
    try {
      return await this.retry(
        async () => {
          const commandResult = await mpdBridgeCommand(
            this.env.MPC_HOST,
            command,
            mpcAccessFromEnv(this.env),
            this.env.MPC_BRIDGE_BASE_URL,
          );

          if (commandResult.isErr()) throw commandResult.error;

          return commandResult;
        },
        // ACK は決定的（MPD がコマンドを拒否）なのでリトライしない
        { maxAttempts: 3, shouldRetry: (retryError) => !MpdAckError.is(retryError) },
      );
    } catch (cause) {
      return Result.err(mpdErrorFromUnknown(cause));
    }
  }

  /**
   * MPD status を1回読み、次 state 候補を返す。書き込みは呼び出し側に任せる。
   * エラーは lastError wire が変わったときだけ changed 扱い（障害中もスローケイデンスに乗る）。
   */
  private async pollMpdState(previousState: MpdAgentState): Promise<MpdPollOutcome> {
    const statusResult = await this.executeMpdCommand("status");

    if (statusResult.isErr()) {
      const errorWire = mpdErrorToWire(statusResult.error);

      return {
        nextState: { ...previousState, lastError: errorWire },
        hasChanged: !mpdWireEqual(errorWire, previousState.lastError),
      };
    }

    const parsedStatus = parseMpdStatus(statusResult.value);
    const songId = parsedStatus.status.songid ?? "";
    const mpdState = parsedStatus.status.state ?? null;

    const listenerCount = Math.max(parsedStatus.listenerCount, this.countActivePlaybackClients());

    let currentSong = previousState.song;

    if (songId !== previousState.songid) {
      if (!songId) {
        currentSong = null;
      } else {
        const currentSongResult = await this.executeMpdCommand("currentsong");

        if (currentSongResult.isErr()) {
          const errorWire = mpdErrorToWire(currentSongResult.error);

          return {
            nextState: { ...previousState, lastError: errorWire },
            hasChanged: !mpdWireEqual(errorWire, previousState.lastError),
          };
        }

        currentSong = recordToCurrentSong(parseMpdRecord(currentSongResult.value)) ?? null;
      }
    }

    return {
      nextState: {
        songid: songId,
        song: currentSong,
        mpdState,
        listenerCount,
        lastError: null,
      },
      hasChanged:
        songId !== previousState.songid ||
        mpdState !== previousState.mpdState ||
        listenerCount !== previousState.listenerCount ||
        currentSong !== previousState.song ||
        previousState.lastError !== null,
    };
  }

  private buildCurrentSongView(clientSongId?: string): Result<CurrentSongView, MpdError> {
    if (this.state.lastError) {
      return Result.err(hydrateMpdError(this.state.lastError));
    }

    const songId = this.state.songid;

    if (clientSongId !== undefined && clientSongId === songId) {
      return Result.ok({ unchanged: true as const, songid: songId });
    }

    if (!songId) return Result.ok(null);

    if (!this.state.song) return Result.ok(null);

    return Result.ok({
      ...this.state.song,
      songid: songId,
    } satisfies CurrentSongPayload);
  }

  /**
   * SSR / 手動 refresh 用。接続中クライアントがいなければ 1 回 poll してから返す
   * （冷起動 DO が initialState のまま返すのを防ぐ）。
   */
  @callable()
  async getCurrentSongView(clientSongId?: string): Promise<SerializedMpdResult<CurrentSongView>> {
    if (!this.hasPollingInterest()) {
      const outcome = await this.pollMpdState(this.state);

      if (outcome.hasChanged) this.setState(outcome.nextState);
    }

    return serializeMpdResult(this.buildCurrentSongView(clientSongId));
  }
}
