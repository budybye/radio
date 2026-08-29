import { describe, expect, it } from "vitest";

import {
  MpcHttpError,
  MpdAckError,
  MpdTransportError,
} from "./errors";
import { mpdErrorHttpBody, mpdErrorHttpStatus } from "./mpd-http";

describe("mpdErrorHttpStatus", () => {
  it("maps upstream 404 to HTTP 404", () => {
    expect(
      mpdErrorHttpStatus(
        new MpcHttpError({ status: 404, url: "http://mpc/mpd.cgi" }),
      ),
    ).toBe(404);
  });

  it("maps bridge and transport failures to HTTP 502", () => {
    expect(
      mpdErrorHttpStatus(
        new MpcHttpError({ status: 503, url: "http://mpc/mpd.cgi" }),
      ),
    ).toBe(502);
    expect(
      mpdErrorHttpStatus(
        new MpdAckError({ cmd: "addid", preview: "ACK [4@0] invalid command" }),
      ),
    ).toBe(502);
    expect(
      mpdErrorHttpStatus(
        new MpdTransportError({ message: "socket closed" }),
      ),
    ).toBe(502);
  });
});

describe("mpdErrorHttpBody", () => {
  it("exposes tag and message for JSON boundaries", () => {
    const error = new MpdTransportError({ message: "timeout" });
    expect(mpdErrorHttpBody(error)).toEqual({
      error: "MpdTransportError",
      message: "timeout",
    });
  });
});
