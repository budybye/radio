# テスト方針

## テスト戦略

本プロジェクトは **Docker スタック（MPD + Tunnel）** と **Workers アプリ（`workers/`）** の二層。

```
        ┌──────────────┐
        │ E2E (opencli)│  Home UI smoke — tier 別 URL・別アサーション
        │  + HTTP smoke│
       ┌┴──────────────┴┐
       │ Integration     │  make test (Docker MPD), mpd-stub contract
       │   （自動）       │
      ┌┴─────────────────┴┐
      │ Unit / Static       │  vitest (workers), docker build, tsc
      └─────────────────────┘
```

図解: [diagrams.md#test-pyramid](diagrams.md#test-pyramid)

## E2E ティア — いつ何を使うか

| ティア | 対象 URL | MPD バックエンド | fixture 値を検証 | 主な用途 | コマンド |
|--------|----------|------------------|:----------------:|----------|----------|
| **local** | `http://127.0.0.1:5173` | **mpd-stub** (`:18080`) | **YES** | UI / DO / RPC の精密検証 | `make test-e2e-local` |
| **preview** | `https://radio-preview.*.workers.dev` | 本番 Tunnel または未設定 | **NO**（構造のみ） | deploy 後の Workers 動作確認 | `make test-e2e-preview` |
| **prod** | `https://044g.com` | 本番 MPD | **NO**（GET / 200 のみ） | デプロイ後の最小 smoke | `RADIO_E2E_ALLOW_PROD=1 make test-e2e-prod` |

### ティア選定フロー

```
変更内容は？
├─ parse / serialize / bridge URL  → vitest（常に CI）
├─ mpd-stub fixture 整合性         → mpd-stub-contract.sh（CI）
├─ Home UI + DO + stub 連携        → local E2E（opencli 推奨）
├─ Workers ビルド / wrangler 設定  → preview E2E（workers.dev）
└─ 本番デプロイ後の生存確認        → prod smoke（読み取りのみ）
```

### fixture 契約の正本

| ファイル | 役割 |
|----------|------|
| `workers/test/fixtures/mpd/contract.json` | 期待値（listeners=3, Fixture Artist 等） |
| `workers/test/fixtures/mpd/status.txt` | mpd-stub が返す status 本文 |
| `workers/test/fixtures/mpd/currentsong.txt` | mpd-stub が返す currentsong 本文 |
| `workers/test/mpd-fixture-contract.test.ts` | fixture ↔ parse ↔ contract の vitest 検証 |
| `workers/test/read-contract.mjs` | shell E2E スクリプトが期待値を読む CLI |

**local ティアだけ** fixture 値（リスナー数 3、曲名）をアサートする。preview / prod は本番 MPD データに依存するため **構造マーカーのみ**（`LISTENERS`, `.globe-speaker`, `mpd radio`）— preview は opencli でハイドレーション後に検証。

### ガードレール

| ルール | 実装 |
|--------|------|
| prod は opt-in | `RADIO_E2E_ALLOW_PROD=1` 必須 |
| prod は書き込み禁止 | `RADIO_E2E_WRITE=1` は prod で拒否 |
| preview は workers.dev のみ | `common.sh` が `*.workers.dev` を検証 |
| local は loopback のみ | `127.0.0.1` / `localhost` 以外は拒否 |
| `workers_dev` | 本番 `false`、preview `true`（`wrangler deploy --env preview`） |

環境変数: [`.env.e2e.example`](../.env.e2e.example)

## local: mpd-stub + opencli（精密 E2E）

### 何を検証するか

| 層 | 検証内容 | ツール |
|----|----------|--------|
| stub HTTP | ping / status / currentsong が contract 通り | `mpd-stub-contract.sh` |
| SSR | リスナー数 3 が HTML に含まれる | `http-smoke.sh` |
| DO 連携 | fixture 曲名がライブ更新で表示 | `opencli-home.sh`（wait text） |
| 構造 | LISTENERS バッジ、GlobeSpeaker | http + opencli |

### 起動手順

```bash
# 1. mpc-bridge ダミー
bash scripts/e2e/start-mpd-stub.sh
# → http://127.0.0.1:18080/mpd.cgi?cmd=status

# 2. Workers dev（stub 向き）
cp workers/.dev.vars.example workers/.dev.vars
cd workers && MPC_BRIDGE_BASE_URL=http://127.0.0.1:18080 bun run dev

# 3. 一括実行
make test-e2e-local
```

### 個別 smoke

```bash
RADIO_E2E_TIER=local bash scripts/e2e/http-smoke.sh
RADIO_E2E_TIER=local bash scripts/e2e/opencli-home.sh
```

opencli セッション: `RADIO_E2E_OPENCLI_SESSION`（既定 `radio-e2e`）

## preview: workers.dev（構造 smoke のみ）

**目的**: `wrangler deploy`（既定 `workers_dev: true`）または `deploy:preview` 後、Workers バンドル・DO binding・HTML 配信が壊れていないことを確認。

**検証しないもの**: fixture のリスナー数 3、Fixture Artist（本番 MPD の実データに依存するため）。

本番ビルドの SSR は **Inertia JSON シェル**のみ（`<div id="app">` + `data-page`）。DOM マーカー（`LISTENERS`, `.globe-speaker`）はクライアントハイドレーション後に出るため:

| ステップ | 検証内容 |
|----------|----------|
| `http-smoke.sh` | HTTP 200 + Inertia shell（`"component":"Home"`, `listenerCount`, `titleFallback`） |
| `opencli-home.sh` | ハイドレーション後の `LISTENERS` / `.globe-speaker` |

```bash
cd workers && bun run deploy          # 既定 → https://radio.<account>.workers.dev
# または
cd workers && bun run deploy:preview  # env.preview（radio-preview 名）

export RADIO_E2E_PREVIEW_URL=https://radio.<account>.workers.dev
make test-e2e-preview
```

| wrangler 設定 | 値 | 意味 |
|---------------|-----|------|
| 既定 `workers_dev` | `true` | フォーク向け `*.workers.dev` |
| `env.preview.workers_dev` | `true` | `radio-preview.*.workers.dev` |
| `env.production.workers_dev` | `false` | カスタムドメイン（044g.com） |

preview で DO ポーリングまで検証する場合は Access secrets を設定し、必要なら `MPC_BRIDGE_BASE_URL` を preview vars に追加。

## prod: 読み取り smoke

```bash
RADIO_E2E_ALLOW_PROD=1 make test-e2e-prod
```

`GET /` の HTTP 200 + 構造マーカーのみ。診断 API・キュー操作は含めない。

## Workers ユニットテスト

```bash
cd workers && bun run test
# または
make test-workers
```

| 対象 | ファイル |
|------|----------|
| MPD parse / listeners | `app/server/mpd/parse.test.ts` |
| mpc-bridge URL 組み立て | `app/server/mpd/bridge.test.ts` |
| RPC serialize / hydrate | `app/lib/radio/serialize.test.ts` |
| HTTP エラー境界 | `app/lib/radio/mpd-http.test.ts` |
| フォームエラー | `app/lib/validation/form-errors.test.ts` |
| **fixture 契約** | `test/mpd-fixture-contract.test.ts` |

`vitest.config.ts` は Cloudflare プラグインを避け、pure lib / server parse のみ対象。

## Docker 統合テスト

```bash
make test
```

`scripts/test.sh` — MPD コンテナ、6600、HTTPD、Tunnel、ncmpcpp 設定など。

## CI

| ワークフロー | トリガー | 内容 |
|-------------|----------|------|
| `workers-ci.yaml` | reusable | vitest → lint → build → mpd-stub contract |
| `workers-test.yaml` | PR / `main`（`workers/**` 等） | 上記 reusable を実行 |

### CI で検証する契約

- **Unit**: MPD parse、RPC serialize、bridge URL、フォームエラー、**fixture 契約**
- **Static**: `bun run lint`
- **Build**: `bun run build`
- **mpd-stub contract**: `scripts/e2e/mpd-stub-contract.sh`（`contract.json` 駆動、外部ネットワーク不要）

### CI に含めないもの

| 種別 | 理由 | 代替 |
|------|------|------|
| opencli E2E | runner に opencli 無し | ローカル `make test-e2e-local` |
| preview / prod smoke | デプロイ・opt-in 必要 | 手動 `make test-e2e-preview` / `test-e2e-prod` |
| Docker MPD | 重い | インフラ変更時に `make test` |

## カバレッジ目標

| 領域 | 手段 |
|------|------|
| MPD parse / RPC | vitest + fixture contract |
| stub HTTP | mpd-stub-contract（CI） |
| Home UI 精密 | local opencli（stub + DO） |
| Workers deploy | preview 構造 smoke |
| 本番生存 | prod 読み取り smoke |
