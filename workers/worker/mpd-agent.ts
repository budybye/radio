import { Agent, callable, getAgentByName, StreamingResponse } from "agents";
import { Result, type SerializedResult } from "better-result";

import {
  CURRENT_SONG_POLL_MS,
  CURRENT_SONG_UNCHANGED_POLL_MS,
} from "../app/lib/radio/constants";
import { MpdTransportError, type MpdError } from "../app/lib/radio/errors";
import {
  MPD_AGENT_INSTANCE,
  type MpdAgentState,
  type MpdPollMetrics,
} from "../app/lib/radio/mpd-agent-types";
import type {
  CurrentSongPayload,
  CurrentSongView,
} from "../app/lib/radio/types";
import { mpdBridgeCommand } from "../app/server/mpd/bridge";
import { parseMpdResponse } from "../app/server/mpd/parse";
import { recordToCurrentSong } from "../app/server/mpd/song";
import { watchTick } from "../app/server/mpd/watch-tick";

export { MPD_AGENT_INSTANCE };

type StateWaiter = { epoch: number; resolve: () => void };

export class MpdAgent extends Agent<CloudflareEnv, MpdAgentState> {
  override initialState: MpdAgentState = {
    songid: "",
    song: null,
    mpdState: null,
    lastError: null,
    unchangedTicks: 0,
  };

  private stateEpoch = 0;
  private stateWaiters: StateWaiter[] = [];

  override async onStart() {
    this.initMetricsSchema();
    await this.schedule(0, "pollTick", undefined, { idempotent: true });
  }

  private initMetricsSchema() {
    this.sql`
      CREATE TABLE IF NOT EXISTS poll_metrics (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        last_poll_at INTEGER NOT NULL DEFAULT 0,
        last_success_at INTEGER NOT NULL DEFAULT 0,
        error_count INTEGER NOT NULL DEFAULT 0,
        poll_count INTEGER NOT NULL DEFAULT 0,
        last_error TEXT
      )
    `;
    this.sql`INSERT OR IGNORE INTO poll_metrics (id) VALUES (1)`;
  }

  private bumpStateEpoch() {
    this.stateEpoch++;
    const waiters = this.stateWaiters;
    this.stateWaiters = [];
    for (const w of waiters) {
      if (this.stateEpoch > w.epoch) w.resolve();
    }
  }

  private waitForStateChange(afterEpoch: number, timeoutMs = 60_000): Promise<void> {
    if (this.stateEpoch > afterEpoch) return Promise.resolve();
    return new Promise((resolve) => {
      const timer = setTimeout(resolve, timeoutMs);
      this.stateWaiters.push({
        epoch: afterEpoch,
        resolve: () => {
          clearTimeout(timer);
          resolve();
        },
      });
    });
  }

  private commitState(next: MpdAgentState) {
    this.setState(next);
    this.bumpStateEpoch();
  }

  private recordPoll(success: boolean, error?: string) {
    const now = Date.now();
    if (success) {
      this.sql`
        UPDATE poll_metrics SET
          last_poll_at = ${now},
          last_success_at = ${now},
          poll_count = poll_count + 1,
          last_error = NULL
        WHERE id = 1
      `;
    } else {
      this.sql`
        UPDATE poll_metrics SET
          last_poll_at = ${now},
          error_count = error_count + 1,
          poll_count = poll_count + 1,
          last_error = ${error ?? "unknown"}
        WHERE id = 1
      `;
    }
  }

  async pollTick() {
    const changed = await this.tick();
    this.commitState({
      ...this.state,
      unchangedTicks: changed ? 0 : this.state.unchangedTicks + 1,
    });

    const delaySec =
      this.state.unchangedTicks >= 2
        ? CURRENT_SONG_UNCHANGED_POLL_MS / 1000
        : CURRENT_SONG_POLL_MS / 1000;
    await this.schedule(delaySec, "pollTick");
  }

