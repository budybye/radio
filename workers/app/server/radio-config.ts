import { env } from "cloudflare:workers";

import { TITLE_FALLBACK } from "../lib/radio/constants";
import type { RadioConfig } from "../lib/radio/types";

/** SSR props 用。クライアント constants 直書きを避ける。 */
export function radioConfig(): RadioConfig {
  return {
    streamUrl: `https://${env.MPD_HOST}/`,
    titleFallback: TITLE_FALLBACK,
  };
}
