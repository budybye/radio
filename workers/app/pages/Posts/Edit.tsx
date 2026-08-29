import { Link, useForm } from '@inertiajs/react'
import type { PostsEditPageProps } from '../../types/inertia-pages'

export default function Edit({ post, errors }: PostsEditPageProps) {
  const form = useForm({
    file: post.file,
  })

  return (
    <main>
      <nav>
        <Link href={`/posts/${post.id}`}>← 詳細に戻る</Link>
      </nav>

      <h1>曲を編集</h1>
      <p>{post.title}{post.artist ? ` — ${post.artist}` : ''}</p>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.patch(`/posts/${post.id}`)
        }}
      >
        <div>
          <label htmlFor='file'>File</label>
          <input
            id='file'
            type='text'
            value={form.data.file}
            onChange={(e) => form.setData('file', e.target.value)}
          />
          {errors.file && <p>{errors.file}</p>}
        </div>

        <button type='submit' disabled={form.processing}>
          {form.processing ? '更新中...' : '更新'}
        </button>
      </form>
    </main>
  )
}
