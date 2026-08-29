## Why

`consolidate-docs`（2026-08-29 archive 済み）以降、Home UI は **BassReflexSpeaker（左右）から GlobeSpeaker（中央 cobe 地球儀）** へ移行し、preview E2E は **SSR Inertia シェル検証 + opencli ハイドレーション後検証** に分離された。一方 `docs/`・`openspec/specs/listener-home-ui/`・`diagrams.md` は依然 **バスレフ / 3 カラム / 旧 E2E 前提** を参照しており、実装・テスト・仕様の正本が乖離している。フォーク向け deploy・workers.dev E2E を含む docs 再確認と、完了 change の archive を一括で行う。

## What Changes

- **`openspec/specs/listener-home-ui/` の delta**: スピーカー要件を GlobeSpeaker（中央・cobe）に更新。3 カラム左右スピーカー要件を削除
- **`docs/requirements.md`**: Phase 3 完了表の「バスレフ UI」→ GlobeSpeaker。E2E preview ティアの検証内容を追記
- **`docs/openspec.md`**: specs 表の説明を GlobeSpeaker に同期。post-archive チェックリストの未完了項目を明記
- **`docs/diagrams.md`**: Home UI レイアウト図（GlobeSpeaker 中央）と E2E preview フロー（Inertia shell → opencli）を追加または更新
- **`docs/test.md`**: preview URL 例を `radio.*.workers.dev`（既定 deploy）と `radio-preview.*`（`deploy:preview`）の両方に整理（既に一部更新済み — 全体整合を確認）
- **`docs/directory.md`**: `workers/app/components/GlobeSpeaker.tsx`、`workers/test/` fixture 契約、`scripts/e2e/lib/contract.sh` を反映
- **`docs/design.md`**: Home UI モジュール説明を GlobeSpeaker に更新（図は diagrams.md へリンク）
- **`docs/README.md`**: 索引の鮮度確認。重複説明があれば diagrams.md / test.md へ委譲
- **未使用アセット整理（任意・小）**: `BassReflexSpeaker.tsx` と `bass-reflex-*` CSS が Home から参照されなくなった旨を design/tasks に記載。削除は apply 時に判断
- **OpenSpec archive**: 本 change 完了後 `openspec archive refresh-docs-globe-e2e` で specs を昇格

## Capabilities

### New Capabilities

（なし）

### Modified Capabilities

- `listener-home-ui`: スピーカー可視化を bass-reflex 左右配置から **GlobeSpeaker（中央・インタラクティブ地球儀）** に変更。レイアウト要件（3 カラム左右スピーカー）を中央 Globe + boombox シェルに更新。リスナー数・再生・メタデータ要件は維持

## Impact

- **ドキュメント**: `docs/README.md`, `docs/requirements.md`, `docs/design.md`, `docs/directory.md`, `docs/diagrams.md`, `docs/openspec.md`, `docs/test.md`（整合確認）
- **OpenSpec**: `openspec/changes/refresh-docs-globe-e2e/` → archive 後 `openspec/specs/listener-home-ui/spec.md` 更新
- **コード**: 原則ドキュメントのみ。任意で `BassReflexSpeaker.tsx` / 未使用 CSS の削除（apply フェーズ）
- **E2E**: 変更なし（preview ティア修正は既に適用済み — docs が追従するのみ）
