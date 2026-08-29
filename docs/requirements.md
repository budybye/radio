# 要件定義

> **詳細な振る舞い要件**は `openspec/specs/`（archive 後）または進行中 change の `openspec/changes/<name>/specs/` を正本とする。本書はプロジェクト概要・Phase サマリ・用語集。

## プロジェクト概要

Docker + MPD（Music Player Daemon）+ Cloudflare Tunnel + Cloudflare Workers を組み合わせ、個人所有の音楽ファイルを不特定多数のリスナーに向けてインターネットラジオとして配信するシステム。開発中のプロジェクトで、将来的には複数ユーザーの同時接続や管理機能の拡張を見据えている。

**公開ホスト（本番）**

| ホスト | 役割 |
|--------|------|
| `044g.com` | Web UI（Workers）— リスナー画面 + 管理 UI |
| `mpd.044g.com` | MP3 ストリーム（Tunnel → MPD HTTPD） |
| `mpc.044g.com` | mpc-bridge（MPD 制御 HTTP）— Access Service Token のみ |

## 機能要件

### Must Have

- [x] **音楽ストリーミング配信**: MPD の HTTP 出力で MP3（320kbps）ストリームを提供
- [x] **インターネット公開**: Cloudflare Tunnel を利用した安全な外部公開
- [x] **プレイリスト管理**: mpc / ncmpcpp を使ったキュー・プレイリスト操作
- [x] **自動ライブラリ更新**: `auto_update yes` による music/ ディレクトリの自動監視
- [x] **常時配信**: `always_on yes` で停止中もリスナー接続を維持
- [x] **mpc 制御面の保護**: `mpc.*` を Cloudflare Access（Service Auth + Block）で保護し、Workers のみ到達可能

### Should Have

- [ ] **複数ユーザー（リスナー）対応**: 同時接続リスナー数を現在の上限から拡張し、接続管理機能を追加
- [x] **管理 UI（Web ベース）**: `workers/` の Cloudflare Workers + Inertia SPA でキュー CRUD・現在曲表示（Phase 3 一部完了）
- [x] **リスナー数モニタリング**: Home 画面に MPD `listeners` を表示（SSR + MpdAgent state push）。管理 UI 全体の統計ダッシュボードは未着手
- [ ] **エンコード品質切り替え**: ビットレート・フォーマットの動的変更（128kbps / 320kbps 等）

### Could Have

- [ ] **自動プレイリスト生成**: メタデータに基づくシャッフル・スマートプレイリスト
- [ ] **リスナー統計**: 接続数・視聴時間のログ収集
- [ ] **IRC / WebSocket 連携**: 現在再生中の曲情報を外部チャット等に連携

## Phase 3: 管理 UI（ほぼ完了）

### 完了済み

| 機能 | 実装 | 備考 |
|------|------|------|
| リスナー画面 | `GET /`（Home） | SSR + Agents SDK state push、中央 GlobeSpeaker（cobe） |
| リスナー数表示 | Home ヘッダー | MPD `listeners`、ライブ更新 |
| 現在曲ライブ更新 | Agents SDK `useAgent` | Cap'n Web watch は廃止 |
| キュー一覧・詳細 | `GET /posts*` | Basic 認証 |
| キュー追加・更新・削除 | `POST/PATCH/DELETE /posts*` | Basic or Bearer |
| MPD エラー処理 | better-result `Result` | 境界で `tryPromise`、HTTP で `match` |
| 入力バリデーション | Valibot（`schemas/mpd.ts`, `schemas/posts.ts`） | Hono `sValidator` |
| 診断 API | `/status`, `/currentsong`, `/mpd/ping` | Basic（ops 用） |
| Workers CI | `.github/workflows/workers-ci.yaml` | unit → lint → build → mpd-stub |
| E2E ティア | `scripts/e2e/` + `make test-e2e-*` | local / preview / prod |
| フォーク Deploy | Deploy to Cloudflare ボタン | [deploy-fork.md](deploy-fork.md) |

