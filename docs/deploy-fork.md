# フォークして Cloudflare にデプロイする

このリポジトリは **Deploy to Cloudflare** ボタンで、他人が自分の Cloudflare アカウントに Web UI（`workers/`）だけを載せられる想定です。

> **デプロイされるのは Workers アプリのみ**です。MPD / mpc-bridge / Tunnel の Docker スタックは別途、各自の環境で起動してください。

## ワンクリックデプロイ

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/budybye/radio&directory=workers)

## デプロイ先（2 URL だけ） {#deploy-targets}

| URL | 誰 | コマンド |
|-----|-----|----------|
| `https://radio.<account>.workers.dev` | 全員 | `bun run deploy`（フォークは `workers/.env` なし） |
| カスタムドメイン（任意） | メンテナ | ダッシュボードで Worker `radio` にバインド |

**Worker 名は常に `radio` 一つ。**

### メンテナ本番

```bash
cp workers/.env.example workers/.env
# MPD_HOST / MPC_HOST を実ホスト名に編集

cd workers && bun run deploy
# → Worker "radio" + radio.*.workers.dev + カスタムドメイン（ダッシュボード）
```

### フォーク

```bash
cd workers && bun run deploy   # workers/.env なし → プレースホルダ vars
```

## 環境ファイル（2 つだけ） {#env-files}

| ファイル | 誰 | 内容 |
|----------|-----|------|
| **ルート [`.env`](./.env)** | ローカル運用 | `TUNNEL_TOKEN`（Docker）、`RADIO_E2E_*`（smoke URL） |
| **[`workers/.env`](./workers/.env)** | メンテナ / 開発者 | `MPD_HOST` / `MPC_HOST`（deploy）、Access / Basic Auth など secrets |

テンプレート: [`.env.example`](./.env.example)、[`workers/.env.example`](./workers/.env.example)

```bash
make setup   # 両方の .env を example から作成
```

### 役割の整理

| 変数 | 置き場所 | 読み込み元 |
|------|----------|------------|
| `TUNNEL_TOKEN` | ルート `.env` | Docker Compose |
| `RADIO_E2E_WORKERS_URL` / `RADIO_E2E_PROD_URL` | ルート `.env` | `make test-e2e-*` |
| `MPD_HOST` / `MPC_HOST` | `workers/.env` | `deploy.sh` → `wrangler --var` |
| `CF_ACCESS_*`, `USERNAME`, `PASSWORD`, `TOKEN` | `workers/.env` | `bun run dev`（`.dev.vars` へ symlink）、`wrangler secret bulk` |

`wrangler.jsonc` にはプレースホルダ vars のみ。本番ホスト名は **repo に載せず** `workers/.env` に書く。

## デプロイコマンド

| コマンド | 向き先 |
|----------|--------|
| Deploy ボタン | `radio.*.workers.dev`（プレースホルダ vars） |
| `bun run deploy`（`workers/.env` あり） | 同じ Worker `radio` + 実ホスト名 vars |
| `bun run deploy`（`workers/.env` なし） | フォーク既定 |

### `vpr build` 落とし穴 {#deploy-pitfall}

`bun run deploy` は `vpr build` のあと **`dist/radio/wrangler.json`** をデプロイします（ビルド済み Worker + `dist/client` アセット）。

- `wrangler.jsonc` は **ソース設定**（`vpr build` の入力）— これを直接 deploy すると dev 用パス（`/@vite/client`）が出て UI が壊れます
- `workers/.env` の `MPD_HOST` / `MPC_HOST` は deploy 時に `--var` で注入（`dist/radio/wrangler.json` のプレースホルダを上書き）

## デプロイ後

### 1. vars

| 変数 | 説明 |
|------|------|
| `MPD_HOST` | MP3 ストリームの Tunnel ホスト |
| `MPC_HOST` | mpc-bridge（**Access 必須**） |

### 2. Secrets

`workers/.env` の secrets を `cd workers && bun run cf-secret` で登録。

### 3. カスタムドメイン（任意）

ダッシュボード **Workers → radio → Domains & Routes** で追加。

### 4. E2E smoke

ルート `.env` に URL を書くか export:

```bash
# ルート .env に RADIO_E2E_WORKERS_URL=... を書いてから
make test-e2e-workers

RADIO_E2E_ALLOW_PROD=1 make test-e2e-prod
```

## よくある落とし穴

| 問題 | 対処 |
|------|------|
| `radio-production.*` が出る | 古い deploy の残骸。`bun run deploy` で `radio` に統一 |
| 本番がプレースホルダ vars | `workers/.env` を作って `bun run deploy` |
| OpenAPI がカスタムドメインで見える | 意図的に 404（`*.workers.dev` とローカル dev のみ） |

図解: [diagrams.md#deploy-flow](diagrams.md#deploy-flow)

## 関連

| ドキュメント | 内容 |
|-------------|------|
| [test.md](test.md) | E2E ティア |
| [workers/README.md](../workers/README.md) | 開発コマンド |
