# 技術仕様

## 技術スタック

| カテゴリ | 技術 | バージョン | 備考 / 標準 |
|----------|------|-----------|-------------|
| コンテナランタイム | Docker Engine | リポジトリで固定なし | コンテナのビルド・実行・ネットワーク管理 |
| オーケストレーション | Docker Compose | リポジトリで固定なし | マルチコンテナ構成の定義と起動 |
| ベースOS | Alpine Linux | 3.20 | 軽量イメージ（musl libc ベース） |
| 音楽サーバー | MPD (Music Player Daemon) | リポジトリで固定なし | HTTPD 出力によるストリーミング配信 |
| エンコーダー | LAME | リポジトリで固定なし | MP3 エンコード（320kbps / 44100Hz） |
| 公開基盤 | Cloudflare Tunnel (cloudflared) | `latest`（イメージタグ） | ゼロトラスト公開（ポート開放不要） |
| クライアント | mpc / ncmpcpp | リポジトリで固定なし | MPD のコマンドライン・TUI クライアント |
| Web UI | Cloudflare Workers + Hono + Inertia + React + Agents SDK | `workers/package.json` 参照 | SSR と Inertia SPA、MpdAgent Durable Object |

### 採用する Web 標準・プロトコル

- **ストリーミング**: HTTP/1.1（MPD HTTPD 出力 — ICY 互換の MP3 ストリーム）
- **制御プロトコル**: MPD Protocol（TCP 6600、テキストベースコマンド）
- **文字コード**: UTF-8（MPD タグ、ファイル名）
- **暗号化**: TLS（Cloudflare Tunnel 終端 — リスナー→Tunnel 間）

## 開発環境

### 必要ツール

| ツール | 最低バージョン | 用途 |
|--------|---------------|------|
| Docker Engine | リポジトリで固定なし | コンテナビルド・実行 |
| Docker Compose | リポジトリで固定なし | `compose.yaml` の解釈 |
| ターミナル（ターミナルエミュレータ） | — | `mpc` / `ncmpcpp` 操作 |

### セットアップ手順

```bash
# 1. リポジトリをクローン
git clone <repo-url>
cd radio

# 2a. Docker で起動（推奨）
make setup             # .env + workers/.env + music/ 作成
make up-build          # 初回: ビルド + 起動
make up                # 2回目以降: 起動のみ（高速）
```

Make target の一覧と説明は `make help` を参照。

### 環境変数

| 変数名 | 必須 | 説明 | 取得方法 |
|--------|------|------|----------|
| `TUNNEL_TOKEN` | tunnel プロファイル使用時 | Cloudflare Tunnel の認証トークン | Cloudflare Zero Trust ダッシュボードで作成した Tunnel のトークン |

> `.env.example` を `.env` にコピーして値を設定してください。
> `.env` は `.gitignore` に登録済み — 決してコミットしないこと。

## インフラ構成

### デプロイターゲット

- **開発**: ローカル Docker ホスト（Linux / macOS / Windows WSL2）— `make up` / `make up-tunnel`
- **本番（メンテナ）**: **Raspberry Pi 上の Docker Compose** — `mpd`・`mpc-bridge`・`tunnel`（`--profile tunnel`）が常時稼働。Workers は Cloudflare 上の `radio` のみデプロイし、Pi スタックは通常触らない
- **公開経路**: Cloudflare Tunnel（cloudflared コンテナ）→ `mpd.*`（ストリーム）・`mpc.*`（bridge、Access 保護）

