# 要件定義

> 本書はプロジェクトの機能要件・受け入れ範囲・バックログの正本。Home の表示・操作・アクセシビリティの詳細は [DESIGN.md](../DESIGN.md)、構造とデータフローは [architecture.md](architecture.md) を参照。

## プロジェクト概要

Docker + MPD（Music Player Daemon）+ Cloudflare Tunnel + Cloudflare Workers を組み合わせ、個人所有の音楽ファイルを不特定多数のリスナーに向けてインターネットラジオとして配信するシステムです。開発中で、複数ユーザーの同時接続と管理機能の拡張はバックログにあります。

**公開ホスト（本番）**

| ホスト | 役割 |
|--------|------|
| `your-domain.com` | Web UI（Workers）— リスナー画面 + 管理 UI |
| `mpd.your-domain.com` | MP3 ストリーム（Tunnel → MPD HTTPD） |
| `mpc.your-domain.com` | mpc-bridge（MPD 制御 HTTP）— Access Service Token のみ |

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
| リスナー画面 | `GET /`（Home） | SSR + Agents SDK state push、選択局の放送拠点と実音声に連動する GlobeSpeaker（cobe）、レスポンシブなプレイヤーカード |
| リスナー数表示 | Home のプレイヤーカード | MPD 局のみ `listeners` をライブ更新 |
| 現在曲ライブ更新 | Agents SDK `useAgent` | Cap'n Web watch は廃止 |
| キュー一覧・詳細 | `GET /queue*` | Basic 認証 |
| キュー追加・更新・削除 | `POST/PATCH/DELETE /queue*` | Basic or Bearer |
| JSON キュー API | `GET/POST/PATCH/DELETE /api/queue*` | Basic or Bearer |
| OpenAPI 仕様 | `GET /openapi.json` | ローカル dev / `*.workers.dev` のみ公開 |
| MPD エラー処理 | better-result `Result` | 境界で `tryPromise`、HTTP で `match` |
| 入力バリデーション | Valibot（`workers/app/schemas/mpd.ts`, `workers/app/schemas/queue.ts`） | Hono `sValidator` |
| 診断 API | `/status`, `/currentsong`, `/mpd/ping` | Basic（ops 用） |
| Workers CI | `.github/workflows/workers-ci.yaml` | unit → lint → build |
| E2E ティア | `scripts/e2e/` + `make test-e2e-*` | workers / prod（デプロイ済み環境） |
| フォーク Deploy | Deploy to Cloudflare ボタン | [maintenance.md](maintenance.md) |

### 未完了 / バックログ

- [ ] 管理 UI からの MPD status 表示（`/status` は API のみ）
- [ ] 管理画面全体への Cloudflare Access（現状は Basic/Bearer のみ）

## 非機能要件

### パフォーマンス

- ストリーム遅延: クライアントバッファ依存（目標 5 秒以内）
- 同時接続: 現状 max_clients = 20
- 現在曲更新: MpdAgent DO が再生中または watch 中に MPD をポーリングし、変化時のみ state を WebSocket push

### セキュリティ

- MPD / mpc-bridge の公開エンドポイントは Cloudflare Tunnel 経由（Workers は Cloudflare 上の公開エンドポイント）
- MPD 制御 TCP（6600）はコンテナ内部ネットワークのみ。外部からの制御は mpc-bridge HTTP 経由
- **`mpc.*` は Cloudflare Access で保護**（Service Token のみ Allow、それ以外 Block）
- Workers → mpc-bridge は `CF-Access-Client-Id/Secret` ヘッダ必須
- 管理 UI: `GET /queue*` は Basic、`POST/PATCH/DELETE /queue*` は Basic or Bearer
- JSON API: `GET/POST/PATCH/DELETE /api/queue*` は Basic or Bearer
- 診断 API: `/status`, `/currentsong`, `/mpd/ping` は Basic（ops 用）
- リスナー向け `/`, `/agents/*` は認証なし（公開ラジオ前提）
- 機密情報（`TUNNEL_TOKEN`, `USERNAME`, `PASSWORD`, `TOKEN`, Access secrets）は Wrangler secrets / `.env` 管理、ソースコードに含めない

### 可用性

- Docker Compose の `restart: unless-stopped` で自動復旧
- 音楽ファイルは `music/` のホストディレクトリをボリュームマウントして永続化（既定の compose では read-only 指定なし）
- MPD DB・ステートは named volume（mpd-data）で永続化
- Web UI は Workers 上で稼働（compose には含めない）。`bun run deploy` で更新

## 制約

- **ランタイム**: Alpine Linux 3.20 上の MPD（パッケージ版）— カスタムビルド不可
- **ミキサー**: コンテナ内にハードウェアミキサーが存在しないため `mixer_type none`、サーバ側音量調整不可
- **エンコーダー**: Alpine `mpd` パッケージ同梱の `lame` のみ使用可能
- **リバースプロキシ**: Cloudflare Tunnel のみ（自前 nginx/traefik 等は不要）
- **Web UI**: Cloudflare Workers + Durable Objects（MpdAgent）。ローカル開発は Vite+（`bun run dev`）

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
| [architecture.md](architecture.md) | モジュール責務・データモデル・データフロー |
| [DESIGN.md](../DESIGN.md) | Home UI の表示・操作・受け入れ条件 |
| [security.md](security.md) | 認証・権限・境界 |
| [tech.md](tech.md) | スタック・ADR |
| [maintenance.md](maintenance.md) | デプロイ・環境変数・運用 |
| [workers/README.md](../workers/README.md) | Workers 開発者向け手順 |
