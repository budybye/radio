import type { PageProps } from "../pages.gen";
import { MpdAgentMetrics } from "../components/MpdAgentMetrics";
import { useRadioPlayer } from "../lib/radio/use-radio-player";

export default function Home({ song, config }: PageProps<"Home">) {
  const { audioRef, isPlaying, toggle, onAudioError, currentSong } =
    useRadioPlayer({
      initialSong: song ?? null,
      streamUrl: config.streamUrl,
    });

  const title = currentSong?.title ?? config.titleFallback;
  const artist = currentSong?.artist ?? "";

  return (
    <div className="flex flex-col items-stretch justify-center min-h-screen">
      <div className="text-center">
        <div className="text-xl font-bold">{title}</div>
        {artist && <p className="text-lg text-accent mt-2">{artist}</p>}
      </div>

      <audio
        className="hidden"
        ref={audioRef}
        preload="none"
        onError={onAudioError}
      />

      <button
        className="btn btn-circle mx-auto size-20 text-5xl"
        onClick={toggle}
      >
        {isPlaying ? "🔇" : "▶️"}
      </button>

      <MpdAgentMetrics />
    </div>
  );
}
