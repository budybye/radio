# フォークして Cloudflare にデプロイする

このリポジトリは **Deploy to Cloudflare** ボタンで、他人が自分の Cloudflare アカウントに Web UI（`workers/`）だけを載せられる想定です。

> **デプロイされるのは Workers アプリのみ**です。MPD / mpc-bridge / Tunnel の Docker スタックは別途、各自の環境で起動してください。

## ワンクリックデプロイ

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/budybye/radio&directory=workers)

ボタンを押すと Cloudflare が次を行います。

1. あなたの GitHub にリポジトリを複製
2. **Workers Builds**（push ごとにビルド＋デプロイ）を設定
3. `workers/` をビルドして `*.workers.dev`（既定）へデプロイ
4. `MpdAgent` Durable Object をプロビジョン

### ボタン利用の前提

| 要件 | 説明 |
|------|------|
| **公開リポジトリ** | フォーク元が public であること |
| **Cloudflare アカウント** | 無料枠で開始可能 |
| **GitHub 連携** | Cloudflare GitHub App のインストール |

> **フォーク先リポジトリから配布する場合**: ボタン URL の `github.com/budybye/radio` を `github.com/<your-user>/radio` に差し替えてください。

## 環境ファイル一覧 {#env-files}

リポジトリには **用途の違う `.env*` が複数**あります。名前が似ていても読み込まれる層が違うので混同しないでください。

| ファイル | 層 | 誰が使う | 内容 | Git |
|----------|-----|----------|------|:---:|
| [`.env.example`](../.env.example) | Docker Compose | 全員 | `TUNNEL_TOKEN` のテンプレ | ✅ |
| `.env` | Docker Compose | ローカル運用 | Tunnel トークン（`make up`） | ❌ |
| [`.env.production.example`](../.env.production.example) | シェル | **メンテナのみ** | `MPD_HOST` / `MPC_HOST` のテンプレ | ✅ |
| `.env.production` | シェル | **メンテナのみ** | `deploy-production.sh` が `--var` 注入に使用 | ❌ |
| [`.env.e2e.example`](../.env.e2e.example) | E2E | 開発者 | `RADIO_E2E_*` ティア説明 | ✅ |
| `.env.e2e` | E2E | 開発者 | E2E 用オーバーライド（任意） | ❌ |
| [`workers/.dev.vars.example`](../workers/.dev.vars.example) | Wrangler ローカル | Workers 開発 | Access / Basic Auth など **secrets** | ✅ |
| `workers/.dev.vars` | Wrangler ローカル | `bun run dev` | 上記の実値（gitignore） | ❌ |
| [`workers/wrangler.jsonc`](../workers/wrangler.jsonc) | Wrangler デプロイ | 全員 | vars プレースホルダ + `env.production` 定義 | ✅ |

### よくある混同

| 名前 | 実体 | 読み込み元 |
|------|------|------------|
| **ルート `.env.production`** | シェル用のキー=value | `workers/scripts/deploy-production.sh` が `source` |
| **`wrangler.jsonc` の `env.production`** | Wrangler の環境名（Worker 名サフィックス・DO binding 等） | `wrangler deploy --env production` |

メンテナの `bun run deploy` は **両方**を使います: Wrangler 側は `--env production`、ホスト名はルート `.env.production` から `--var` で上書きします。フォーク利用者はルート `.env.production` を作らず、ダッシュボードまたは `wrangler deploy --config wrangler.jsonc`（env なし）で vars を設定してください。

### 各ファイルの役割（詳細）

**`.env` / `.env.example`** — Docker スタック専用。Cloudflare Tunnel の `TUNNEL_TOKEN` のみ。Workers デプロイとは無関係。

**`.env.production` / `.env.production.example`** — メンテナが `cd workers && bun run deploy` するときの **ホスト名だけ**を保持。リポジトリに本番ドメインを載せないための仕組み。任意で `RADIO_E2E_PROD_URL` を書くと `make test-e2e-prod` が参照。

**`.env.e2e` / `.env.e2e.example`** — `make test-e2e-*` 用。`RADIO_E2E_TIER`・`RADIO_E2E_PREVIEW_URL`・`RADIO_E2E_ALLOW_PROD` など。デプロイ設定ではない。

**`workers/.dev.vars` / `.dev.vars.example`** — `bun run dev`（Miniflare）と Deploy ボタンの secrets プロンプト用。**vars**（`MPD_HOST` 等）は通常 `wrangler.jsonc` 側。ローカル E2E では `MPC_BRIDGE_BASE_URL=http://127.0.0.1:18080` で mpd-stub に向ける。

**`wrangler.jsonc`** — フォーク既定（ルート env なし）と `env.production`（メンテナ `bun run deploy`）。`env.production.workers_dev: true` により、メンテナ deploy 後も `radio-production.*.workers.dev` が有効（preview E2E 用）。カスタムドメインはダッシュボードで追加（リポジトリに書かない）。

