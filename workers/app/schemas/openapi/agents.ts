import * as v from "valibot";

const currentSongFieldsSchema = v.object({
  title: v.string(),
  artist: v.string(),
  album: v.string(),
  file: v.string(),
});

/** MpdAgent DO state（useAgent onStateUpdate payload） */
export const mpdAgentStateSchema = v.pipe(
  v.object({
    songid: v.string(),
    song: v.nullable(currentSongFieldsSchema),
    mpdState: v.nullable(v.string()),
    listenerCount: v.number(),
    lastError: v.nullable(v.string()),
  }),
  v.description("MpdAgent durable object broadcast state"),
  v.metadata({ ref: "MpdAgentState" }),
  v.examples([
    {
      songid: "42",
      song: {
        title: "Come Down Riddim (Instrumental)",
        artist: "Example Artist",
        album: "Example Album",
        file: "music/example/come-down-riddim.mp3",
      },
      mpdState: "play",
      listenerCount: 3,
      lastError: null,
    },
    {
      songid: "0",
      song: null,
      mpdState: "stop",
      listenerCount: 0,
      lastError: "mpc-bridge unreachable",
    },
  ]),
);
