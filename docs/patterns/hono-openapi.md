# hono-openapi + Valibot パターン

Wire スキーマ: `workers/app/schemas/openapi/`

## Scalar UI

```bash
cd workers && bun run dev
# http://localhost:5173/scalar
```

`/scalar` と `/openapi.json` は dev + preview (`MPC_HOST=e2e-dummy`) のみ。本番カスタムドメインでは 404。