## デプロイ後に必ずやること

### 1. 環境変数（vars）

ダッシュボード **Workers → あなたの Worker → Settings → Variables** で、自分のホスト名に差し替えます。

| 変数 | 例 | 説明 |
|------|-----|------|
| `MPD_HOST` | `mpd.your-domain.com` | MP3 ストリームのホスト |
| `MPC_HOST` | `mpc.your-domain.com` | mpc-bridge（**Access 保護必須**） |

既定の `mpd.example.com` / `mpc.example.com` はプレースホルダです。**your-domain.com には繋がりません。**

### 2. Secrets

テンプレート: [`workers/.dev.vars.example`](../workers/.dev.vars.example)

| Secret | 必須 | 用途 |
|--------|:----:|------|
| `CF_ACCESS_CLIENT_ID` | ✅* | mpc Access Service Token |
| `CF_ACCESS_CLIENT_SECRET` | ✅* | 同上 |
| `USERNAME` / `PASSWORD` | ✅ | 管理 UI・診断 API |
| `TOKEN` | 任意 | キュー API Bearer |

\* mpc を Access で保護する場合は必須。

```bash
cd workers
bunx wrangler secret put CF_ACCESS_CLIENT_ID
bunx wrangler secret put CF_ACCESS_CLIENT_SECRET
bunx wrangler secret put USERNAME
bunx wrangler secret put PASSWORD
# 任意
bunx wrangler secret put TOKEN
```

### 3. バックエンド（Docker + Tunnel）

1. `make setup && make up-build`（Docker MPD スタック）
2. Tunnel で `mpd.*` / `mpc.*` を公開
3. **mpc に Access**（Service Auth + Block）— 詳細は [design.md](design.md) ADR-004

### 4. カスタムドメイン（任意）

1. Cloudflare ダッシュボードで Worker にカスタムドメインを追加
2. `wrangler.jsonc` の `routes` を編集するか、ダッシュボードのみで運用
3. vars の `MPD_HOST` / `MPC_HOST` を Tunnel の Public Hostname と一致させる

## フォーク向けデプロイコマンド

| コマンド | 説明 |
|----------|------|
| `cd workers && wrangler deploy --config wrangler.jsonc` | **推奨** — ルート `wrangler.jsonc` の既定 env（プレースホルダ vars） |
| Deploy ボタン | 上記と同じ既定 env で初回デプロイ + Workers Builds 設定 |
| `cd workers && bun run deploy` | ⚠️ **メンテナ専用** — ルート `.env.production` のホスト名で `--env production` deploy |

### `vpr build` と `wrangler.jsonc` の落とし穴 {#deploy-pitfall}

`bun run deploy` は先に `vpr build` を実行し、`dist/radio/wrangler.json` を生成します。この生成物は **フォーク既定 vars**（`mpd.example.com`）のままです。

**メンテナ本番 vars** はリポジトリに載せず、ルート `.env.production`（`.env.production.example` をコピー）に書きます。`bun run deploy` が `--var MPD_HOST` / `MPC_HOST` として注入します。

```bash
cp .env.production.example .env.production
# MPD_HOST / MPC_HOST を編集
cd workers && bun run deploy
```

### よくある落とし穴

| 問題 | 原因 | 対処 |
|------|------|------|
| ストリームが聴けない | vars が `mpd.example.com` のまま | 自分の Tunnel ホスト名に変更 |
| mpc 操作が失敗 | Access Token 未設定 / ポリシー不一致 | Service Token を secrets に登録 |
| your-domain.com の曲が流れる | `bun run deploy` をフォークで実行した | `wrangler deploy --config wrangler.jsonc`（env なし）を使う |
| 本番 deploy 後も `mpd.example.com` | `--config wrangler.jsonc` なしで deploy | `bun run deploy` または `--config wrangler.jsonc` を付与 |
| Workers Builds が upstream を参照 | ボタン URL が budybye のまま | フォーク URL に差し替え |

図解: [diagrams.md#deploy-flow](diagrams.md#deploy-flow)

## メンテナ向け（カスタムドメイン）

```bash
cp .env.production.example .env.production   # 初回のみ
cd workers && bun run deploy
```

`.env.production` に `MPD_HOST` / `MPC_HOST` を設定。`wrangler.jsonc` の `env.production` は `workers_dev: true` と DO binding のみ（ホスト名は載せない）。deploy 後は `radio-production.*.workers.dev` でも preview E2E が可能。

環境ファイルの整理: [環境ファイル一覧](#env-files)

## 関連ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| [tech.md](tech.md) | Docker / Makefile / compose 詳細 |
| [design.md](design.md) | アーキテクチャ・ADR |
| [workers/README.md](../workers/README.md) | Workers ルート・開発コマンド |
| [diagrams.md](diagrams.md) | システム図・認証マトリクス |
