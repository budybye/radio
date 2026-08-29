import { describe, expect, it } from "vitest";

import {
  cleanSongTitle,
  formatNowPlayingDisplay,
  isInstrumentalTrack,
} from "./now-playing";

describe("now-playing display", () => {
  it("strips trailing (Instrumental) from title", () => {
    expect(cleanSongTitle("Ghetto Red Hot (Instrumental)")).toBe(
      "Ghetto Red Hot",
    );
  });

  it("strips trailing - Instrumental from title", () => {
    expect(cleanSongTitle("Ghetto Red Hot - Instrumental")).toBe(
      "Ghetto Red Hot",
    );
  });

  it("keeps non-instrumental titles unchanged", () => {
    expect(cleanSongTitle("RAGGAMUFFIN LIFE")).toBe("RAGGAMUFFIN LIFE");
  });

  it("detects instrumental tracks from title or filename", () => {
    expect(
      isInstrumentalTrack(
        "Ghetto Red Hot (Instrumental)",
        "Super Cat - Ghetto Red Hot - Instrumental.mp3",
      ),
    ).toBe(true);
    expect(isInstrumentalTrack("Plain Song", "artist/plain.mp3")).toBe(false);
  });

  it("formats artist + cleaned headline + instrumental variant", () => {
    expect(
      formatNowPlayingDisplay(
        {
          title: "Ghetto Red Hot (Instrumental)",
          artist: "Super Cat",
          album: "",
          file: "Super Cat - Ghetto Red Hot - Instrumental.mp3",
          songid: "42",
        },
        "320kbps",
      ),
    ).toEqual({
      headline: "Ghetto Red Hot",
      artist: "Super Cat",
      album: "",
      variant: "instrumental",
    });
  });
});
