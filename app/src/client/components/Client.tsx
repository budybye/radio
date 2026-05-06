import { useState, useRef } from "hono/jsx/dom";

const MPD_URL = "https://mpd.044g.com/";

export function Client() {
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

  return (
    <div class="flex flex-col items-stretch justify-center min-h-screen">
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
