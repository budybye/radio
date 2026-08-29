# ディレクトリ構造

## 全体構造

```
radio/
├── .env                  # Docker: TUNNEL_TOKEN（.gitignore）
├── .env.example          # Docker テンプレート
├── .env.production.example # メンテナ deploy 用ホスト名テンプレート
├── .env.e2e.example      # E2E ティア用テンプレート（deploy 設定ではない）
├── .gitignore
├── Makefile              # 便利コマンド（make up / test / test-e2e-* 等）
├── compose.yaml          # Docker Compose 構成定義
├── Dockerfile            # MPD 実行環境のビルド定義
├── README.md             # プロジェクト概要とクイックスタート
├── AGENTS.md             # AI エージェント向け開発ガイドライン
├── .github/
│   └── workflows/
│       ├── build.yaml            # GHCR イメージビルド
│       ├── tag.yaml              # main への自動タグ + Release
│       ├── workers-ci.yaml       # 再利用可能 Workers CI（unit/lint/build/stub）
│       └── workers-test.yaml     # PR/push 時 Workers CI トリガー
├── mpc-bridge/           # MPD プロトコル HTTP ブリッジ（TCP 接続プール）
│   ├── main.go
│   ├── go.mod
│   └── Dockerfile
├── workers/              # Web UI（Vite + Hono Workers）— MPD 制御・SPA 配信
│   ├── package.json
│   ├── vite.config.ts
│   ├── wrangler.jsonc    # Worker "radio", workers_dev: true
│   │                     # deploy: scripts/deploy.sh (+ .env.production)
│   ├── .dev.vars.example # ローカル secrets テンプレート
│   ├── tools/
│   │   └── oxlint/anti-slop/   # Oxlint プラグイン（vendored）
│   ├── test/             # E2E フィクスチャ（mpd-stub contract + vitest）
│   │   └── fixtures/mpd/contract.json   # E2E 期待値の正本
│   ├── worker/           # Wrangler entry + MpdAgent DO
│   └── app/
│       ├── client.tsx
│       ├── style.css
│       ├── inertia.tsx
│       ├── components/   # GlobeSpeaker.tsx 等 UI コンポーネント
│       ├── lib/
│       │   ├── validation.ts
│       │   ├── text/     # control-chars 等
│       │   └── radio/    # 型・serialize・errors・use-* hooks
│       ├── schemas/      # Valibot（mpd.ts / posts.ts）
│       ├── server/       # Hono SSR + MPD API
│       │   ├── index.tsx
│       │   ├── middleware.ts
│       │   ├── posts-routes.ts
│       │   └── mpd/      # bridge, playlist, routes 等
│       └── pages/        # Inertia ページ (Home, Posts/*)
├── config/
│   ├── mpd.conf
│   └── config            # ncmpcpp 設定
├── music/                # 配信対象音楽ファイル
├── scripts/
│   ├── entrypoint.sh
│   ├── setup.sh
│   ├── test.sh
│   └── e2e/              # E2E スクリプト（local/preview/prod）
│       ├── lib/contract.sh
│       ├── local.sh
│       ├── mpd-stub-contract.sh
│       └── start-mpd-stub.sh
├── openspec/
│   ├── specs/            # 振る舞い仕様の正本（archive 後）
│   └── changes/          # 進行中 change + archive/
├── graphify-out/         # コード構造レポート（graphify）
└── docs/                 # プロジェクトドキュメント
    ├── README.md         # 索引
    ├── diagrams.md       # Mermaid 図（アーキテクチャ・認証・デプロイ等）
    ├── deploy-fork.md    # フォーク向け Deploy to Cloudflare
    ├── openspec.md       # OpenSpec ワークフロー
    ├── patterns/         # コードパターン（better-result 等）
    ├── requirements.md
    ├── design.md
    ├── tech.md
    ├── test.md
    ├── tasks.md
    ├── directory.md      # 本ファイル
    ├── problems.md
    └── references.md
```

## ディレクトリの責務

| パス | 役割 |
|------|------|
| `mpc-bridge/` | MPD TCP 6600 を HTTP `/mpd.cgi` に変換。Workers から Tunnel 経由で利用 |
| `workers/` | Web UI（Vite + Hono Workers）。MpdAgent DO + Inertia SPA |
| `workers/app/components/GlobeSpeaker.tsx` | リスナー Home 中央の cobe 地球儀 |
| `workers/test/fixtures/mpd/contract.json` | mpd-stub / opencli E2E の期待値正本 |
| `scripts/e2e/lib/contract.sh` | contract.json 読み取り・HTML アサーション |
| `workers/tools/oxlint/` | anti-slop Oxlint プラグイン（vendored） |
| `scripts/e2e/` | opencli E2E スクリプト・mpd-stub |
| `openspec/` | 振る舞い仕様（specs）と変更計画（changes） |
| `config/` | MPD / ncmpcpp 設定。コンテナ起動時に read-only マウント |
| `music/` | 配信対象音楽ファイル。`auto_update` で自動反映 |
| `docs/` | 恒久ドキュメント。索引は `docs/README.md` |

## ファイル命名規則

| 対象 | 規約 |
|------|------|
| Docker 関連 | `Dockerfile`（大文字 D）、`compose.yaml` |
| 設定ファイル | `*.conf`（MPD）、`*.env*`（環境変数） |
| ドキュメント | `*.md`（Markdown）、小文字・ケバブケース |
| 音楽ファイル | 元ファイル名をそのまま保持 |

## 新規ファイル追加時のガイドライン

- **音楽ファイル** → `music/` に直接追加。`auto_update` で自動反映
- **MPD 設定変更** → `config/mpd.conf` 編集後 `docker compose restart mpd`
- **Web UI 変更** → `workers/` 編集後、フォークは `wrangler deploy --config wrangler.jsonc`、メンテナは `bun run deploy`（`--env production --config wrangler.jsonc`）
- **新しいサービス追加** → `compose.yaml` に追加、`docs/tech.md` 更新
- **新しい make ターゲット** → `Makefile` + `docs/tech.md` のコマンド表
- **新しいテスト** → `scripts/test.sh` または `workers/` vitest + `docs/test.md`
- **ドキュメント追加** → `docs/` に配置し `docs/README.md` の一覧にリンク
- **環境変数追加** → `.env.example` + `docs/tech.md` + `AGENTS.md`


[You have received this identical output 3 times. Re-reading '/Users/hotmilk/Developer/radio/docs/directory.md:raw' will not change it — use a narrower selector (path:A-B), or proceed with the edit.]