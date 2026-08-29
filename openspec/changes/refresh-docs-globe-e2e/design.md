## Context

実装は既に GlobeSpeaker（`workers/app/components/GlobeSpeaker.tsx`）へ移行済み。E2E preview ティアは `scripts/e2e/lib/contract.sh` の Inertia shell アサーションと `opencli-home.sh` のハイドレーション後検証に分離済み。本 change は **docs / OpenSpec specs の正本を実装に追従させる** ことに限定する。動機は proposal.md の Why を参照。

現状の乖離:

| 領域 | 実装 | ドキュメント |
|------|------|-------------|
| Home スピーカー | 中央 GlobeSpeaker（cobe） | bass-reflex / 3 カラム |
| E2E preview | Inertia shell + opencli | 一部更新済み、diagrams 未反映 |
| OpenSpec spec | `listener-home-ui` が bass-reflex | delta 未 archive |

## Goals / Non-Goals

**Goals:**

- 各トピックの正本を 1 箇所に固定（図 → `diagrams.md`、E2E → `test.md`、UI 振る舞い → `openspec/specs/`）
- `listener-home-ui` spec を GlobeSpeaker 要件に更新し archive
- `requirements.md` / `openspec.md` / `design.md` の bass-reflex 記述を除去
- `diagrams.md` に Home レイアウト図と E2E preview フロー図を追加
- `directory.md` に fixture 契約・GlobeSpeaker パスを反映

**Non-Goals:**

- GlobeSpeaker の cobe カスタマイズ（マーカー色・常時スピン等）— 別 change
- `deploy-fork.md` / `tech.md` の大幅リライト（変更なしなら触らない）
- `problems.md` / `tasks.md` の全面改訂（本 change では触るのは Globe/E2E に直結する行のみ）
- 本番 deploy や wrangler 設定変更

## Decisions

### 1. 図の追加先: `docs/diagrams.md`

**決定**: 新規セクション `home-ui-layout` と `e2e-preview-flow` を Mermaid で追加。

**理由**: `consolidate-docs` で確立した「図の正本は diagrams.md」方針を維持。

**代替案**: `design.md` に埋め込み → 却下（図の分散）

### 2. Spec delta: REMOVED + ADDED（bass-reflex → globe）

**決定**: `Bass-reflex speaker visualization` を REMOVED、`Globe speaker visualization` を ADDED。`Responsive listener home layout` は MODIFIED（desktop シナリオのみ）。

**理由**: 要件の意味が変わるため rename ではなく明示的な除去・追加が archive 時に明確。

### 3. 未使用 BassReflexSpeaker の扱い

**決定**: tasks に「任意」タスクとして `BassReflexSpeaker.tsx` と未参照 `bass-reflex-*` CSS の削除を記載。apply 時に grep で参照ゼロを確認してから削除。

**理由**: docs change の主目的から外れるが、技術的負債として記録。

### 4. E2E ドキュメントの正本

**決定**: `test.md` を正本とし、`diagrams.md#e2e-preview-flow` はフロー図 + `test.md` へのリンク。

**内容**:

| ステップ | 検証 |
|----------|------|
| `http-smoke.sh` (preview) | HTTP 200 + Inertia shell（`component: Home`, `listenerCount`） |
| `opencli-home.sh` (preview) | ハイドレーション後 `LISTENERS` + `.globe-speaker` |

### 5. workers.dev URL の表記

**決定**: 両方を明記。

- 既定 `bun run deploy` / Deploy ボタン → `https://radio.<account>.workers.dev`
- `bun run deploy:preview` → `https://radio-preview.<account>.workers.dev`（`env.preview`）

## Risks / Trade-offs

- **[Risk] archive 前に spec と実装の微差** → apply 前に `make test-e2e-preview` と手動 Home 確認
- **[Risk] diagrams.md が肥大化** → セクション見出し + アンカーで索引。README からリンク
- **[Trade-off] BassReflex CSS 残存** → 削除しない場合は `design.md` に「legacy、Home 未使用」と注記

## Migration Plan

1. delta spec → docs 更新（並行可）
2. `openspec validate --change refresh-docs-globe-e2e`
3. 内部リンク spot-check（`docs/README.md`）
4. `openspec archive refresh-docs-globe-e2e`
5. post-archive: `docs/openspec.md` の specs 表・チェックリスト更新

ロールバック: ドキュメントのみのため git revert で十分。

## Open Questions

（なし — GlobeSpeaker 仕様は実装済みで確定）