- 詳細: [maintenance.md#deploy-targets](maintenance.md#deploy-targets)

### 監視・ログ

```bash
# MPD コンテナのログ（stdout）
docker compose logs -f mpd

# Tunnel コンテナのログ
docker compose logs -f tunnel
```

## 外部サービス連携

| サービス | 用途 | 接続方法 | 標準 |
|----------|------|----------|------|
| Cloudflare Tunnel | インターネット公開 | cloudflared コンテナ → Cloudflare エッジネットワーク | TLS 1.3, HTTP/2 |

## 重要設定ファイル

設定の正本:

- [`compose.yaml`](../compose.yaml): MPD、mpc-bridge、Tunnel の起動・接続・ボリューム定義
- [`Dockerfile`](../Dockerfile): Alpine ベースの MPD 実行イメージ
- [`config/mpd.conf`](../config/mpd.conf): MPD の再生・HTTPD 出力設定
- [`scripts/entrypoint.sh`](../scripts/entrypoint.sh): 起動時の自動キュー投入・再生

設定ファイルのコピーを本書へ埋め込まない。変更時のドリフトを防ぐ。

### `config/config`（ncmpcpp 設定）

```
ncmpcpp_directory = /root/.ncmpcpp
mpd_host = localhost
mpd_port = 6600
mpd_music_dir = /music
```

**設定のポイント**:
- `ncmpcpp_directory` → `/root/.ncmpcpp`（コンテナ内のホームディレクトリ）
- `mouse_support = yes` → マウス操作有効（ターミナルエミュレータ依存）

### `mpd.conf`

主要項目とその理由:

| 設定 | 値 | 理由 |
|------|-----|------|
| `zeroconf_enabled "no"` | 無効 | コンテナ内に avahi-daemon がないため。無効化しないと起動時にエラーログが出る |
| `max_connections "100"` | 100接続 | MPD プロトコル接続上限を明示 |
| `connection_timeout "60"` | 60秒 | アイドル接続の自動切断。リソース解放 |
| `auto_update_depth "0"` | 無制限 | `music/` 配下のサブディレクトリを深くまで自動走査 |
| `filesystem_charset "UTF-8"` | UTF-8 | 日本語ファイル名の文字化け防止 |
| `replaygain "auto"` | 自動 | 音量差のある曲を自動正規化（クライアント側調整の負担軽減） |
| `always_on yes` | 有効 | 停止時もリスナー接続を維持（ラジオ配信必須） |
| `tags yes` | 有効 | 曲メタデータをストリームに含め、クライアントにタイトルを表示 |
| `mixer_type none` | 無効 | コンテナ内にハードウェアミキサーがないため |
| `auto_update yes` | 有効 | music/ へのファイル追加を自動検出 |
| `encoder lame` / `bitrate 320` | MP3 320kbps | 音質と帯域のバランス |
| `format 44100:16:2` | CD 品質 | 互換性のある標準サンプリングレート |
| `max_clients 20` | 20 接続 | MPD HTTPD 出力の同時接続上限 |

## アーキテクチャ決定記録（ADR）

### ADR-001: MPD をストリーミングサーバーとして採用

- **ステータス**: 承認済み
- **状況**: 個人所有音楽をインターネットラジオとして配信する手段を選定する必要がある
- **決定**: Music Player Daemon（MPD）を採用し、その HTTPD 出力機能を使う
- **理由**:
  - 軽量・ヘッドレス運用が可能（GUI 不要）
  - HTTP ストリーミング出力が標準機能（追加ソフト不要）
  - `always_on` オプションでラジオ配信に必要な常時接続を実現
  - Alpine 公式パッケージで入手可能（ビルド不要）
  - mpc / ncmpcpp など既存のクライアントを利用できる
- **結果**: 最小限のリソースでラジオ配信が可能。ただし MPD の HTTPD 出力は同期的で、リスナー数が増えるとスケールしにくい構造的制約あり

### ADR-002: Cloudflare Tunnel を公開手段として採用

- **ステータス**: 承認済み
- **状況**: 自宅等のプライベートネットワークからインターネットへの公開方法を選定
- **決定**: Cloudflare Tunnel（cloudflared）を採用し、独自ドメイン・ポート開放なしで公開
- **理由**:
  - ポート開放不要（セキュリティリスク低減）
  - Cloudflare の CDN・DDoS 保護が自動付与
  - 無料プランで利用可能
  - Docker イメージ（`cloudflare/cloudflared:latest`）が公式提供されている
- **結果**: 無料プランで公開でき、ポート開放も不要。ただし Cloudflare のネットワーク経由のため、レイテンシは地理的に依存

### ADR-003: 単一 MPD コンテナ構成（現状）

- **ステータス**: 承認済み（将来再検討）
- **状況**: 複数リスナー対応のためのアーキテクチャ選定
- **決定**: 現時点では単一 MPD コンテナで運用。複数ユーザー対応は将来的にアーキテクチャ変更で対応
- **理由**:
  - MPD の HTTPD 出力は max_clients で同時接続を制限（現状 20）
  - リスナー数増加には Icecast 等のリレーサーバー導入が一般的解決策
  - 現段階では「動作確認・個人用途」が主目的のため、過度な構成は避ける
- **結果**: シンプルな運用で開発を進められる。将来的にリスナー増加・統計収集等が必要になった場合、Icecast リレーまたは MPD 前段にリバースプロキシを検討

### ADR-004: mpc サブドメインを Cloudflare Access で保護

- **ステータス**: 承認済み
- **状況**: `mpc.*` を Tunnel で HTTP 公開すると、認証なしで MPD 制御 API（stop / clear / playlist 等）が全世界から到達可能になる
- **決定**: `mpc.your-domain.com` に Cloudflare Access を適用。Policy は Service Auth（Service Token のみ Allow）+ Block（Everyone）
- **理由**:
  - CORS 制限は curl / スクリプトを防げない
  - Workers から mpc-bridge へ fetch する際、`CF-Access-Client-Id/Secret` ヘッダで認証
  - ストリーム（`mpd.*`）と UI（`your-domain.com`）は公開のまま維持
- **結果**: 制御面のみ閉じ、Tunnel の利点（ポート開放不要）は維持。Worker secrets に Service Token を登録

## Workers: MpdAgent DO + Hono

本番 UI は Cloudflare Workers（`workers/`）。MpdAgent DO は接続状態に応じて MPD をポーリングし、変化時だけ state をブロードキャストする。
**デプロイ手順（フォーク / メンテナの違い・secrets 表）は [maintenance.md](maintenance.md) を正本とする。** 以下はルート・認証のリファレンスのみ。

### サブドメイン

| ホスト | 役割 | 公開 |
|--------|------|:----:|
| `your-domain.com` | Web UI（Workers） | ✅ リスナー + 管理 |
| `mpd.your-domain.com` | MP3 ストリーム（Tunnel → MPD HTTPD） | ✅ 聴取のみ |
| `mpc.your-domain.com` | mpc-bridge（MPD 制御 HTTP） | 🔒 Access Service Token のみ |

### Home データフロー

詳細な経路と設計意図は [architecture.md](architecture.md#mpd-home-data-flow) を参照。

### 現在曲の取得経路

| 経路 | 用途 | 実装 |
|------|------|------|
| DO state push + `useAgent` | React クライアント（ライブ、Play 後） | `use-mpd-agent.tsx` → `onStateUpdate` |
| bridge `status` + `currentsong` | SSR（`getCachedCurrentSongForSsr`） | `current-song.ts` |
| bridge `status` + `currentsong` | `GET /currentsong`（`queryCurrentSongFromBridge`） | `current-song.ts`, `mpd/routes.ts` |
| bridge `status` 直叩き | SSR リスナー数 | `listener-count.ts` |
| DO `getCurrentSongView` | Play 後の RPC refresh のみ | `mpd-agent.ts` |

MPD TCP 6600 に接続するのは **mpc-bridge**。Workers の SSR・HTTP ルートと MpdAgent DO は Tunnel 経由で bridge の HTTP API を呼ぶ。ライブ更新は MpdAgent DO の state ブロードキャスト一本（[Agents SDK](https://developers.cloudflare.com/agents/)。Cap'n Web RPC は削除済み）。

### HTTP ルート（Workers）

| Method | Path | 認証 | 説明 |
|--------|------|------|------|
| GET | `/` | なし | リスナー Home |
| GET | `/og.png` | なし | OGP 画像 |
| GET | `/openapi.json` | なし（ローカル dev / `*.workers.dev`） | OpenAPI 3.1。カスタムドメインでは 404 |
| ALL | `/agents/MpdAgent/*` | なし | MpdAgent Durable Object の WebSocket/RPC |
| GET | `/status`, `/currentsong`, `/mpd/ping` | Basic | 診断・ops |
| GET | `/queue*` | Basic | 管理 UI 閲覧 |
| POST/PATCH/DELETE | `/queue*` | Basic or Bearer | キュー CRUD（Inertia） |
| GET/POST/PATCH/DELETE | `/api/queue*` | Basic or Bearer | キュー CRUD（JSON） |

### Worker シークレット

| 名前 | 用途 |
|------|------|
| `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET` | mpc Access Service Token |
| `USERNAME` / `PASSWORD` | 管理 UI Basic Auth |
| `TOKEN` | 管理 API Bearer（write 用 `basicOrBearer`） |

登録手順・フォーク向け注意は [maintenance.md](maintenance.md#env-files) を参照。

### 関連ファイル

| ファイル | 役割 |
|----------|------|
| `workers/worker/mpd-agent.ts` | DO: poll, state push |
| `workers/app/server/mpd/bridge.ts` | mpc-bridge fetch + Access ヘッダ |
| `workers/app/server/mpd/playlist.ts` | キュー CRUD (better-result) |
| `workers/app/server/queue-routes.ts` | /queue HTTP + auth |
| `workers/app/lib/radio/use-mpd-agent.tsx` | React `useAgent` watch（lazy connect） |
| `workers/app/server/mpd/current-song.ts` | SSR キャッシュ / live currentsong クエリ |
| `workers/app/server/mpd/listener-count.ts` | SSR リスナー数（`getCachedListenerCountForSsr`） |
| `workers/app/server/api/queue.ts` | JSON `/api/queue` |
| `workers/app/server/middleware.ts` | basic / bearer / hono-agents |
| `mpc-bridge/main.go` | MPD TCP 接続プール |

詳細は [workers/README.md](../workers/README.md)。

公式: [Agents SDK](https://developers.cloudflare.com/agents/) / [Durable Objects](https://developers.cloudflare.com/durable-objects/) / [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/policies/access/) / [MPD Protocol](https://mpd.readthedocs.io/en/latest/protocol.html)
