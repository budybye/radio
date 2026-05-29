import { Link, router } from '@inertiajs/react'
import type { PageProps } from '../../pages.gen'

function formatTime(seconds?: number) {
  if (seconds == null || !Number.isFinite(seconds)) return null
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function Show({ post }: PageProps<'Posts/Show'>) {
  const duration = formatTime(post.time)

  return (
    <main>
      <nav>
        <Link href='/posts'>← Playlist</Link>
        <Link href={`/posts/${post.id}/edit`}>編集</Link>
      </nav>

      <article>
        <h1>{post.title}</h1>
        {post.artist && <p>{post.artist}</p>}
        {post.album && <p>{post.album}</p>}
        <p>{post.file}</p>
        {duration && <small>{duration}</small>}
      </article>

      <button
        type='button'
        onClick={() => {
          if (!confirm('プレイリストから削除しますか？')) return
          router.delete(`/posts/${post.id}`)
        }}
      >
        削除
      </button>
    </main>
  )
}
