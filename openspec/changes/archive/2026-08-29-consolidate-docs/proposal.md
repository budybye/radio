## Why

`sync-docs-with-openspec` で三層モデルと `openspec.md` は整備したが、`docs/` 配下は **12 ファイル + patterns/** に増え、同じ内容（アーキテクチャ図・デプロイ手順・ホスト表・ディレクトリツリー）が複数箇所に散在している。加えて `openspec/specs/` が空のまま完了 change が `openspec/changes/` に残り、振る舞い仕様の正本が未確立。フォーク向け `deploy-fork.md` 追加後の再確認と、図の一元化・アーカイブを一括で行うタイミング。

## What Changes

- **`docs/diagrams.md` 新設**: システム全体・認証マトリクス・デプロイ（フォーク/本番）・テストピラミッド・ドキュメント階層を Mermaid で一元化
- **`docs/README.md` のスリム化**: 索引 + 読む順 + 図へのリンクに集約。重複 ASCII 図・コードマップは `diagrams.md` / `design.md` へ委譲
- **`docs/directory.md` の全面更新**: `deploy-fork.md`, `openspec.md`, `patterns/`, `scripts/e2e/`, `.github/workflows/workers-*.yaml` 等を反映
- **`docs/references.md` の内部リンク更新**: 欠落ファイル（`deploy-fork`, `openspec`, `patterns`）を追加
- **`docs/deploy-fork.md` の拡充**: カスタムドメイン・フォーク向け注意・手動デプロイ・メンテナ/フォークの deploy コマンド差を明記
- **`docs/tech.md` / `docs/design.md` の重複削減**: デプロイ詳細は `deploy-fork.md` へ、図は `diagrams.md` へリンク
- **`docs/requirements.md`**: Phase 3 完了項目を現状に同期
- **OpenSpec archive**: 完了 change を `openspec archive` し `openspec/specs/` に昇格
- **`docs/openspec.md`**: archive 後の specs リンクを更新

## Capabilities

### New Capabilities

（なし — ドキュメント整備・OpenSpec archive のみ。`skip_specs: true`）

### Modified Capabilities

（なし）

## Impact

- **ドキュメント**: `docs/README.md`, `docs/diagrams.md`（新規）, `docs/directory.md`, `docs/references.md`, `docs/deploy-fork.md`, `docs/tech.md`, `docs/design.md`, `docs/requirements.md`, `docs/openspec.md`, ルート `README.md`
- **OpenSpec**: archive `upgrade-home-ui-bass-reflex`, `sync-docs-with-openspec`
- **コード**: 変更なし
