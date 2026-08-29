# コードパターン索引

再利用可能な実装テンプレート。新機能・リファクタ時はここからコピーし、change design に逸脱があれば記録する。

| パターン | 用途 | ファイル |
|----------|------|----------|
| [better-result](better-result.md) | `Result` / `TaggedError` / RPC・HTTP 境界 | `workers/app/lib/radio/` |
| [hono-openapi](hono-openapi.md) | Valibot wire → OpenAPI、`/api/*` JSON ルート | `workers/app/schemas/openapi/` |
| フォームバリデーション | Inertia + Valibot フィールドエラー | `workers/app/lib/validation/form-errors.ts` |

## 使い方

1. 該当パターン doc を読む
2. テンプレート関数を import して境界に適用
3. 新しい境界パターンが生まれたら本目录に doc + テストを追加