  private bridge(cmd: string) {
    return this.retry(
      () => mpdBridgeCommand(this.env.MPC_HOST, cmd),
      { maxAttempts: 3 },
    );
  }

  private async tick(): Promise<boolean> {
    const status = await this.bridge("status");
    if (status.isErr()) {
      this.recordPoll(false, status.error.message);
      this.commitState({
        ...this.state,
        lastError: status.error.message,
      });
      return true;
    }

    const parsed = parseMpdResponse(status.value);
    const songid = parsed.songid ?? "";
    const mpdState = parsed.state ?? null;
    let song = this.state.song;
    let changed =
      songid !== this.state.songid || mpdState !== this.state.mpdState;

    if (songid !== this.state.songid) {
      if (!songid) {
        song = null;
      } else {
        const current = await this.bridge("currentsong");
        if (current.isErr()) {
          this.recordPoll(false, current.error.message);
          this.commitState({
            ...this.state,
            lastError: current.error.message,
          });
          return true;
        }
        song = recordToCurrentSong(parseMpdResponse(current.value)) ?? null;
      }
      changed = true;
    }

    this.recordPoll(true);
    this.commitState({
      songid,
      song,
      mpdState,
      lastError: null,
      unchangedTicks: this.state.unchangedTicks,
    });
    return changed;
  }

  private viewForSubscriber(clientSongid?: string): Result<CurrentSongView, MpdError> {
    if (this.state.lastError) {
      return Result.err(new MpdTransportError({ message: this.state.lastError }));
    }

    const songid = this.state.songid;
    if (clientSongid !== undefined && clientSongid === songid) {
      return Result.ok({ unchanged: true as const, songid });
    }
    if (!songid) return Result.ok(null);
    if (!this.state.song) return Result.ok(null);
    return Result.ok({ ...this.state.song, songid } satisfies CurrentSongPayload);
  }

  @callable()
  getCurrentSongView(clientSongid?: string): SerializedResult<CurrentSongView, MpdError> {
    return Result.serialize(this.viewForSubscriber(clientSongid));
  }

  /** Cap'n Web / Worker ブリッジ用 — state 変化待ち（固定 sleep 不要） */
  @callable()
  getStateEpoch(): number {
    return this.stateEpoch;
  }

  @callable()
  async waitNextState(afterEpoch: number): Promise<number> {
    await this.waitForStateChange(afterEpoch);
    return this.stateEpoch;
  }

  @callable()
  getPollMetrics(): MpdPollMetrics {
    const [row] = this.sql<{
      last_poll_at: number;
      last_success_at: number;
      error_count: number;
      poll_count: number;
      last_error: string | null;
    }>`SELECT last_poll_at, last_success_at, error_count, poll_count, last_error FROM poll_metrics WHERE id = 1`;

    return {
      lastPollAt: row?.last_poll_at ?? 0,
      lastSuccessAt: row?.last_success_at ?? 0,
      errorCount: row?.error_count ?? 0,
      pollCount: row?.poll_count ?? 0,
      lastError: row?.last_error ?? null,
    };
  }

  @callable({ streaming: true })
  async watchCurrentSong(
    stream: StreamingResponse,
    clientSongid?: string,
  ): Promise<void> {
    let subSongid = clientSongid;
    let epoch = this.stateEpoch;

    try {
      while (!stream.isClosed) {
        const view = this.viewForSubscriber(subSongid);
        const tick = watchTick(view, subSongid);
        subSongid = tick.songid;
        if (tick.push && !stream.send(Result.serialize(view))) break;

        await this.waitForStateChange(epoch);
        epoch = this.stateEpoch;
      }
      stream.end();
    } catch (e) {
      stream.error(e instanceof Error ? e.message : String(e));
    }
  }
}

export async function mpdAgentStub(env: CloudflareEnv) {
  return getAgentByName(env.MpdAgent, MPD_AGENT_INSTANCE);
}
