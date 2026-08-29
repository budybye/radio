import { resolver } from "hono-openapi";

import { mpdErrorHttpBodySchema } from "../../schemas/openapi/common";

/** MPD JSON ルート共通エラー応答 */
export const mpdJsonErrorResponses = {
  404: {
    description: "Upstream resource not found",
    content: {
      "application/json": { schema: resolver(mpdErrorHttpBodySchema) },
    },
  },
  502: {
    description: "mpc-bridge or MPD failure",
    content: {
      "application/json": { schema: resolver(mpdErrorHttpBodySchema) },
    },
  },
} as const;
