import { toJsonSchema } from "@valibot/to-json-schema";
import { describe, expect, it } from "vitest";

import { mpdAgentStateSchema } from "./agents";

describe("mpdAgentStateSchema", () => {
  it("converts MpdAgent state to JSON Schema for OpenAPI components", () => {
    const schema = toJsonSchema(mpdAgentStateSchema);
    expect(schema).toMatchObject({ type: "object" });
  });
});
