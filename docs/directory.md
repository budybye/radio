# ディレクトリ構造

## 全体構造

```
radio/
├── .env                  # Docker + E2E（.gitignore）
├── .env.example          # ルート .env テンプレート
├── .gitignore
├── Makefile              # 便利コマンド（make up / test / test-e2e-* 等）
├── compose.yaml          # Docker Compose 構成定義
├── Dockerfile            # MPD 実行環境のビルド定義
├── README.md             # プロジェクト概要とクイックスタート
├── AGENTS.md             # AI エージェント向け開発ガイドライン
├── DESIGN.md             # Home UI の表示・操作・受け入れ条件
├── .github/
│   └── workflows/
│       ├── build.yaml            # GHCR イメージビルド
│       ├── tag.yaml              # main への自動タグ + Release
│       ├── workers-ci.yaml       # 再利用可能 Workers CI（unit/lint/build）
│       └── workers-test.yaml     # PR/push 時 Workers CI トリガー
├── mpc-bridge/           # MPD プロトコル HTTP ブリッジ（TCP 接続プール）
│   ├── main.go
│   ├── go.mod
│   └── Dockerfile
├── workers/              # Web UI（Vite+ + Hono Workers）— MPD 制御・SPA 配信
│   ├── package.json
│   ├── vite.config.ts
│   ├── wrangler.jsonc    # Worker "radio", workers_dev: true
│   │                     # deploy: scripts/deploy.sh (+ workers/.env)
│   ├── .env.example      # workers/.env テンプレート
│   ├── tools/
│   │   └── oxlint/anti-slop/   # Oxlint プラグイン（vendored）
│   ├── test/             # Vitest unit/integration tests、HTTP smoke、mpd-stub contract
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
│       ├── schemas/      # Valibot（mpd.ts / queue.ts）
│       ├── server/       # Hono SSR + MPD API
│       │   ├── index.tsx
│       │   ├── middleware.ts
│       │   ├── queue-routes.ts
│       │   ├── api/      # JSON /api/queue
│       │   └── mpd/      # bridge, playlist, current-song, routes 等
│       └── pages/        # Inertia ページ (Home, Queue/*)
├── config/
│   ├── mpd.conf
│   └── config            # ncmpcpp 設定
├── music/                # 配信対象音楽ファイル
├── scripts/
│   ├── entrypoint.sh
│   ├── test.sh
│   └── e2e/              # E2E スクリプト（deployed smoke + opencli）
│       └── smoke-deployed.sh
├── openspec/             # 任意のローカル計画（Git 対象外）
│   ├── config.yaml       # docs/ と DESIGN.md を参照
│   └── changes/          # 手元の提案・タスク・履歴
├── graphify-out/         # コード構造レポート（graphify）
└── docs/                 # プロジェクトドキュメント
    ├── architecture.md   # 構成・データモデル・データフロー
    ├── security.md       # 認証・権限
    ├── maintenance.md    # デプロイ・環境変数・運用
    ├── pattern.md        # 実装パターン
    ├── requirements.md   # 要件・受け入れ範囲
    ├── tech.md
    ├── test.md
    ├── directory.md      # 本ファイル
    ├── problems.md
    └── references.md
```

## ディレクトリの責務

| パス | 役割 |
|------|------|
| `mpc-bridge/` | MPD TCP 6600 を HTTP `/mpd.cgi` に変換。Workers から Tunnel 経由で利用 |
| `workers/` | Web UI（Vite+ + Hono Workers）。MpdAgent DO + Inertia SPA |
| `workers/app/components/GlobeSpeaker.tsx` | リスナー Home 中央の cobe 地球儀 |
| `workers/app/lib/radio/globe-view.ts` | 地球儀 heading・放送アーク |
| `workers/test/fixtures/mpd/contract.json` | mpd-stub / opencli E2E の期待値正本 |
| `workers/tools/oxlint/` | anti-slop Oxlint プラグイン（vendored） |
| `scripts/e2e/` | deployed smoke / opencli E2E スクリプト |
| `openspec/` | 任意のローカル計画。Git 対象外。仕様は `docs/` と `DESIGN.md` を参照 |
| `config/` | MPD / ncmpcpp 設定。コンテナ起動時に read-only マウント |
| `music/` | 配信対象音楽ファイル。`auto_update` で自動反映 |
| `docs/` | 責務別の恒久ドキュメント。入口はルート `README.md` と `AGENTS.md` |

## ファイル命名規則

| 対象 | 規約 |
|------|------|
| Docker 関連 | `Dockerfile`（大文字 D）、`compose.yaml` |
| 設定ファイル | `*.conf`（MPD）、`*.env*`（環境変数） |
| ドキュメント | `docs/*.md` は小文字・ケバブケース。ルートの `README.md`・`AGENTS.md`・`DESIGN.md` は固定名 |
| 音楽ファイル | 元ファイル名をそのまま保持 |

## 新規ファイル追加時のガイドライン

- **音楽ファイル** → `music/` に直接追加。`auto_update` で自動反映
- **MPD 設定変更** → `config/mpd.conf` 編集後 `docker compose restart mpd`
- **Web UI 変更** → `workers/` 編集後、`cd workers && bun run deploy`（ビルド後の `dist/radio/wrangler.json` を deploy。`workers/.env` があればホスト名を注入）
- **新しいサービス追加** → `compose.yaml` に追加、`docs/tech.md` 更新
- **新しい make ターゲット** → `Makefile`（一覧は `make help`）
- **新しいテスト** → `scripts/test.sh` または `workers/` の Vite+ test runner + `docs/test.md`
- **ドキュメント追加** → 既存の責務を持つ文書へ統合。独立した責務が必要な場合だけ追加し、ルート `README.md` と `AGENTS.md` の読む順を更新
- **環境変数追加** → ルート `.env.example` / `workers/.env.example` + [maintenance.md](maintenance.md#env-files)


[You have received this identical output 3 times. Re-reading '/Users/hotmilk/Developer/radio/docs/directory.md:raw' will not change it — use a narrower selector (path:A-B), or proceed with the edit.]