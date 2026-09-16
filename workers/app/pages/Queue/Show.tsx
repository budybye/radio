import { Link, router } from "@inertiajs/react";
import type { QueueShowPageProps } from "../../types/inertia-pages";

function formatTime(seconds?: number) {
  if (seconds == null || !Number.isFinite(seconds)) return null;
  const minutes = Math.floor(seconds / 60);
  const secondsRemainder = seconds % 60;

  return `${minutes}:${String(secondsRemainder).padStart(2, "0")}`;
}

export default function Show({ song }: QueueShowPageProps) {
  const duration = formatTime(song.time);

  return (
    <main>
      <nav>
        <Link href="/queue">← Playlist</Link>
        <Link href={`/queue/${song.id}/edit`}>編集</Link>
      </nav>

      <article>
        <h1>{song.title}</h1>
        {song.artist && <p>{song.artist}</p>}
        {song.album && <p>{song.album}</p>}
        <p>{song.file}</p>
        {duration && <small>{duration}</small>}
      </article>

      <button
        type="button"
        onClick={() => {
          if (!confirm("プレイリストから削除しますか？")) return;
          router.delete(`/queue/${song.id}`);
        }}
      >
        削除
      </button>
    </main>
  );
}
