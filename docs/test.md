# テスト方針

## E2E ティア（localhost なし）

| ティア | 対象 URL | 内容 | コマンド |
|--------|----------|------|----------|
| **workers** | `https://radio.*.workers.dev` | deploy 後の構造 smoke | `make test-e2e-workers` |
| **prod** | カスタムドメイン | 読み取りのみ | `RADIO_E2E_ALLOW_PROD=1 make test-e2e-prod` |

`localhost:5173` / `vp dev` は **E2E に含めません**。UI の手動確認用に `bun run dev` は残しています。

### workers ティア

```bash
cd workers && bun run deploy
# ルート .env に RADIO_E2E_WORKERS_URL=https://radio.<account>.workers.dev
make test-e2e-workers
```

| ステップ | 検証 |
|----------|------|
| `workers/test/smoke.ts` | HTTP 200 + Inertia shell |
| `opencli-home.sh` | ハイドレーション後 `LISTENERS` / `.globe-speaker` |

fixture 値（リスナー数 3 等）は **vitest**（`mpd-fixture-contract.test.ts` + `mpd-stub-http.test.ts`）で検証（deploy 不要）。

### prod ティア

```bash
make test-e2e-prod
```

`smoke-deployed.sh prod` が `RADIO_E2E_ALLOW_PROD=1` を設定。ルート `.env` の `RADIO_E2E_PROD_URL` を自動読み込み。

## Workers ユニットテスト

```bash
cd workers && bun run test
# または make test-workers
```

## CI

| ワークフロー | 内容 |
|-------------|------|
| `workers-test.yaml` | vitest（mpd-stub HTTP 含む）→ lint → build |

CI に opencli / workers.dev smoke は入れません（手動）。

## 環境変数

ルート [`.env.example`](../.env.example) — `RADIO_E2E_WORKERS_URL`, `RADIO_E2E_PROD_URL`
