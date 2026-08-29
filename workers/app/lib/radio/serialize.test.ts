import { Result } from "better-result";
import * as v from "valibot";
import { describe, expect, it } from "vitest";

import {
  MpcHttpError,
  MpdAckError,
  MpdInvalidArgumentError,
  MpdTransportError,
} from "./errors";
import type { CurrentSongPayload } from "./types";
import {
  currentSongFromSerialized,
  deserializeCurrentSongView,
  hydrateMpdError,
  mpdErrorToWire,
  mpdWireEqual,
  mpdWireMessage,
  parseSerializedCurrentSongView,
  serializeMpdResult,
  type RpcSerializedEnvelopeWire,
} from "./serialize";
import { serializedEnvelopeSchema } from "./serialize-wire";

const sampleSong = {
  title: "Fixture",
  artist: "Test",
  album: "",
  file: "fixture.mp3",
  songid: "1",
} satisfies CurrentSongPayload;

const sampleCache = {
  title: "Cached",
  artist: "Artist",
  album: "",
  file: "cached.mp3",
  songid: "2",
} satisfies CurrentSongPayload;

describe("serializeMpdResult", () => {
  it("serializes ok values", () => {
    const song = sampleSong;
    expect(serializeMpdResult(Result.ok(song))).toEqual({
      status: "ok",
      value: song,
    });
  });

  it("serializes tagged errors to wire objects", () => {
    const serialized = serializeMpdResult(
      Result.err(new MpdAckError({ cmd: "status", preview: "ACK [4@0]" })),
    );
    expect(serialized).toEqual({
      status: "error",
      error: expect.objectContaining({
        _tag: "MpdAckError",
        cmd: "status",
      }),
    });
  });
});

describe("hydrateMpdError", () => {
  it("reconstructs known error tags", () => {
    const err = hydrateMpdError({
      _tag: "MpcHttpError",
      status: 404,
      url: "https://mpc.example/mpd.cgi",
    });
    expect(MpcHttpError.is(err)).toBe(true);
    if (MpcHttpError.is(err)) {
      expect(err.status).toBe(404);
    }
  });

  it("falls back to transport error for unknown tags", () => {
    const err = hydrateMpdError({ _tag: "UnknownError", message: "boom" });
    expect(MpdTransportError.is(err)).toBe(true);
  });

  it("round-trips MpdInvalidArgumentError", () => {
    const wire = mpdErrorToWire(new MpdInvalidArgumentError({ field: "file" }));
    const err = hydrateMpdError(wire);
    expect(MpdInvalidArgumentError.is(err)).toBe(true);
    if (MpdInvalidArgumentError.is(err)) {
      expect(err.field).toBe("file");
    }
  });
});

describe("mpdWire helpers", () => {
  it("compares wire errors by tag and message", () => {
    const a = mpdErrorToWire(new MpdTransportError({ message: "timeout" }));
    const b = mpdErrorToWire(new MpdTransportError({ message: "timeout" }));
    const c = mpdErrorToWire(new MpdTransportError({ message: "closed" }));
    expect(mpdWireEqual(a, b)).toBe(true);
    expect(mpdWireEqual(a, c)).toBe(false);
    expect(mpdWireMessage(a)).toBe("timeout");
  });
});

describe("parseSerializedCurrentSongView", () => {
  it("accepts ok envelopes", () => {
    const wire = {
      status: "ok",
      value: {
        title: "Live",
        artist: "Band",
        album: "",
        file: "live.mp3",
        songid: "3",
      },
    } satisfies RpcSerializedEnvelopeWire;
    expect(parseSerializedCurrentSongView(wire)).toEqual(wire);
  });

  it("accepts error envelopes with _tag", () => {
    const wire = {
      status: "error",
      error: { _tag: "MpdTransportError", message: "timeout" },
    } satisfies RpcSerializedEnvelopeWire;
    expect(parseSerializedCurrentSongView(wire)).toEqual(wire);
  });

  it("rejects malformed envelopes", () => {
    expect(parseSerializedCurrentSongView(null)).toBeNull();
    expect(v.safeParse(serializedEnvelopeSchema, { status: "error" }).success).toBe(
      false,
    );
    expect(
      v.safeParse(serializedEnvelopeSchema, {
        status: "error",
        error: { nope: true },
      }).success,
    ).toBe(false);
  });
});

describe("deserializeCurrentSongView", () => {
  it("restores ok values", () => {
    const value = {
      title: "A",
      artist: "B",
      album: "",
      file: "a.mp3",
      songid: "4",
    };
    const result = deserializeCurrentSongView({ status: "ok", value });
    expect(result.isOk() && result.value).toEqual(value);
  });

  it("restores hydrated errors", () => {
    const result = deserializeCurrentSongView({
      status: "error",
      error: { _tag: "MpdAckError", cmd: "play", preview: "ACK" },
    });
    expect(result.isErr() && MpdAckError.is(result.error)).toBe(true);
  });
});

describe("currentSongFromSerialized", () => {
  it("keeps cache on unchanged marker", () => {
    expect(
      currentSongFromSerialized(
        { status: "ok", value: { unchanged: true, songid: sampleCache.songid } },
        sampleCache,
      ),
    ).toEqual(sampleCache);
  });

  it("keeps cache on error", () => {
    const cache = sampleCache;
    expect(
      currentSongFromSerialized(
        {
          status: "error",
          error: { _tag: "MpdTransportError", message: "down" },
        },
        cache,
      ),
    ).toEqual(cache);
  });
});
