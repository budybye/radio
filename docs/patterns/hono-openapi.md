# hono-openapi + Valibot パターン

Wire スキーマ: `workers/app/schemas/openapi/`

## OpenAPI JSON

```bash
cd workers && bun run dev
# http://localhost:5173/openapi.json
```

`/openapi.json` は **ローカル dev** と **`*.workers.dev`** のみ。カスタムドメインでは 404。
