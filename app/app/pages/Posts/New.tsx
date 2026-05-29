import { Link, useForm } from '@inertiajs/react'
import type { PageProps } from '../../pages.gen'

export default function New({ values, errors }: PageProps<'Posts/New'>) {
  const form = useForm(values)

  return (
    <main>
      <nav>
        <Link href='/posts'>← Playlist</Link>
      </nav>

      <h1>曲を追加</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.post('/posts')
        }}
      >
        <div>
          <label htmlFor='file'>File</label>
          <input
            id='file'
            type='text'
            placeholder='music/artist/album/track.mp3'
            value={form.data.file}
            onChange={(e) => form.setData('file', e.target.value)}
          />
          {errors.file && <p>{errors.file}</p>}
        </div>

        <button type='submit' disabled={form.processing}>
          {form.processing ? '追加中...' : '追加'}
        </button>
      </form>
    </main>
  )
}
