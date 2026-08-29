## Context

`refresh-docs-globe-e2e` archive 後の docs 状態:

| 領域 | 状態 |
|------|------|
| GlobeSpeaker / E2E / MPD フロー図 | ✅ `diagrams.md` に反映済み |
| `listener-home-ui` spec | ✅ archive 済み |
| post-archive チェックリスト | ❌ `openspec.md` で 3 項目未チェック |
| deploy 手順 | ⚠️ `package.json` は `--config wrangler.jsonc` 修正済みだが docs 未追従 |
| preview E2E | ⚠️ 本番 deploy 後 `workers_dev: false` → `*.workers.dev` 404（docs に未記載） |
| `tech.md` Workers 節 | ⚠️ `use-mpd-agent.ts` 表記、リスナー数二経路の説明不足 |

動機は proposal.md の Why を参照。

## Goals / Non-Goals

**Goals:**

- 各トピックの正本を 1 箇所に固定（deploy → `deploy-fork.md`、MPD フロー → `diagrams.md#mpd-home-data-flow`、E2E → `test.md`）
- post-archive チェックリストを実態に合わせて完了
- deploy 落とし穴（`vpr build` + `dist/radio/wrangler.json` vs `wrangler.jsonc --env production`）を docs に明文化
- `tasks.md` / `problems.md` のマイルストーン・リスクを 2026-08 時点に同期
- 内部リンク spot-check（`docs/README.md` → 新アンカー）

**Non-Goals:**

- 新機能要件や spec delta（`skip_specs: true`）
- `workers/` コード変更（deploy スクリプトは既に修正済み）
- `graphify update .` の実行自体（docs に「推奨」と記載するのみ）
- `problems.md` の全面リライト

## Decisions

### 1. deploy 正本: `deploy-fork.md` + `diagrams.md#deploy-flow`

**決定**: `bun run deploy` の実体を「`vpr build && wrangler deploy --env production --config wrangler.jsonc`」と明記。`dist/radio/wrangler.json` がフォーク既定 vars になる理由を 1 段落で説明。

**理由**: 実際に `bun run deploy` だけでは `mpd.example.com` がデプロイされた事故が発生済み。

### 2. preview / prod workers.dev 分離

**決定**: `test.md` に「`env.production` deploy 後は `radio.*.workers.dev` は無効。preview E2E には `deploy:preview` を別途実行」と追記。

### 3. Agents SDK ドキュメント

**決定**: 新 spec は作らず、`tech.md` Workers 節と `diagrams.md#mpd-home-data-flow` を正本とする。`references.md` に Agents SDK URL を追加。

### 4. post-archive チェックリスト

**決定**: apply 時に `problems.md` / `tasks.md` / graphify 注記を更新し `openspec.md` を `[x]` にする。

### 5. OpenSpec archive 例

**決定**: `openspec.md` の archive 例に `2026-08-29-refresh-docs-globe-e2e/` を追加。

## Risks / Trade-offs

- **[Risk] docs 再監査が無限に広がる** → スコープを `docs/` + ルート README deploy 節に限定
- **[Trade-off] patterns に agents-sdk.md を作らない** → tech.md + diagrams で足りるなら見送り

## Migration Plan

1. docs 更新（deploy → test → tech → openspec checklist）
2. 内部リンク spot-check
3. `openspec validate --change docs-post-archive-audit`
4. `openspec archive docs-post-archive-audit`

ロールバック: git revert。

## Open Questions

（なし）
