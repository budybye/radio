# hono-inertia-react-tutorial

`@hono/inertia` の公式アダプタを使った、Hono × Inertia.js × React のミニマルなチュートリアルアプリ。Cloudflare Workers + Vite + Bun で動く Posts CRUD。

API レイヤーを書かずに「サーバが返すコンポーネント名と props」で SPA が成立するという、Inertia の核心を体験できる構成にしてある。

## スタック

- [Hono](https://hono.dev/) — Edge ファースト Web FW
- [@hono/inertia](https://github.com/honojs/middleware/tree/main/packages/inertia) — 公式 Inertia アダプタ
- [@inertiajs/react](https://inertiajs.com/) — Inertia クライアント (React)
- [Cloudflare Workers](https://workers.cloudflare.com/) — Vite plugin 経由で dev / deploy
- [Vite](https://vite.dev/) + [vite-ssr-components](https://github.com/yusukebe/vite-ssr-components)
- [Zod 4](https://zod.dev/) — schema 駆動の型 + バリデーション
- [Bun](https://bun.sh/) — パッケージマネージャ / ランタイム

## はじめかた

```sh
bun install
bun run dev
# → http://localhost:5173
```

主要スクリプト:

```sh
bun run dev         # vite dev (CF Workers 環境を Miniflare で再現)
bun run build       # vite build (dist/ に Worker + 静的アセット出力)
bun run preview     # vite preview
bun run deploy      # vite build && wrangler deploy
bun run typecheck   # tsc --noEmit
```

## ディレクトリ構成

```
.
├── app/
│   ├── client.tsx         # Inertia クライアント入口
│   ├── style.css
│   ├── inertia.tsx        # Inertia SSR シェル (rootView)
│   ├── lib/               # 共有ロジック
│   │   ├── validation.ts
│   │   └── radio/         # 型・定数・serialize・ブラウザ RPC
│   ├── schemas/           # Valibot スキーマ
│   ├── server/            # Hono アプリ本体 (Worker SSR entry)
│   │   ├── index.tsx
│   │   ├── posts.ts
│   │   ├── mpd/           # MPD コマンド + REST routes
│   │   ├── rpc.ts         # capnweb RpcTarget
│   ├── pages/             # Inertia ページコンポーネント (React)
│   │   ├── Home.tsx
│   │   └── Posts/
│   └── pages.gen.ts       # @hono/inertia/vite が自動生成 (型ファイル)
├── worker/                # Wrangler entry
├── vite.config.ts
├── wrangler.jsonc
└── tsconfig.json
```

機能を増やすときに触るのは基本的に `app/server/index.tsx` と `app/pages/*.tsx`、必要なら `app/server/posts.ts` の 3 箇所だけ。

## ルート一覧

| Method | Path | ページ |
|---|---|---|
| GET | `/` | Home |
| GET | `/posts` | Posts/Index |
| GET | `/posts/:id` | Posts/Show |
| GET | `/posts/new` | Posts/New |
| POST | `/posts` | (create → redirect to Show) |
| GET | `/posts/:id/edit` | Posts/Edit |
| PATCH | `/posts/:id` | (update → redirect to Show) |
| DELETE | `/posts/:id` | (delete → redirect to Index) |

## メモ

- データは現状 in-memory。CF Workers の isolate を跨ぐと飛ぶので、本格運用するなら D1 などに差し替える前提。`app/server/posts.ts` 1 ファイルだけ書き換えれば残りは無修正で動くはず。
- `pages.gen.ts` は `@hono/inertia/vite` プラグインが `vite dev` 中に生成する。手で編集しない (gitignore 済み)。
- React 19 では `FormEvent` / `FormEventHandler` などが非推奨になっているため、submit ハンドラの引数型は `React.SubmitEvent<HTMLFormElement>` を使うか、JSX のインラインで書いて推論に任せる。
