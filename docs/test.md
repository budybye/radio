# テスト方針

## E2E ティア（localhost なし）

| ティア | 対象 URL | 内容 | コマンド |
|--------|----------|------|----------|
| **stub** | （なし） | vitest + mpd-stub contract | `make test-e2e-stub` |
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
| `http-smoke.sh` | HTTP 200 + Inertia shell |
| `opencli-home.sh` | ハイドレーション後 `LISTENERS` / `.globe-speaker` |

fixture 値（リスナー数 3 等）は **vitest + mpd-stub contract** で検証（deploy 不要）。

### prod ティア

```bash
RADIO_E2E_ALLOW_PROD=1 make test-e2e-prod
```

ルート `.env` の `RADIO_E2E_PROD_URL` を自動読み込み。

## Workers ユニットテスト

```bash
cd workers && bun run test
# または make test-workers
```

## CI

| ワークフロー | 内容 |
|-------------|------|
| `workers-test.yaml` | vitest → lint → build → mpd-stub contract |

CI に opencli / workers.dev smoke は入れません（手動）。

## 環境変数

ルート [`.env.example`](../.env.example) — `RADIO_E2E_WORKERS_URL`, `RADIO_E2E_PROD_URL`
