import { Link } from "@inertiajs/react";
import type { PageProps } from "../../pages.gen";

export default function Index({ posts }: PageProps<'Posts/Index'>) {
  return (
    <main>
      <nav>
        <Link href="/">← Home</Link>
      </nav>

      <header>
        <h1>Playlist</h1>
        <Link href="/posts/new">+ 曲を追加</Link>
      </header>

      {posts.length === 0 ? (
        <p>プレイリストに曲がありません</p>
      ) : (
        <ul>
          {posts.map((song) => (
            <li key={song.id}>
              <h2>
                <Link href={`/posts/${song.id}`}>{song.title}</Link>
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
