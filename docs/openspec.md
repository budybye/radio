# OpenSpec ワークフロー

radio では **振る舞い仕様・変更計画・恒久ドキュメント** を三層に分け、二重管理を避ける。

## 三層モデル

図解: [diagrams.md#docs-layers](diagrams.md#docs-layers)

| トピック | 作業中の正本 | archive 後の正本 | docs 側 |
|----------|--------------|------------------|---------|
| 新機能要件 | `openspec/changes/<name>/specs/` | `openspec/specs/<capability>/` | `requirements.md` は Phase サマリ + リンク |
| 変更スコープ設計 | `changes/<name>/design.md` | ADR へ追記（必要時） | `design.md` はシステム全体 |
| 実装タスク | `changes/<name>/tasks.md` | archive で閉じる | `tasks.md` はマイルストーンのみ |
| コードパターン | change design / `docs/patterns/` | `docs/patterns/` | テンプレートとして維持 |

## コマンド

```bash
openspec list                              # アクティブ change 一覧
openspec status --change <name>            # 成果物の進捗
openspec validate --change <name>          # 変更の整合性チェック
openspec archive <name>                    # 完了 change を specs/ へ昇格
```

## ライフサイクル

### 1. Propose（計画）

```bash
openspec new change "<kebab-name>"
# proposal.md → design.md → tasks.md（+ specs delta）を作成
openspec validate --change "<kebab-name>"
```

- 振る舞い変更あり → delta specs を書く
- ドキュメント整備のみ → `.openspec.yaml` に `skip_specs: true`

### 2. Apply（実装）

1. `openspec/changes/<name>/tasks.md` のチェックリストに従う
2. コード変更は change の design に沿う
3. 検証: `make test`, `cd workers && bun run build`, 関連ユニットテスト

### 3. Archive（完了）

1. `openspec validate --change <name>` が PASS
2. 実装タスクがすべて完了
3. `openspec archive <name>`
4. 下記 **post-archive チェックリスト** を実行

## post-archive チェックリスト

- [x] `docs/requirements.md` の Phase 進捗を更新
- [ ] 解決した問題があれば `docs/problems.md` を更新
- [ ] マイルストーンが変われば `docs/tasks.md` を更新
- [ ] Workers 構造を大きく変えたら `graphify update .`

## 振る舞い仕様（ベースライン）

| capability | パス | 内容 |
|------------|------|------|
| listener-home-ui | [`openspec/specs/listener-home-ui/spec.md`](../openspec/specs/listener-home-ui/spec.md) | Home UI（バスレフ・listeners・ライブ更新） |

完了した change は `openspec/changes/archive/` に移動される（例: `2026-08-29-upgrade-home-ui-bass-reflex/`）。

## エージェント向けチェックリスト

作業開始前:

1. `openspec list` でアクティブ change を確認
2. 対象 change の `proposal.md` / `design.md` / `tasks.md` を読む
3. コードパターンが必要なら [`docs/patterns/README.md`](patterns/README.md) を参照
4. Golden Rules は [`AGENTS.md`](../AGENTS.md)

ドキュメント更新時:

- 振る舞い要件 → change specs または `openspec/specs/`
- 運用・手順 → `docs/`
- アクティブタスク → change `tasks.md`（`docs/tasks.md` に重複書きしない）
