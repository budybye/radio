# Radio Web UI (Cloudflare Workers)

044g.com 上の Web UI。Inertia + React でリスナー画面と管理画面を配信し、MpdAgent DO 経由で MPD 状態を配信する。

## スタック

| カテゴリ | 技術 |
|----------|------|
| Web FW | Hono + `@hono/inertia` |
| フロント | React 19 + Inertia.js |
| ランタイム | Cloudflare Workers + Durable Objects (MpdAgent) |
| ビルド | Vite + Bun |
| バリデーション | Valibot |
| エラー | better-result (`Result` / `TaggedError`) |
| ライブ更新 | Agents SDK (`useAgent` → DO `watchCurrentSong`) |

## 開発

```bash
cd workers
bun install
bun run dev          # http://localhost:5173 (Miniflare)
bun run build
bun run deploy       # wrangler deploy
bunx tsc --noEmit    # package.json に script 未登録
```

## ディレクトリ構成

```
workers/
├── worker/
│   ├── index.ts           # Wrangler entry
│   └── mpd-agent.ts       # MpdAgent DO (poll, state, watch)
├── app/
│   ├── client.tsx         # Inertia クライアント入口
│   ├── pages/             # Inertia ページ (Home, Posts/*)
│   ├── schemas/
│   │   ├── mpd.ts         # MPD ワイヤ protocol (レコード, ping)
│   │   └── posts.ts       # 管理 UI フォーム入力
│   ├── lib/
│   │   ├── validation.ts
│   │   └── radio/         # 型, serialize, hooks, errors
│   │       ├── use-current-song.ts  # SWR キャッシュ（push 専用）
│   │       ├── use-mpd-agent.ts     # DO watch → mutate
│   │       └── use-radio-player.ts  # Home 再生 UI
│   └── server/
│       ├── index.tsx      # ルート組み立て
│       ├── middleware.ts  # basic / bearer / basicOrBearer, hono-agents
│       ├── posts-routes.ts
│       ├── radio-config.ts
│       ├── og.tsx
│       └── mpd/
│           ├── bridge.ts      # mpc-bridge fetch + Access ヘッダ
│           ├── transport.ts   # env 付き mpdCommand
│           ├── ping.ts        # 診断 ping
│           ├── parse.ts       # MPD 生レスポンス parse
│           ├── song.ts        # record → Song
│           ├── playlist.ts    # キュー CRUD (Result)
│           ├── status.ts      # status 取得
│           ├── current-song.ts
│           ├── watch-tick.ts  # DO push 判定 (純関数)
│           └── routes.ts      # /status, /currentsong, /mpd/ping
├── wrangler.jsonc
└── vite.config.ts
```

## HTTP ルート

| Method | Path | 認証 | 用途 |
|--------|------|------|------|
| GET | `/` | なし | リスナー Home（SSR + DO watch） |
| ALL | `/agents/MpdAgent/*` | なし | Agents SDK（ライブ watch） |
| GET | `/status` | なし | MPD status JSON（診断） |
| GET | `/currentsong` | なし | 現在曲 JSON（ops / 外部） |
| GET | `/mpd/ping` | なし | mpc-bridge + MPD 到達性 |
| GET | `/posts*` | Basic | 管理 UI 閲覧 |
| POST/PATCH/DELETE | `/posts*` | Basic or Bearer | キュー CRUD |

## 現在曲の取得経路

| 経路 | 用途 |
|------|------|
| DO `watchCurrentSong` | ブラウザライブ（`use-mpd-agent.ts` → `useCurrentSongMutate`） |
| `useCurrentSong()` | SWR から現在曲を読む（fetcher なし） |
| DO `getCurrentSongView` | SSR（`fetchCurrentSong`）/ API |
| `GET /currentsong` | ops / curl |

ライブ更新は MpdAgent DO `watchCurrentSong` 一本。React Context は使わず **SWR を手動 mutate するストア**として使う。

## デプロイとシークレット

`wrangler.jsonc` の vars:

| 変数 | 例 | 説明 |
|------|-----|------|
| `MPD_HOST` | `mpd.044g.com` | MP3 ストリーム URL ホスト |
| `MPC_HOST` | `mpc.044g.com` | mpc-bridge ホスト |

Wrangler secrets（`bunx wrangler secret put <NAME>`）:

| Secret | 用途 |
|--------|------|
| `CF_ACCESS_CLIENT_ID` | mpc.044g.com Access Service Token |
| `CF_ACCESS_CLIENT_SECRET` | 同上 |
| `USERNAME` | 管理 UI Basic Auth |
| `PASSWORD` | 管理 UI Basic Auth |
| `TOKEN` | 管理 API Bearer（`basicOrBearer` の write 用） |

mpc.044g.com は Cloudflare Access（Service Auth + Block）で保護し、Worker の fetch のみ通す。詳細は [docs/design.md](../docs/design.md) ADR-004。

## 触るファイルの目安

| 変更内容 | 主なファイル |
|----------|-------------|
| リスナー UI | `app/pages/Home.tsx`, `app/lib/radio/use-*.ts` |
| 管理 UI | `app/pages/Posts/*`, `app/server/posts-routes.ts` |
| キュー操作 | `app/server/mpd/playlist.ts` |
| MPD 通信 | `app/server/mpd/bridge.ts`, `transport.ts` |
| DO ポーリング | `worker/mpd-agent.ts` |
| 認証 | `app/server/middleware.ts`, secrets |
