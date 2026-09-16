# Radio Web UI (Cloudflare Workers)

Inertia + React のリスナー画面と管理 UI。MpdAgent DO 経由で MPD 状態をライブ配信する。

## Deploy to Cloudflare（フォーク向け）

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/budybye/radio&directory=workers)

- デプロイ対象は **`workers/` のみ**（モノレポの `directory=workers`）
- 既定は `*.workers.dev`。`MPD_HOST` / `MPC_HOST` は `wrangler.jsonc` に未定義のため、デプロイ時に設定する
- **あなたの MPD スタック**（Docker + Tunnel + Access）を別途用意し、vars / secrets を差し替える

手順の全文: [docs/maintenance.md](../docs/maintenance.md)

## スタック

| カテゴリ       | 技術                                            |
| -------------- | ----------------------------------------------- |
| Web FW         | Hono + `@hono/inertia`                          |
| フロント       | React 19 + Inertia.js                           |
| ランタイム     | Cloudflare Workers + Durable Objects (MpdAgent) |
| ビルド         | Vite+ (`vp`) + Bun                              |
| バリデーション | Valibot + hono-openapi                          |
| エラー         | better-result (`Result` / `TaggedError`)        |
| ライブ更新     | Agents SDK (`useAgent` → DO state push)         |

## 開発

```bash
cd workers
cp .env.example .env   # MPD_HOST / MPC_HOST + secrets
bun install
bun run dev          # 任意: 手動 UI 確認のみ（E2E では使わない）
bun run build
bun run lint         # vp lint + vendored anti-slop rules
bun run test         # Vite+ の Vitest 4.1.11 runner（MPD parse / serialize / bridge / fixture / OpenAPI）
bun run deploy       # Worker "radio" → radio.*.workers.dev
```

anti-slop のルール実装はアップストリーム由来のまま維持し、lint エラーはアプリ側のコード・型を修正して解消します。`require-readable-spacing` を含む汎用ルールを有効化しています。整形と lint の一括確認は `bunx vp check`、自動修正は `bunx vp check --fix` を使います。

## ディレクトリ構成

```
workers/
├── worker/
│   ├── index.ts           # Wrangler entry
│   └── mpd-agent.ts       # MpdAgent DO (poll, state push)
├── app/
│   ├── client.tsx         # Inertia クライアント入口
│   ├── pages/             # Inertia ページ (Home, Queue/*)
│   ├── schemas/
│   │   ├── mpd.ts         # MPD ワイヤ protocol (レコード, ping)
│   │   └── queue.ts       # 管理 UI フォーム入力
│   ├── lib/
│   │   ├── validation.ts
│   │   └── radio/         # 型, serialize, hooks, errors
│   │       ├── globe-view.ts         # heading / 放送アーク
│   │       ├── use-mpd-agent.tsx     # DO watch → React state
│   │       └── use-radio-player.tsx  # Home 再生 UI
│   └── server/
│       ├── index.tsx      # ルート組み立て
│       ├── middleware.ts  # basic / bearer / basicOrBearer, hono-agents
│       ├── api/
│       │   └── queue.ts   # JSON /api/queue
│       ├── queue-routes.ts
│       └── mpd/
│           ├── bridge.ts      # mpc-bridge fetch + mpdCommand
│           ├── ping.ts        # 診断 ping
│           ├── parse.ts       # MPD 生レスポンス parse
│           ├── song.ts        # record → Song
│           ├── playlist.ts    # キュー CRUD (Result)
│           ├── current-song.ts
│           ├── listener-count.ts
│           └── routes.ts      # /status, /currentsong, /mpd/ping
├── wrangler.jsonc
└── vite.config.ts
```

## HTTP ルート

| Method                | Path                 | 認証                         | 用途                                      |
| --------------------- | -------------------- | ---------------------------- | ----------------------------------------- |
| GET                   | `/`                  | なし                         | リスナー Home（SSR。DO watch は Play 後） |
| ALL                   | `/agents/MpdAgent/*` | なし                         | Agents SDK（ライブ watch）                |
| GET                   | `/og.png`            | なし                         | OGP 画像                                   |
| GET                   | `/openapi.json`      | なし (dev / `*.workers.dev`) | OpenAPI 3.1 spec                          |
| GET                   | `/status`            | Basic                        | MPD status JSON（診断）                   |
| GET                   | `/currentsong`       | Basic                        | 現在曲 JSON（ops / 外部）                 |
| GET                   | `/mpd/ping`          | Basic                        | mpc-bridge + MPD 到達性                   |
| GET/POST/PATCH/DELETE | `/api/queue*`        | Basic or Bearer              | キュー CRUD（JSON、OpenAPI 対象）         |
| GET                   | `/queue*`            | Basic                        | 管理 UI 閲覧                              |
| POST/PATCH/DELETE     | `/queue*`            | Basic or Bearer              | キュー CRUD                               |

## 現在曲の取得経路

| 経路                            | 用途                                                                                    |
| ------------------------------- | --------------------------------------------------------------------------------------- |
| DO state push                   | ブラウザライブ（Play 後、`use-mpd-agent.tsx` → `use-radio-player` state）               |
| bridge `status` + `currentsong` | SSR（`getCachedCurrentSongForSsr`）。`GET /currentsong` は `queryCurrentSongFromBridge` |
| DO `getCurrentSongView`         | Play 後の RPC refresh のみ                                                              |

ライブ更新は MpdAgent DO の state ブロードキャスト一本。`use-radio-player` が React state で現在曲を保持する。

## デプロイとシークレット

運用・デプロイ・環境変数・secrets の正本は [docs/maintenance.md](../docs/maintenance.md)。認証境界は [docs/security.md](../docs/security.md#auth-matrix)。

ローカル開発用の `MPC_BRIDGE_BASE_URL`（mpd-stub）は [`.env.example`](.env.example) を参照。

## 触るファイルの目安

| 変更内容      | 主なファイル                                                     |
| ------------- | ---------------------------------------------------------------- |
| リスナー UI   | `app/pages/Home.tsx`, `app/style.css`, `app/lib/radio/use-*.tsx` |
| 管理 UI       | `app/pages/Queue/*`, `app/server/queue-routes.ts`                |
| キュー操作    | `app/server/mpd/playlist.ts`                                     |
| MPD 通信      | `app/server/mpd/bridge.ts`                                       |
| DO ポーリング | `worker/mpd-agent.ts`                                            |
| 認証          | `app/server/middleware.ts`, secrets                              |
