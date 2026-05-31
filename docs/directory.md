# ディレクトリ構造

## 全体構造

```
radio/
├── .env                  # 環境変数（TUNNEL_TOKEN — .gitignore対象）
├── .env.example          # 環境変数テンプレート
├── .gitignore            # Git 除外設定
├── Makefile              # 便利コマンド（make up / test / ncmpcpp / random / sequential 等）
├── compose.yaml          # Docker Compose 構成定義
├── Dockerfile            # MPD 実行環境のビルド定義
├── README.md             # プロジェクト概要とクイックスタート
├── AGENTS.md             # AI エージェント向け開発ガイドライン
├── .github/
│   └── workflows/        # GitHub Actions CI/CD（イメージビルド・自動リリース）
├── mpc-bridge/           # MPD プロトコル HTTP ブリッジ（TCP 接続プール）
│   ├── main.go
│   ├── go.mod
│   └── Dockerfile
├── workers/              # Web UI（Vite + Hono Workers）— MPD 制御・SPA 配信
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   ├── wrangler.jsonc
│   ├── worker/           # Wrangler entry + MpdAgent DO
│   └── app/
│       ├── client.tsx    # Inertia クライアント入口
│       ├── style.css
│       ├── inertia.tsx   # Inertia SSR シェル
│       ├── lib/
│       │   ├── validation.ts
│       │   └── radio/    # 型・serialize・errors・use-* hooks
│       ├── schemas/      # Valibot（mpd.ts: プロトコル / posts.ts: 管理 UI）
│       ├── server/       # Hono SSR + MPD API
│       │   ├── index.tsx
│       │   ├── middleware.ts   # basic / bearer / hono-agents
│       │   ├── posts-routes.ts # /posts CRUD + auth
│       │   └── mpd/            # bridge, transport, playlist, routes 等
│       └── pages/        # Inertia ページ (Home, Posts/*)
├── config/
│   ├── mpd.conf          # MPD 設定ファイル（コンテナ内 /etc/mpd.conf にマウント）
│   └── config            # ncmpcpp 設定ファイル（コンテナ内 /root/.ncmpcpp/config にマウント）
├── music/                # 配信対象音楽ファイル（コンテナにマウント）
├── scripts/
│   ├── entrypoint.sh     # コンテナ起動スクリプト（MPD 起動 + 空キュー時の自動再生）
│   ├── install.sh        # Ubuntu/Debian 用ローカルインストールスクリプト（Docker 不要）
│   ├── setup.sh          # Docker 環境セットアップスクリプト（Ubuntu/Debian）
│   └── test.sh           # ヘルスチェックスクリプト（make test で実行）
└── docs/                 # プロジェクトドキュメント
    ├── requirements.md   # 要件定義（Phase 3 進捗含む）
    ├── design.md         # 設計仕様・ADR
    ├── tech.md           # 技術仕様・スタック
    ├── test.md           # テスト方針
    ├── tasks.md          # タスク・マイルストーン
    ├── directory.md      # 本ファイル（ディレクトリ構造）
    ├── problems.md       # 既知の問題・リスク
    └── references.md     # 参考資料リンク集
```

## ディレクトリの責務

| パス | 役割 |
|------|------|
| `mpc-bridge/` | MPD TCP 6600 を HTTP `/mpd.cgi` に変換。Workers から Tunnel 経由で利用 |
| `workers/` | Web UI（Vite + Hono Workers）。MpdAgent DO + Inertia SPA。本番は `bun run deploy` |
| `config/` | MPD の設定ファイル（`mpd.conf`）と ncmpcpp 設定ファイル（`config`）を配置。コンテナ起動時に `/etc/mpd.conf` と `/root/.ncmpcpp/config` へ read-only マウントされる |
| `music/` | 配信対象の音楽ファイル（MP3, FLAC 等）を配置。`auto_update` により自動的にライブラリに反映される |
| `docs/` | プロジェクトの技術文書・仕様書を配置。README.md からリンクされる |

## ファイル命名規則

| 対象 | 規約 |
|------|------|
| Docker 関連 | `Dockerfile`（大文字 D、拡張子なし）、`compose.yaml`（小文字、拡張子 `.yaml`） |
| 設定ファイル | `*.conf`（MPD 設定）、`*.env*`（環境変数） |
| ドキュメント | `*.md`（Markdown）、小文字・スネークケース |
| 音楽ファイル | 元ファイル名をそのまま保持（MPD がタグを優先して表示） |

## 新規ファイル追加時のガイドライン

- **音楽ファイル** → `music/` に直接追加。サブディレクトリ可。`auto_update` で自動反映
- **MPD 設定変更** → `config/mpd.conf` を編集後、`docker compose restart mpd` で反映
- **Web UI 変更** → `workers/` を編集後、`cd workers && bun run deploy`
- **新しいサービス追加** → `compose.yaml` にサービス定義を追加し、`Dockerfile` が必要な場合はプロジェクトルートまたはサービスディレクトリに配置
- **新しい make ターゲット追加** → `Makefile` に追加後、`docs/tech.md` の「Makefile コマンド一覧」テーブルに反映
- **新しいテスト項目追加** → `scripts/test.sh` に追加後、`docs/test.md` のテスト内容テーブルに反映
- **ドキュメント追加** → `docs/` 内に配置し、`README.md` の「Documentation」テーブルにリンクを追加
- **環境変数追加** → `.env.example` にテンプレート追加 → `docs/tech.md` の環境変数表更新 → `AGENTS.md` 更新
