import { toJsonSchema } from "@valibot/to-json-schema";
import { describe, expect, it } from "vitest";

import {
  currentSongQuerySchema,
  mpdStatusResponseSchema,
  serializedMpdResultSchema,
} from "./mpd";

describe("openapi wire schemas", () => {
  it("converts mpd status to JSON Schema", () => {
    const schema = toJsonSchema(mpdStatusResponseSchema);
    expect(schema).toMatchObject({ type: "object" });
  });

  it("converts SerializedMpdResult to JSON Schema", () => {
    const schema = toJsonSchema(serializedMpdResultSchema);
    expect(schema).toBeDefined();
  });

  it("includes OpenAPI examples on currentsong query schema", () => {
    const raw = toJsonSchema(currentSongQuerySchema);
    // SAFETY: valibot JSON Schema output is object-shaped; we only read optional examples.
    const schema = raw as { examples?: unknown[] };
    expect(schema.examples?.length).toBeGreaterThan(0);
  });
});
