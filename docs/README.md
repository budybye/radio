# ドキュメント索引

radio は **Docker（MPD + mpc-bridge + Tunnel）** と **Cloudflare Workers（Web UI + MpdAgent DO）** の二層構成。まず読む順は目的別。

## 読む順（目的別）

| 目的 | 順番 |
|------|------|
| 初めて触る | [README.md](../README.md) → [AGENTS.md](../AGENTS.md) → [tech.md](tech.md) |
| **フォークして Workers だけデプロイ** | [deploy-fork.md](deploy-fork.md) → [workers/README.md](../workers/README.md) |
| 仕様・要件 | [requirements.md](requirements.md) → [design.md](design.md) |
| 変更計画・実装 | [openspec.md](openspec.md) → `openspec list` → 対象 change の `tasks.md` |
| Workers 開発 | [workers/README.md](../workers/README.md) → [tech.md#workers-mpdagent-do--hono](tech.md) |
| コードパターン | [patterns/README.md](patterns/README.md) → [patterns/better-result.md](patterns/better-result.md) |
| 運用・障害 | [problems.md](problems.md) → [test.md](test.md) |
| マイルストーン | [tasks.md](tasks.md) |
| **図解（アーキテクチャ・認証・デプロイ）** | [diagrams.md](diagrams.md) |

## ドキュメント一覧

| ファイル | 内容 |
|----------|------|
| [diagrams.md](diagrams.md) | **図解** — システム・認証・デプロイ・テスト・docs 階層（Mermaid） |
| [requirements.md](requirements.md) | 機能 / 非機能要件、Phase 3 進捗、用語集 |
| [deploy-fork.md](deploy-fork.md) | Deploy to Cloudflare（フォーク向け手順） |
| [design.md](design.md) | モジュール責務、ADR、API 一覧（図は diagrams.md） |
| [openspec.md](openspec.md) | OpenSpec ワークフロー、三層モデル、archive 手順 |
| [patterns/README.md](patterns/README.md) | 再利用可能なコードパターン索引 |
| [tech.md](tech.md) | スタック、Makefile、compose、Workers ルート・secrets |
| [directory.md](directory.md) | リポジトリツリーと命名規約 |
| [tasks.md](tasks.md) | マイルストーン・バックログ |
| [test.md](test.md) | テスト方針（Docker + Workers + E2E ティア） |
| [problems.md](problems.md) | 既知の問題・リスク |
| [references.md](references.md) | 外部リンク・内部索引 |
| [workers/README.md](../workers/README.md) | Workers 専用（ディレクトリ・ルート・開発コマンド） |

## システム概要

アーキテクチャ図・認証マトリクス・デプロイフローは **[diagrams.md](diagrams.md)** を参照。

**制御の原則**: ブラウザは MPD TCP に直接触れない。ポーリングとライブ push は **MpdAgent DO 1 本**。キュー CRUD は Workers → mpc-bridge → MPD。

**現在曲**: SSR は `fetchCurrentSong`（DO RPC + 短 TTL キャッシュ）→ クライアントは `useMpdAgentWatch` が DO state を `use-radio-player` の React state に反映。

## graphify

構造探索は `graphify-out/GRAPH_REPORT.md`（コミット `6cdb419` 時点）。**未コミットの Workers 変更後は `graphify update .` を推奨。**
