# 実装パターン

`workers/` 実装に対応する再利用パターンです。以下の TypeScript は形を示す **抜粋**で、完成関数ではありません。実際の API と型は各ソースを確認してください。

## better-result 境界

`better-result@^3` を使い、インフラで失敗を `Result` に変換し、アプリ内部で合成し、HTTP/RPC 境界で別形式へ変換します。

| 境界 | 型・形式 | 実装の正本 |
|------|----------|------------|
| インフラ（fetch、mpc-bridge HTTP） | `Result<T, MpdError>` | [`bridge.ts`](../workers/app/server/mpd/bridge.ts)、[`errors.ts`](../workers/app/lib/radio/errors.ts) |
| アプリ内部 | `Result<T, MpdError>` | [`current-song.ts`](../workers/app/server/mpd/current-song.ts) |
| RPC / JSON（DO、`/currentsong`） | `SerializedMpdResult<T>` | [`serialize.ts`](../workers/app/lib/radio/serialize.ts)、[`serialize-wire.ts`](../workers/app/lib/radio/serialize-wire.ts) |
| HTTP JSON API | `{ error, message }` + status | [`mpd-http.ts`](../workers/app/lib/radio/mpd-http.ts)、[`api/queue.ts`](../workers/app/server/api/queue.ts) |
| HTTP HTML / Inertia | 404 / 502 / redirect | [`mpd-http.ts`](../workers/app/lib/radio/mpd-http.ts)、[`queue-routes.ts`](../workers/app/server/queue-routes.ts) |
| フォームバリデーション | `FieldErrors<T>` | [`form-errors.ts`](../workers/app/lib/validation/form-errors.ts)、[`validation.ts`](../workers/app/lib/validation.ts) |

### TaggedError

```ts
// 抜粋: workers/app/lib/radio/errors.ts の TaggedError 定義
export class MpdTransportError extends TaggedError("MpdTransportError")<{
  message: string;
  cause?: unknown;
}> {}
```

### インフラ境界で Result 化

```ts
// 抜粋: fetch / bridge 呼び出しを Result.tryPromise で包む形
return Result.tryPromise({
  try: async () => { /* fetch / bridge */ },
  catch: mpdErrorFromUnknown,
});
```

### RPC / JSON の wire 型

```ts
// 抜粋: workers/app/lib/radio/serialize.ts
return serializeMpdResult(result);
const parsed = parseSerializedCurrentSongView(wire);
return parsed ? deserializeCurrentSongView(parsed) : Result.err(/* MpdError */);
```

wire には `SerializedMpdResult<T>` と `MpdErrorWire` を使い、受信側で `hydrateMpdError` が `_tag` から既知の `MpdError` を復元します。不正または未知のタグは transport error にフォールバックします。

### HTTP JSON / HTML 境界

```ts
// 抜粋: workers/app/server/api/queue.ts
if (result.isErr()) return respondMpdJsonError(c, result.error);
return c.json(result.value);
```

```ts
// 抜粋: workers/app/server/queue-routes.ts
return matchMpdResourceOrHttp(c, await findSong(id), (post) =>
  c.render("Queue/Show", { song }),
);
```

### フォームバリデーション

```ts
// 抜粋: workers/app/lib/validation.ts
export const emptyQueueFormErrors = emptyFormErrors<QueueSongInput>();
c.render("Queue/New", { values, errors: emptyQueueFormErrors });
```

Standard Schema の issues は `toFieldErrorsFromIssues` でフィールドごとに集約します。空のフォームには `errors: {}` ではなく、型付きの `emptyFormErrors<T>()` を使います。

## Hono OpenAPI + Valibot

OpenAPI 対象の JSON ルートは、Valibot の wire schema を `hono-openapi` の `describeRoute` / `resolver` / `validator` と組み合わせます。ルート実装の正本は [`server/api/queue.ts`](../workers/app/server/api/queue.ts) と [`server/mpd/routes.ts`](../workers/app/server/mpd/routes.ts)、wire schema は [`schemas/openapi/`](../workers/app/schemas/openapi/) です。

```ts
// 抜粋: workers/app/server/mpd/routes.ts
.get("/status", describeRoute({ /* summary, security, responses */ }), /* validator / handler */)
```

`MpdAgentState` は `@valibot/to-json-schema` で OpenAPI components に変換されます（[`server/openapi/mount.ts`](../workers/app/server/openapi/mount.ts)）。`SerializedMpdResult` の wire schema は `/currentsong` のレスポンス定義で `resolver` に渡します（[`server/mpd/routes.ts`](../workers/app/server/mpd/routes.ts)）。

`/openapi.json` はローカル dev と `*.workers.dev` のみ公開し、カスタムドメインでは 404 です。Scalar UI は公開しません。挙動の正本は [`mount.ts`](../workers/app/server/openapi/mount.ts) と [`mount.test.ts`](../workers/app/server/openapi/mount.test.ts) です。
