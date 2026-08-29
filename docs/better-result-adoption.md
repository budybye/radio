# better-result 採用監査（radio）

**日付**: 2026-08-29  
**ブランチ**: Audit（本番コード変更なし）  
**パッケージ**: `better-result@^3.0.1`（`workers/package.json`）  
**既存パターン文書**: [patterns/better-result.md](patterns/better-result.md)

## 1. Scope and repository facts

### リポジトリ構成

| 領域 | ランタイム | 言語 | better-result |
|------|-----------|------|---------------|
| `workers/` | Cloudflare Workers + DO | TypeScript | **採用済み（部分）** |
| `mpc-bridge/` | Docker コンテナ | Go | 対象外（境界のみ） |
| `scripts/`, `compose.yaml`, `Dockerfile` | Pi / ローカル Docker | Bash / shell | 対象外 |
| `workers/test/`, `scripts/e2e/` | CI / 手動 E2E | TS / Bash | テスト証拠のみ |

### 検証コマンド

```bash
cd workers && bun run test && bun run lint
cd mpc-bridge && go test ./...
make test-e2e-stub
make test-e2e-workers
```

### インストール済み API（確認済み）

`Result`, `TaggedError`, `Ok`, `Err`, `Panic`, `panic`, `matchError`, `ResultSerializationError`, `ResultDeserializationError`, `UnhandledException`

**未使用**: `Result.codec`, `Result.gen`, `Result.await`, `serializeUnsafe`, `matchError`（本番）

### 既存 TaggedError（`workers/app/lib/radio/errors.ts`）

| クラス | 意味 |
|--------|------|
| `MpcHttpError` | mpc-bridge HTTP 非成功 |
| `MpdInvalidResponseError` | 空 body / 不正 MPD 応答 |
| `MpdAckError` | MPD `ACK [...]` |
| `MpdTransportError` | その他 / 未知 cause のラップ |

---

## 2. Search evidence and counts

| 機構 | 件数 | 主な場所 |
|------|-----:|----------|
| `import … better-result` | 9 | bridge, playlist, current-song, ping, mpd-agent, serialize |
| `Result.tryPromise` | 2 | `bridge.ts`, `ping.ts` |
| `TaggedError` 定義 | 4 | `errors.ts` |
| `throw new Error`（本番） | 4 | `client.tsx`, `bridge.ts`, `ping.ts`, `mpd-agent.ts` |
| 空 `catch` | 6 | `use-mpd-agent.tsx`, `use-radio-player.tsx` |
| `err: () =>` 握りつぶし | 4 | SSR, posts index, serialize cache |

---

## 3. Production-area coverage map

| Production area | Entry points | Failure mechanisms | Boundaries |
|-----------------|-------------|--------------------|------------|
| Workers HTTP | `server/index.tsx`, routes | Result + respondMpd*; **posts index err→[]** | HTTP JSON/HTML |
| MPD bridge | `bridge.ts`, `playlist.ts` | Result.tryPromise, TaggedError | mpc-bridge HTTP |
| MpdAgent DO | `mpd-agent.ts` | Result; **lastError: string** | WS/RPC |
| RPC wire | `serialize.ts` | 手動 envelope（Result.codec 未使用） | DO callable |
| Inertia SSR | `fetchCurrentSong`, `fetchListenerCount` | **err→undefined/0** | page props |
| React client | `use-radio-player`, `use-mpd-agent` | try/catch, string errors | audio, WS |
| mpc-bridge Go | `main.go` | Go error, ACK | MPD TCP |

---

## 4. Failure catalog（抜粋）

| ID | 内容 | 現状 | 提案 |
|----|------|------|------|
| F10 | Posts 一覧 MPD 障害 | `err→[]` サイレント | **respondMpdTextError** |
| F11 | DO tick 障害 | `lastError` が message のみ | **MpdErrorWire 保持** |
| F08/F09 | SSR 取得失敗 | undefined / 0 | Result 化 + 境界で劣化（要 U01） |
| F05 | 制御文字引数 | throw → TransportError | `MpdInvalidArgumentError` |
| F13 | Agents refresh 失敗 | 空 catch | ログ or 明示 state |

---

## 5. End-to-end paths

- **A MPD→HTTP JSON**: 完成度高（playlist, routes, serialize）
- **B MPD→Inertia**: 中（**一覧のみ欠陥 F10**）
- **C DO→WS**: 中（tag 喪失 F11）
- **D SSR Home**: 意図的劣化（F08/F09）
- **E RPC refresh**: 低（空 catch F13）

---

## 6. Boundary map（要約）

| Boundary | Codec |
|----------|-------|
| `GET /currentsong` | 手動 `serializeMpdResult` + valibot |
| MpdAgent RPC | 同上（`Result.codec` 未使用） |
| WS `MpdAgentState` | `lastError: string` のみ — 要改善 |
| Inertia SSR | エラー props なし |

---

## 7–8. 提案とマッピング

- 追加 TaggedError: `MpdInvalidArgumentError`（任意）
- Panic 候補: 未知 Inertia ページ、binding 未設定
- HTTP: 既存 `mpdErrorHttpStatus` で tag→status
- UI: Home は `agentError` 文字列 → FAULT

---

## 9. Ranked migration slices

| 順 | スライス | 理由 |
|----|----------|------|
| **1** | **Posts 一覧 F10 修正** | 1 ルート、高価値、低リスク、テスト容易 |
| 2 | MpdAgent lastError 構造化 | FAULT 精度、OpenAPI |
| 3 | SSR Result 化 | 観測性（U01 要決定） |
| 4 | MpdInvalidArgumentError | HTTP 400 |
| 5 | Result.codec 評価 | 保守性 |
| 6 | Client refresh 明示化 | 低優先 |

---

## 10. Unknowns

- **U01**: SSR 障害時に UI でエラー表示するか fallback のままか
- **U02**: `lastError` を `_tag` 付きで公開するか
- **U03**: `Result.codec` 移行するか

---

## 11. Progress

| スライス | 状態 |
|----------|------|
| MPD RPC/JSON, Posts CRUD, bridge | 完了 |
| Posts 一覧, lastError 構造化, SSR, codec | 未着手 |

---

## Approval gate

本監査の変更は **本ファイルのみ**。実装は明示承認後。

**推奨ファーストスライス**: **#1 Posts 一覧（F10）** — `posts-routes.ts` の `err→[]` を既存 `respondMpdTextError` パターンへ。
