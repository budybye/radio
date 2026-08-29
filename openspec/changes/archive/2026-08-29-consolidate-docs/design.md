## Context

現状の `docs/` は 12 ファイル + `patterns/`。アーキテクチャ図・デプロイ・ホスト表が `README.md`, `design.md`, `tech.md`, `requirements.md` に重複。`directory.md` と `references.md` は e2e/CI/openspec/deploy-fork 未反映。`openspec/specs/` は空で完了 change が残存。

動機は proposal.md の Why を参照。

## Goals / Non-Goals

**Goals:**

- 各トピックの正本を 1 ファイルに固定し、他はリンクのみ
- Mermaid 図を `docs/diagrams.md` に集約
- `directory.md` / `references.md` を現状リポジトリと一致
- 完了 change を archive し `openspec/specs/listener-home-ui/` を初回ベースラインとする
- フォーク向け deploy 注意を `deploy-fork.md` に明記

**Non-Goals:**

- `tech.md` / `design.md` のファイル削除（薄くリンク化のみ）
- `problems.md` / `tasks.md` の大幅リライト
- コード・wrangler 設定変更

## Decisions

### 1. 図の正本: `docs/diagrams.md`

Mermaid で system topology / auth matrix / deploy flow / test pyramid / docs layers を集約。`README.md` の ASCII 図はリンクに置換。

### 2. デプロイ正本: `docs/deploy-fork.md`

フォーク vs メンテナの deploy コマンド差、Workers-only 制限、secrets 表はここを正本とする。

### 3. OpenSpec archive 順序

1. `openspec validate --change upgrade-home-ui-bass-reflex`
2. `openspec archive upgrade-home-ui-bass-reflex`
3. `openspec archive sync-docs-with-openspec`
4. `docs/openspec.md` と `requirements.md` を更新

### 4. ホスト名

`044g.com` はメンテナ本番例として残す。フォーク文書は `your-domain.com` / `mpd.example.com` を優先。

## Risks / Trade-offs

- **[Risk] リンク切れ** → tasks に grep 検証を含める
- **[Risk] archive 不整合** → validate 必須
- **[Trade-off] ファイル数は維持** → 正本化で cognitive load を下げる

## Migration Plan

1. `diagrams.md` 作成 → 既存 doc リンク化 → archive → openspec.md 更新 → README 1 行追加

ロールバック: git revert。

## Open Questions

（なし）
