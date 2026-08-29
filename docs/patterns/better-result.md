# better-result パターン（v3）

`better-result@^3` を使ったエラーハンドリングのテンプレート。境界ごとに型と変換を分離する。

## 境界一覧

| 境界 | 型 | テンプレート |
|------|-----|-------------|
| インフラ（fetch, MPD TCP） | `Result<T, MpdError>` | `Result.tryPromise` + `mpdErrorFromUnknown` |
| アプリ内部 | `Result<T, MpdError>` | `andThen` / `map` / `match` |
| RPC / JSON（DO, `/currentsong`） | `SerializedMpdResult<T>` | `serializeMpdResult` → `hydrateMpdError` |
| HTTP JSON API | `{ error, message }` + status | `respondMpdJsonError` |
| HTTP HTML / Inertia | 404 / 502 / redirect | `matchMpdResourceOrHttp`, `respondMpdTextError` |
| フォームバリデーション | `FieldErrors<T>` | `emptyFormErrors`, `toFieldErrorsFromIssues` |

## 1. TaggedError 定義

```ts
export class MpdTransportError extends TaggedError("MpdTransportError")<{
  message: string;
  cause?: unknown;
}> {}
```

## 2. インフラ境界で Result 化

```ts
return Result.tryPromise({
  try: async () => { /* fetch / bridge */ },
  catch: mpdErrorFromUnknown,
});
```

## 3. RPC / JSON 境界（wire 型）

```ts
return serializeMpdResult(result);
const parsed = parseSerializedCurrentSongView(wire);
return parsed ? deserializeCurrentSongView(parsed) : Result.err(...);
```

**注意**: wire 型は `SerializedMpdResult<T>`（`MpdErrorWire`）を使う。

## 4. HTTP JSON 境界

```ts
if (result.isErr()) return respondMpdJsonError(c, result.error);
return c.json(result.value);
```

## 5. HTTP HTML / Inertia 境界

```ts
return matchMpdResourceOrHttp(c, await findSong(id), (post) =>
  c.render("Posts/Show", { post }),
);
```

## 6. フォームバリデーション境界

```ts
export const emptyPostFormErrors = emptyFormErrors<PostSongInput>();
c.render("Posts/New", { values, errors: emptyPostFormErrors });
```

`errors: {}` は使わない。

## 完了済みスライス

| スライス | 範囲 |
|----------|------|
| MPD Result RPC/JSON | `serialize.ts`, `mpd-agent.ts`, `current-song.ts` |
| Posts HTTP 境界 | `mpd-http.ts`, `posts-routes.ts`, `mpd/routes.ts` |
