import type { CurrentSongClient } from "./serialize";

const INSTRUMENTAL_TITLE_SUFFIX = /\s*[(–—-]\s*instrumental\s*\)?\s*$/i;

function cleanSongTitle(title: string): string {
  const cleaned = title.replace(INSTRUMENTAL_TITLE_SUFFIX, "").trim();
  return cleaned.length > 0 ? cleaned : title.trim();
}

function isInstrumentalTrack(title: string, file: string): boolean {
  return INSTRUMENTAL_TITLE_SUFFIX.test(title) || /instrumental/i.test(file);
}

export type NowPlayingDisplay = {
  headline: string;
  artist: string;
  album: string;
  variant: "instrumental" | null;
};

export function formatNowPlayingDisplay(
  song: Pick<CurrentSongClient, "title" | "artist" | "album" | "file"> | null,
  titleFallback: string,
): NowPlayingDisplay {
  if (!song) {
    return {
      headline: titleFallback,
      artist: "",
      album: "",
      variant: null,
    };
  }

  const variant = isInstrumentalTrack(song.title, song.file) ? "instrumental" : null;

  return {
    headline: cleanSongTitle(song.title),
    artist: song.artist.trim(),
    album: song.album.trim(),
    variant,
  };
}
