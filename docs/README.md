# ドキュメント索引

radio は **Docker（MPD + mpc-bridge + Tunnel）** と **Cloudflare Workers（Web UI + MpdAgent DO）** の二層構成。まず読む順は目的別。

## 読む順（目的別）

| 目的 | 順番 |
|------|------|
| 初めて触る | [README.md](../README.md) → [AGENTS.md](../AGENTS.md) → [tech.md](tech.md) |
| 仕様・要件 | [requirements.md](requirements.md) → [design.md](design.md) |
| Workers 開発 | [workers/README.md](../workers/README.md) → [tech.md#workers-mpdagent-do--hono](tech.md) |
| 運用・障害 | [problems.md](problems.md) → [test.md](test.md) |
| タスク把握 | [tasks.md](tasks.md) |

## ドキュメント一覧

| ファイル | 内容 |
|----------|------|
| [requirements.md](requirements.md) | 機能 / 非機能要件、Phase 3 進捗、用語集 |
| [design.md](design.md) | アーキテクチャ図、モジュール責務、ADR、API 一覧 |
| [tech.md](tech.md) | スタック、Makefile、compose、Workers ルート・secrets |
| [directory.md](directory.md) | リポジトリツリーと命名規約 |
| [tasks.md](tasks.md) | マイルストーン・バックログ |
| [test.md](test.md) | テスト方針（Docker + Workers） |
| [problems.md](problems.md) | 既知の問題・リスク |
| [references.md](references.md) | 外部リンク |
| [workers/README.md](../workers/README.md) | Workers 専用（ディレクトリ・ルート・開発コマンド） |

## システム概要（1 枚）

```
リスナー / 管理 UI
    │
    ▼ HTTPS
044g.com (Workers: Hono + Inertia + MpdAgent DO)
    │ fetch + CF-Access-Client-* 
    ▼ Tunnel
mpc.044g.com (mpc-bridge → MPD :6600)     mpd.044g.com (MPD HTTPD :8000 MP3)
    │                                          │
    └──────────────────┬───────────────────────┘
                       ▼
              radio-mpd コンテナ (music/, mpd.conf)
```

**制御の原則**: ブラウザは MPD TCP に直接触れない。ポーリングとライブ push は **MpdAgent DO 1 本**。キュー CRUD は Workers → mpc-bridge → MPD。

**現在曲**: SSR は `fetchCurrentSong`（DO RPC + 短 TTL キャッシュ）→ クライアントは `useMpdAgentWatch` が DO `watchCurrentSong` で **SWR キャッシュ**（`use-current-song.ts`）を更新。Cap'n Web RPC は廃止。

## コードマップ（Workers 主要）

| 領域 | パス |
|------|------|
| DO ポーリング | `workers/worker/mpd-agent.ts` |
| HTTP ルート組立 | `workers/app/server/index.tsx`, `middleware.ts` |
| 管理 UI API | `workers/app/server/posts-routes.ts`, `mpd/playlist.ts` |
| MPD HTTP 診断 | `workers/app/server/mpd/routes.ts`, `ping.ts`, `status.ts` |
| クライアント | `workers/app/lib/radio/use-mpd-agent.ts`, `use-current-song.ts`, `use-radio-player.ts` |

## graphify

構造探索は `graphify-out/GRAPH_REPORT.md`（コミット `6cdb419` 時点）。**未コミットの Workers 変更後は `graphify update .` を推奨。**
