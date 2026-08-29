## Why

`docs/`（要件・設計・タスク）と OpenSpec（`openspec/changes/`）が並行して存在し、同じ内容が二重管理されている。`openspec/specs/` は未整備のため、変更の意図が change ディレクトリに閉じ、恒久ドキュメントとの境界が曖昧で、AI エージェントと人間の双方が「どこを正とするか」を毎回判断している。ドキュメント整理と OpenSpec の役割分担を明文化し、変更完了時の同期手順を標準化することで、更新コストとドリフトを減らす。

## What Changes

- **ドキュメント階層の再定義**: 恒久リファレンス（`docs/`）と変更スコープ計画（`openspec/changes/`）と振る舞い仕様（`openspec/specs/`）の責務を文書化
- **`docs/README.md` の拡張**: OpenSpec ワークフロー節を追加し、読む順・更新ルール・archive 後の同期先を一覧化
- **`docs/openspec.md` 新設**: propose / apply / archive の手順、change と docs の対応表、エージェント向けチェックリスト
- **`docs/tasks.md` のスリム化**: マイルストーンと長期バックログのみ残し、アクティブ作業は `openspec list` へ委譲（重複タスク一覧を削除）
- **`docs/requirements.md` の整理**: Phase 進捗サマリと `openspec/specs/` へのリンク方針を明記；詳細要件は change / spec へ移す方針を記載
- **`openspec/config.yaml` の充実**: プロジェクト context（スタック、Golden Rules 要約、検証コマンド）を AI 向けに追加
- **`AGENTS.md` の更新**: ドキュメント更新時は `docs/openspec.md` と change 状態を確認するルールを追加
- **初回 spec ベースライン**: 進行中 change `upgrade-home-ui-bass-reflex` を archive 可能な状態にした後、`openspec/specs/` へ昇格する手順を tasks に含める（本 change では手順定義まで；archive 自体は別タイミング可）

## Capabilities

### New Capabilities

（なし — 本 change はドキュメント・ワークフロー整備のみ。`skip_specs: true`）

### Modified Capabilities

（なし）

## Impact

- **ドキュメント**: `docs/README.md`, `docs/tasks.md`, `docs/requirements.md`, 新規 `docs/openspec.md`, `AGENTS.md`
- **OpenSpec**: `openspec/config.yaml`；既存 change `upgrade-home-ui-bass-reflex` の archive 手順への言及
- **コード**: 変更なし（ドキュメントと OpenSpec 設定のみ）
- **CI**: 任意で `openspec validate` を将来追加可能（本 change では必須にしない）
