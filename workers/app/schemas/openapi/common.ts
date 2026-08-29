import * as v from "valibot";

/** HTTP JSON 境界の MPD エラー（mpd-http.ts と同型） */
export const mpdErrorHttpBodySchema = v.pipe(
  v.object({
    error: v.string(),
    message: v.string(),
  }),
  v.description("MPD / mpc-bridge error"),
  v.metadata({ ref: "MpdErrorHttpBody" }),
);
