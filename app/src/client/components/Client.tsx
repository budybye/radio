import { useState, useRef, useEffect, useCallback } from "hono/jsx/dom";
import { hc } from "hono/client";
import type { AppType } from "../../index";

const MPD_URL = "https://mpd.044g.com/";

interface SongInfo {
  Title?: string;
  Artist?: string;
  file?: string;
}

const client = hc<AppType>("/");

export function Client() {
  const [song, setSong] = useState<SongInfo>({});
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const fetchSong = useCallback(async () => {
    const res = await client.api.currentsong.$get();
    const data = await res.json();
    setSong(data);
  }, [client]);

  useEffect(() => {
    fetchSong();
    const interval = setInterval(fetchSong, 30000);
    return () => clearInterval(interval);
  }, [fetchSong]);

  const handleToggle = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.muted = true;
      setIsPlaying(false);
    } else {
      audio.muted = false;
      audio.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const title = song.Title || song.file || "Unknown";
  const artist = song.Artist || "";

  return (
    <div class="flex flex-col items-stretch justify-center min-h-screen">
      <div class="text-center">
        <div class="text-xl font-bold">{title}</div>
        {artist && <p class="text-lg text-accent mt-2">{artist}</p>}
      </div>

      <audio
        class="hidden"
        src={MPD_URL}
        ref={audioRef}
        onPlay={() => setIsPlaying(true)}
      />

      <button
        class="btn btn-circle mx-auto size-20 text-5xl"
        onClick={handleToggle}
      >
        {isPlaying ? "🔇" : "▶️"}
      </button>
    </div>
  );
}
