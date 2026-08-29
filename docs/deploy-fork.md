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

## デプロイ環境（3 つだけ） {#deploy-targets}

| 目的 | コマンド | Wrangler env | Worker 名 | URL |
|------|----------|--------------|-----------|-----|
| **フォーク** | `bun run deploy:fork` | （なし） | `radio` | `radio.*.workers.dev` |
| **本番** | `bun run deploy` | `production` | `radio` | カスタムドメイン（ダッシュボード） |
| **E2E 用** | `bun run deploy:preview` | `preview` | `radio-preview` | `radio-preview.*.workers.dev` |

> **044g.com が動かない典型原因**: `--env production` なしで deploy すると Worker 名や vars がずれる。**本番は必ず `bun run deploy`**（内部で `--env production --config wrangler.jsonc` + `.env.production` の `--var`）。

### 本番デプロイ手順（メンテナ）

```bash
cp .env.production.example .env.production   # 初回のみ
# MPD_HOST / MPC_HOST を実ホスト名に編集

cd workers && bun run deploy
# → Worker "radio" へ deploy（カスタムドメインのバインド先）
```

### プレビュー / E2E 手順

```bash
cd workers && bun run deploy:preview
export RADIO_E2E_PREVIEW_URL=https://radio-preview.<account>.workers.dev
make test-e2e-preview
```

本番 deploy は **preview Worker に影響しません**（別 Worker `radio-preview`）。

## 環境ファイル一覧 {#env-files}

リポジトリには **用途の違う `.env*` が複数**あります。名前が似ていても読み込まれる層が違うので混同しないでください。

| ファイル | 層 | 誰が使う | 内容 | Git |
|----------|-----|----------|------|:---:|
| [`.env.example`](../.env.example) | Docker Compose | 全員 | `TUNNEL_TOKEN` のテンプレ | ✅ |
| `.env` | Docker Compose | ローカル運用 | Tunnel トークン（`make up`） | ❌ |
| [`.env.production.example`](../.env.production.example) | シェル | **メンテナのみ** | `MPD_HOST` / `MPC_HOST` のテンプレ | ✅ |
| `.env.production` | シェル | **メンテナのみ** | `deploy.sh production` が `--var` 注入に使用 | ❌ |
| [`.env.e2e.example`](../.env.e2e.example) | E2E | 開発者 | `RADIO_E2E_*` ティア説明 | ✅ |
| `.env.e2e` | E2E | 開発者 | E2E 用オーバーライド（任意） | ❌ |
| [`workers/.dev.vars.example`](../workers/.dev.vars.example) | Wrangler ローカル | Workers 開発 | Access / Basic Auth など **secrets** | ✅ |
| `workers/.dev.vars` | Wrangler ローカル | `bun run dev` | 上記の実値（gitignore） | ❌ |
| [`workers/wrangler.jsonc`](../workers/wrangler.jsonc) | Wrangler デプロイ | 全員 | 3 env 定義（default / production / preview） | ✅ |

### よくある混同

| 名前 | 実体 | 読み込み元 |
|------|------|------------|
| **ルート `.env.production`** | シェル用のキー=value | `workers/scripts/deploy.sh production` が `source` |
| **`wrangler.jsonc` の `env.production`** | Wrangler 環境（Worker 名 `radio`、DO binding） | `wrangler deploy --env production` |
| **`wrangler.jsonc` の `env.preview`** | 別 Worker `radio-preview`（E2E 専用） | `wrangler deploy --env preview` |

メンテナ本番: `bun run deploy` = `deploy.sh production`（Wrangler `env.production` + ルート `.env.production` のホスト名）。フォークは `bun run deploy:fork` または Deploy ボタン。

### 各ファイルの役割（詳細）

**`.env` / `.env.example`** — Docker スタック専用。Cloudflare Tunnel の `TUNNEL_TOKEN` のみ。Workers デプロイとは無関係。

**`.env.production` / `.env.production.example`** — メンテナが `cd workers && bun run deploy` するときの **ホスト名だけ**を保持。リポジトリに本番ドメインを載せないための仕組み。任意で `RADIO_E2E_PROD_URL` を書くと `make test-e2e-prod` が参照。

**`.env.e2e` / `.env.e2e.example`** — `make test-e2e-*` 用。`RADIO_E2E_TIER`・`RADIO_E2E_PREVIEW_URL`・`RADIO_E2E_ALLOW_PROD` など。デプロイ設定ではない。

**`workers/.dev.vars` / `.dev.vars.example`** — `bun run dev`（Miniflare）と Deploy ボタンの secrets プロンプト用。**vars**（`MPD_HOST` 等）は通常 `wrangler.jsonc` 側。ローカル E2E では `MPC_BRIDGE_BASE_URL=http://127.0.0.1:18080` で mpd-stub に向ける。

**`wrangler.jsonc`** — 3 環境: 既定（フォーク）、`env.production`（本番 Worker `radio`）、`env.preview`（E2E Worker `radio-preview`）。本番ホスト名は repo に載せず `.env.production` から注入。カスタムドメインはダッシュボードで Worker `radio` にバインド。

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
| `cd workers && bun run deploy:fork` | フォーク既定 env → `radio.*.workers.dev` |
| Deploy ボタン | 上記と同じ |
| `cd workers && bun run deploy` | **本番** — `.env.production` + `--env production` → Worker `radio` |
| `cd workers && bun run deploy:preview` | **E2E 用** — `--env preview` → Worker `radio-preview` |

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
| 044g.com / 本番がプレースホルダ vars | `--env production` なし、または `.env.production` 未設定 | `bun run deploy`（`deploy.sh production`） |
| 本番 deploy 後 preview E2E が壊れる | 本番と preview は別 Worker — preview を再 deploy | `bun run deploy:preview` |
| Workers Builds が upstream を参照 | ボタン URL が budybye のまま | フォーク URL に差し替え |

図解: [diagrams.md#deploy-flow](diagrams.md#deploy-flow)

## メンテナ向け（カスタムドメイン）

[デプロイ環境（3 つだけ）](#deploy-targets) を参照。本番は `bun run deploy`、E2E は `bun run deploy:preview`。

## 関連ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| [tech.md](tech.md) | Docker / Makefile / compose 詳細 |
| [design.md](design.md) | アーキテクチャ・ADR |
| [workers/README.md](../workers/README.md) | Workers ルート・開発コマンド |
| [diagrams.md](diagrams.md) | システム図・認証マトリクス |
