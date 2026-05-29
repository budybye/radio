import type { PageProps } from "../pages.gen";
import { useState, useRef } from "react";

const MPD_URL = "https://mpd.044g.com/";

export default function Home({ song, message }: PageProps<"Home">) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

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

  const title = song?.title ?? message;
  const artist = song?.artist ?? "";

  return (
    <div className="flex flex-col items-stretch justify-center min-h-screen">
      <div className="text-center">
        <div className="text-xl font-bold">{title}</div>
        {artist && <p className="text-lg text-accent mt-2">{artist}</p>}
      </div>

      <audio
        className="hidden"
        src={MPD_URL}
        ref={audioRef}
        onPlay={() => setIsPlaying(true)}
      />

      <button
        className="btn btn-circle mx-auto size-20 text-5xl"
        onClick={handleToggle}
      >
        {isPlaying ? "🔇" : "▶️"}
      </button>
    </div>
  );
}
