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

## デプロイ後に必ずやること

### 1. 環境変数（vars）

ダッシュボード **Workers → あなたの Worker → Settings → Variables** で、自分のホスト名に差し替えます。

| 変数 | 例 | 説明 |
|------|-----|------|
| `MPD_HOST` | `mpd.your-domain.com` | MP3 ストリームのホスト |
| `MPC_HOST` | `mpc.your-domain.com` | mpc-bridge（**Access 保護必須**） |

既定の `mpd.example.com` / `mpc.example.com` はプレースホルダです。**044g.com には繋がりません。**

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
| `cd workers && wrangler deploy` | **推奨** — ルート `wrangler.jsonc` の既定 env（プレースホルダ vars） |
| Deploy ボタン | 上記と同じ既定 env で初回デプロイ + Workers Builds 設定 |
| `cd workers && bun run deploy` | ⚠️ **`--env production`（044g.com）** — メンテナ専用。フォークでは使わない |

### よくある落とし穴

| 問題 | 原因 | 対処 |
|------|------|------|
| ストリームが聴けない | vars が `mpd.example.com` のまま | 自分の Tunnel ホスト名に変更 |
| mpc 操作が失敗 | Access Token 未設定 / ポリシー不一致 | Service Token を secrets に登録 |
| 044g.com の曲が流れる | `bun run deploy` を実行した | `wrangler deploy`（env なし）を使う |
| Workers Builds が upstream を参照 | ボタン URL が budybye のまま | フォーク URL に差し替え |

図解: [diagrams.md#deploy-flow](diagrams.md#deploy-flow)

## メンテナ向け（044g.com）

```bash
cd workers && bun run deploy   # wrangler deploy --env production
```

`env.production` では `MPD_HOST=mpd.044g.com`, `MPC_HOST=mpc.044g.com`, `workers_dev: false` が設定されています。

プレビュー環境:

```bash
cd workers && bun run deploy:preview   # wrangler deploy --env preview
```

## 関連ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| [tech.md](tech.md) | Docker / Makefile / compose 詳細 |
| [design.md](design.md) | アーキテクチャ・ADR |
| [workers/README.md](../workers/README.md) | Workers ルート・開発コマンド |
| [diagrams.md](diagrams.md) | システム図・認証マトリクス |
