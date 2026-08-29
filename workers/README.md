# Radio Web UI (Cloudflare Workers)

Inertia + React のリスナー画面と管理 UI。MpdAgent DO 経由で MPD 状態をライブ配信する。

## Deploy to Cloudflare（フォーク向け）

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/budybye/radio&directory=workers)

- デプロイ対象は **`workers/` のみ**（モノレポの `directory=workers`）
- 既定は `*.workers.dev` + プレースホルダホスト（`mpd.example.com` / `mpc.example.com`）
- **あなたの MPD スタック**（Docker + Tunnel + Access）を別途用意し、vars / secrets を差し替える

手順の全文: [docs/deploy-fork.md](../docs/deploy-fork.md)

## スタック

| カテゴリ | 技術 |
|----------|------|
| Web FW | Hono + `@hono/inertia` |
| フロント | React 19 + Inertia.js |
| ランタイム | Cloudflare Workers + Durable Objects (MpdAgent) |
| ビルド | Vite + Bun |
| バリデーション | Valibot + hono-openapi |
| エラー | better-result (`Result` / `TaggedError`) |
| ライブ更新 | Agents SDK (`useAgent` → DO state push) |

## 開発

```bash
cd workers
bun install
bun run dev          # http://localhost:5173 (Miniflare)
bun run build
bun run test         # vitest (parse / serialize / bridge-url)
bun run deploy       # wrangler deploy --env production（044g.com メンテナ向け）
bun run deploy:preview  # wrangler deploy --env preview（E2E tier）
bunx tsc --noEmit    # package.json に script 未登録
```

## ディレクトリ構成

```
workers/
├── worker/
│   ├── index.ts           # Wrangler entry
│   └── mpd-agent.ts       # MpdAgent DO (poll, state push)
├── app/
│   ├── client.tsx         # Inertia クライアント入口
│   ├── pages/             # Inertia ページ (Home, Posts/*)
│   ├── schemas/
│   │   ├── mpd.ts         # MPD ワイヤ protocol (レコード, ping)
│   │   └── posts.ts       # 管理 UI フォーム入力
│   ├── lib/
│   │   ├── validation.ts
│   │   └── radio/         # 型, serialize, hooks, errors
│   │       ├── use-mpd-agent.ts     # DO watch → React state
│   │       └── use-radio-player.ts  # Home 再生 UI
│   └── server/
│       ├── index.tsx      # ルート組み立て
│       ├── middleware.ts  # basic / bearer / basicOrBearer, hono-agents
│       ├── posts-routes.ts
│       └── mpd/
│           ├── bridge.ts      # mpc-bridge fetch + mpdCommand
│           ├── ping.ts        # 診断 ping
│           ├── parse.ts       # MPD 生レスポンス parse
│           ├── song.ts        # record → Song
│           ├── playlist.ts    # キュー CRUD (Result)
│           ├── current-song.ts
│           └── routes.ts      # /status, /currentsong, /mpd/ping
├── wrangler.jsonc
└── vite.config.ts
```

## HTTP ルート

| Method | Path | 認証 | 用途 |
|--------|------|------|------|
| GET | `/` | なし | リスナー Home（SSR + DO watch） |
| ALL | `/agents/MpdAgent/*` | なし | Agents SDK（ライブ watch） |
| GET | `/openapi.json` | なし (dev/preview) | OpenAPI 3.1 spec |
| GET | `/scalar` | なし (dev/preview) | Scalar API Reference UI |
| GET | `/status` | Basic | MPD status JSON（診断） |
| GET | `/currentsong` | Basic | 現在曲 JSON（ops / 外部） |
| GET | `/mpd/ping` | Basic | mpc-bridge + MPD 到達性 |
| GET/POST/PATCH/DELETE | `/api/posts*` | Basic or Bearer | キュー CRUD（JSON、OpenAPI 対象） |
| GET | `/posts*` | Basic | 管理 UI 閲覧 |
| POST/PATCH/DELETE | `/posts*` | Basic or Bearer | キュー CRUD |

## 現在曲の取得経路

| 経路 | 用途 |
|------|------|
| DO state push | ブラウザライブ（`use-mpd-agent.ts` → `use-radio-player` state） |
| DO `getCurrentSongView` | SSR（`fetchCurrentSong`）/ visibility 復帰時 refresh |
| `GET /currentsong` | ops / curl |

ライブ更新は MpdAgent DO の state ブロードキャスト一本。`use-radio-player` が React state で現在曲を保持する。

## デプロイとシークレット

`wrangler.jsonc` の vars:

| 変数 | 例 | 説明 |
|------|-----|------|
| `MPD_HOST` | `mpd.044g.com` | MP3 ストリーム URL ホスト |
| `MPC_HOST` | `mpc.044g.com` | mpc-bridge ホスト |
| `MPC_BRIDGE_BASE_URL` | _(未設定)_ | **E2E のみ**: `http://127.0.0.1:18080` で mpd-stub に向ける |

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
| MPD 通信 | `app/server/mpd/bridge.ts` |
| DO ポーリング | `worker/mpd-agent.ts` |
| 認証 | `app/server/middleware.ts`, secrets |
