import { Link } from "@inertiajs/react";
import type { QueueIndexPageProps } from "../../types/inertia-pages";

export default function Index({ tracks }: QueueIndexPageProps) {
  return (
    <main>
      <nav>
        <Link href="/">← Home</Link>
      </nav>

      <header>
        <h1>Playlist</h1>
        <Link href="/queue/new">+ 曲を追加</Link>
      </header>

      {tracks.length === 0 ? (
        <p>プレイリストに曲がありません</p>
      ) : (
        <ul>
          {tracks.map((song) => (
            <li key={song.id}>
              <h2>
                <Link href={`/queue/${song.id}`}>{song.title}</Link>
              </h2>
              {song.artist && <p>{song.artist}</p>}
              {song.album && <p>{song.album}</p>}
              <small>{song.file}</small>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
