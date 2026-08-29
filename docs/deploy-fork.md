# フォークして Cloudflare にデプロイする

このリポジトリは **Deploy to Cloudflare** ボタンで、他人が自分の Cloudflare アカウントに Web UI（`workers/`）だけを載せられる想定です。

> **デプロイされるのは Workers アプリのみ**です。MPD / mpc-bridge / Tunnel の Docker スタックは別途、各自の環境で起動してください。

## ワンクリックデプロイ

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/budybye/radio&directory=workers)

## デプロイ先（2 URL だけ） {#deploy-targets}

| URL | 誰 | コマンド |
|-----|-----|----------|
| `https://radio.<account>.workers.dev` | 全員 | `bun run deploy`（フォークは `.env.production` なし） |
| カスタムドメイン（任意） | メンテナ | ダッシュボードで Worker `radio` にバインド |

**Worker 名は常に `radio` 一つ。** `radio-production` や `radio-preview` は使いません。

### メンテナ本番

```bash
cp .env.production.example .env.production
# MPD_HOST / MPC_HOST を実ホスト名に編集

cd workers && bun run deploy
# → Worker "radio" + radio.*.workers.dev + カスタムドメイン（ダッシュボード）
```

### フォーク

```bash
cd workers && bun run deploy   # .env.production なし → プレースホルダ vars
```

## 環境ファイル一覧 {#env-files}

| ファイル | 層 | 誰 | 内容 | Git |
|----------|-----|-----|------|:---:|
| [`.env.example`](../.env.example) | Docker | 全員 | `TUNNEL_TOKEN` | ✅ |
| `.env` | Docker | ローカル | Tunnel トークン | ❌ |
| [`.env.production.example`](../.env.production.example) | シェル | メンテナ | `MPD_HOST` / `MPC_HOST` | ✅ |
| `.env.production` | シェル | メンテナ | `deploy.sh` が `--var` 注入 | ❌ |
| [`.env.e2e.example`](../.env.e2e.example) | E2E | 開発者 | smoke URL | ✅ |
| [`workers/.dev.vars.example`](../workers/.dev.vars.example) | Wrangler | 任意 | secrets（`bun run dev` 用） | ✅ |
| `workers/.dev.vars` | Wrangler | 任意 | 上記の実値 | ❌ |
| [`workers/wrangler.jsonc`](../workers/wrangler.jsonc) | Wrangler | 全員 | Worker `radio`, `workers_dev: true` | ✅ |

### 役割の整理

| 名前 | 何か |
|------|------|
| **`.env`** | Docker Compose の Tunnel トークンだけ |
| **`.env.production`** | メンテナの MPD/MPC ホスト名（gitignore） |
| **`workers/.dev.vars`** | ローカル `bun run dev` 用 secrets（**任意** — deploy には不要） |
| **`wrangler.jsonc`** | Worker 定義。`env.production` / `env.preview` は**なし** |

## デプロイコマンド

| コマンド | 向き先 |
|----------|--------|
| Deploy ボタン | `radio.*.workers.dev`（プレースホルダ vars） |
| `bun run deploy`（`.env.production` あり） | 同じ Worker `radio` + 実ホスト名 vars |
| `bun run deploy`（`.env.production` なし） | フォーク既定 |

### `vpr build` 落とし穴 {#deploy-pitfall}

`bun run deploy` は `vpr build` のあと **必ず `--config wrangler.jsonc`** を付けます。`dist/radio/wrangler.json` だけではプレースホルダ vars のままです。

## デプロイ後に必ずやること

### 1. vars（ダッシュボード or deploy 時注入）

| 変数 | 説明 |
|------|------|
| `MPD_HOST` | MP3 ストリームの Tunnel ホスト |
| `MPC_HOST` | mpc-bridge（**Access 必須**） |

### 2. Secrets

[`workers/.dev.vars.example`](../workers/.dev.vars.example) 参照。`wrangler secret put` で登録。

### 3. カスタムドメイン（任意）

ダッシュボード **Workers → radio → Domains & Routes** で追加。リポジトリには書かない。

### 4. E2E smoke

```bash
export RADIO_E2E_WORKERS_URL=https://radio.<account>.workers.dev
make test-e2e-workers

# カスタムドメイン
RADIO_E2E_ALLOW_PROD=1 make test-e2e-prod
```

## よくある落とし穴

| 問題 | 対処 |
|------|------|
| `radio-production.*` が出る | 古い `--env production` deploy の残骸。`bun run deploy`（env なし）で `radio` に統一 |
| 044g.com がプレースホルダ vars | `.env.production` を作って `bun run deploy` |
| OpenAPI が本番ドメインで見える | カスタムドメインでは 404（`*.workers.dev` とローカル dev のみ） |

図解: [diagrams.md#deploy-flow](diagrams.md#deploy-flow)

## 関連

| ドキュメント | 内容 |
|-------------|------|
| [test.md](test.md) | E2E ティア |
| [workers/README.md](../workers/README.md) | 開発コマンド |