### 未完了 / バックログ

- [ ] 管理 UI からの MPD status 表示（`/status` は API のみ）
- [ ] 管理画面全体への Cloudflare Access（現状は Basic/Bearer のみ）

## 非機能要件

### パフォーマンス

- ストリーム遅延: クライアントバッファ依存（目標 5 秒以内）
- 同時接続: 現状 max_clients = 10〜20、将来的なスケールを見据えた設計
- 現在曲更新: MpdAgent DO が MPD をポーリングし、変更時のみ WebSocket push

### セキュリティ

- 公開エンドポイントは Cloudflare Tunnel 経由のみ（直接ポート公開なし）
- MPD 制御 TCP（6600）はコンテナ内部のみ。外部からの制御は mpc-bridge HTTP 経由
- **`mpc.*` は Cloudflare Access で保護**（Service Token のみ Allow、それ以外 Block）
- Workers → mpc-bridge は `CF-Access-Client-Id/Secret` ヘッダ必須
- 管理 UI: `GET /posts*` は Basic、`POST/PATCH/DELETE` は Basic or Bearer
- 診断 API: `/status`, `/currentsong`, `/mpd/ping` は Basic（ops 用）
- リスナー向け `/`, `/agents/*` は認証なし（公開ラジオ前提）
- 機密情報（`TUNNEL_TOKEN`, `USERNAME`, `PASSWORD`, `TOKEN`, Access secrets）は Wrangler secrets / `.env` 管理、ソースコードに含めない

### 可用性

- Docker Compose の `restart: unless-stopped` で自動復旧
- 音楽ファイルはボリュームマウントで永続化（music/ は read-only）
- MPD DB・ステートは named volume（mpd-data）で永続化
- Web UI は Workers 上で稼働（compose には含めない）。`bun run deploy` で更新

## 制約

- **ランタイム**: Alpine Linux 3.20 上の MPD（パッケージ版）— カスタムビルド不可
- **ミキサー**: コンテナ内にハードウェアミキサーが存在しないため `mixer_type none`、サーバ側音量調整不可
- **エンコーダー**: Alpine `mpd` パッケージ同梱の `lame` のみ使用可能
- **リバースプロキシ**: Cloudflare Tunnel のみ（自前 nginx/traefik 等は不要）
- **Web UI**: Cloudflare Workers + Durable Objects（MpdAgent）。ローカル開発は Miniflare（`bun run dev`）

## 用語集

| 用語 | 定義 |
|------|------|
| MPD | Music Player Daemon — ヘッドレス音楽再生サーバー |
| MPC | Music Player Client — MPD のコマンドラインクライアント |
| ncmpcpp | NCurses Music Player Client (C++) — TUI ベースの高機能 MPD クライアント |
| Cloudflare Tunnel | ローカルサービスを安全にインターネット公開するツール（cloudflared） |
| HTTPD 出力 | MPD の `audio_output type "httpd"` — HTTP ストリーミング出力 |
| mpc-bridge | Go 製 HTTP→MPD TCP ブリッジ（`/mpd.cgi?cmd=`） |
| MpdAgent | Cloudflare Durable Object — MPD ポーリング・状態保持・ライブ push |
| Workers | Cloudflare Workers 上の Hono + Inertia SPA（`workers/`） |
| Cloudflare Access | Zero Trust によるアプリケーション保護（mpc 制御面で使用） |
| Service Token | Access の機械認証用トークン（Workers → mpc fetch） |

## 関連ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| [diagrams.md](diagrams.md) | 図解（アーキテクチャ・認証・デプロイ） |
| [design.md](design.md) | モジュール責務・ADR・エンドポイント一覧 |
| [tech.md](tech.md) | スタック・secrets・Workers 詳細 |
| [tasks.md](tasks.md) | マイルストーン・バックログ |
| [README.md](README.md) | ドキュメント索引・読む順 |
| [workers/README.md](../workers/README.md) | Workers 開発者向け手順 |
