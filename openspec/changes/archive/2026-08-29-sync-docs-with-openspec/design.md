## Context

現状のドキュメント配置:

| 場所 | 内容 | 更新頻度 | 問題 |
|------|------|----------|------|
| `docs/requirements.md` | 機能要件・Phase 進捗 | 低〜中 | OpenSpec change の要件と重複しやすい |
| `docs/design.md` | システムアーキテクチャ・ADR | 低 | change 内 `design.md` と役割が曖昧 |
| `docs/tasks.md` | マイルストーン + 詳細バックログ | 中 | `openspec/changes/*/tasks.md` と二重管理 |
| `openspec/changes/*` | proposal / design / tasks / delta specs | 高（作業中） | archive 後に docs へ反映する手順が未定義 |
| `openspec/specs/` | （空） | — | 振る舞いの正本が未確立 |
| `AGENTS.md` / `README.md` | クイックスタート・Golden Rules | 低 | docs 索引への導線はあるが OpenSpec 未記載 |

動機は proposal.md の Why を参照。

## Goals / Non-Goals

**Goals:**

- 各ドキュメントの「正本（source of truth）」を 1 つに定義し、更新ルールを `docs/openspec.md` に集約
- AI エージェントが change 作業前に読むべきファイル順を明文化
- `openspec/config.yaml` にプロジェクト context を載せ、propose/apply 時のコンテキスト注入を効率化
- `docs/tasks.md` をマイルストーン中心に薄くし、アクティブ作業は OpenSpec に一本化
- 初回 `openspec/specs/` ベースライン確立の手順を文書化（`upgrade-home-ui-bass-reflex` を想定）

**Non-Goals:**

- 既存 change の強制 archive（手順定義のみ）
- CI への `openspec validate` 組み込み（将来タスクとして言及のみ）
- `docs/design.md` の全面書き換え（アーキテクチャ正本は維持、change design との境界だけ明確化）
- 自動同期スクリプトや pre-commit フックの実装

## Decisions

### 1. 三層ドキュメントモデル

**決定**: 次の責務分担を採用する。

```
openspec/specs/     … 振る舞い要件の正本（SHALL/MUST、テスト可能）
openspec/changes/   … 進行中変更の計画（proposal / design / tasks / delta specs）
docs/               … 恒久リファレンス（運用・技術・索引・アーキテクチャ概要）
AGENTS.md           … エージェント向け最短導線（Golden Rules + リンク）
README.md           … 人間向けクイックスタート
```

**理由**: OpenSpec は change ライフサイクルに最適化されており、運用手順やディレクトリ説明を specs に入れると archive 時にノイズになる。逆に振る舞い要件を `docs/requirements.md` だけに置くと、change と乖離する。

**代替案**:
- docs を廃止して OpenSpec のみ → 運用・リンク集の置き場がなくなるため却下
- docs を正本にして OpenSpec を補助 → 現状の二重管理が続くため却下

### 2. ファイル別の正本と同期タイミング

| トピック | 正本（作業中） | 正本（archive 後） | docs 側の扱い |
|----------|----------------|-------------------|---------------|
| 新機能要件 | change `specs/` delta | `openspec/specs/<capability>/` | `requirements.md` は Phase サマリ + リンクのみ |
| 実装設計（変更スコープ） | change `design.md` | spec に吸収されない部分は `docs/design.md` ADR へ追記（必要時） | ADR 番号で参照 |
| 実装タスク | change `tasks.md` | 完了チェックは archive で閉じる | `docs/tasks.md` はマイルストーンのみ |
| 技術スタック・Makefile | `docs/tech.md` | 同左 | change からはリンク参照のみ |
| 既知の問題 | `docs/problems.md` | 同左 | change で解決したら P-xxx を更新 |

### 3. 新規 `docs/openspec.md` をワークフロー正本にする

**決定**: OpenSpec の propose / apply / archive 手順、change と docs の対応、エージェント向けチェックリストを `docs/openspec.md` に集約。`docs/README.md` からリンク。

**理由**: `AGENTS.md` は短く保ち、詳細手順は docs 配下に置く既存パターン（`docs/directory.md` 等）と整合。

### 4. `openspec/config.yaml` に context を追加

**決定**: 以下を `context:` ブロックに記載:
- 二層構成（Docker MPD + Workers）
- Golden Rules 要約（秘密・ポート・music マウント）
- 検証コマンド（`make test`, `cd workers && bun run build`）
- ドキュメント索引（`docs/README.md`, `docs/openspec.md`）

**理由**: propose 時に毎回 AGENTS.md を手動参照しなくてよい。OpenSpec 公式の推奨パターン。

### 5. `docs/tasks.md` のスリム化方針

**決定**:
- **残す**: Phase マイルストーン表、長期バックログ（インフラ・将来機能）
- **削除/移行**: change と重複する「現在のフォーカス」の細かいチェックリスト → `openspec list` へ
- **追加**: 「アクティブ change の確認: `openspec list`」セクション

## Risks / Trade-offs

- **[Risk] archive 忘れで specs が空のまま** → `docs/openspec.md` に archive チェックリストを明記；change 完了時に AGENTS.md からリマインド
- **[Risk] docs/requirements.md と specs の一時的不整合** → requirements はサマリに限定し「詳細は openspec/specs」を明記
- **[Risk] 過度なドキュメント分割で発見性低下** → `docs/README.md` の読む順表を更新して一本化
- **[Trade-off] 自動同期なし** → 手順の軽さを優先；将来 CI validate で検知可能

## Migration Plan

1. `docs/openspec.md` 新設、`docs/README.md` / `AGENTS.md` 更新
2. `openspec/config.yaml` に context 追加
3. `docs/tasks.md` / `docs/requirements.md` をスリム化（リンク・方針追記）
4. `upgrade-home-ui-bass-reflex` 実装完了後、別セッションで `openspec archive` → 初回 `openspec/specs/listener-home-ui/` 生成
5. archive 後、`docs/requirements.md` の Phase 3 進捗と `docs/problems.md` を必要に応じて更新

ロールバック: ドキュメントのみの変更のため git revert で十分。

## Open Questions

- `openspec validate` を GitHub Actions に入れるか（本 change では defer）
- `docs/design.md` の ADR 番号体系を OpenSpec change 名と揃えるか（任意）
