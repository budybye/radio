import { Link, useForm } from "@inertiajs/react";
import type { QueueEditPageProps } from "../../types/inertia-pages";

export default function Edit({ song, errors }: QueueEditPageProps) {
  const form = useForm({
    file: song.file,
  });

  return (
    <main>
      <nav>
        <Link href={`/queue/${song.id}`}>← 詳細に戻る</Link>
      </nav>

      <h1>曲を編集</h1>
      <p>
        {song.title}
        {song.artist ? ` — ${song.artist}` : ""}
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.patch(`/queue/${song.id}`);
        }}
      >
        <div>
          <label htmlFor="file">File</label>
          <input
            id="file"
            type="text"
            value={form.data.file}
            onChange={(e) => form.setData("file", e.target.value)}
          />
          {errors.file && <p>{errors.file}</p>}
        </div>

        <button type="submit" disabled={form.processing}>
          {form.processing ? "更新中..." : "更新"}
        </button>
      </form>
    </main>
  );
}
