# hono-openapi + Valibot パターン

Wire スキーマ: `workers/app/schemas/openapi/`

## Scalar UI

```bash
cd workers && bun run dev
# http://localhost:5173/scalar
```

`/scalar` と `/openapi.json` は **ローカル dev** と **`*.workers.dev`** のみ。カスタムドメインでは 404。
