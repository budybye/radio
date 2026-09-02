# 技術仕様

## 技術スタック

| カテゴリ | 技術 | バージョン | 備考 / 標準 |
|----------|------|-----------|-------------|
| コンテナランタイム | Docker Engine | 29.4.0 | コンテナのビルド・実行・ネットワーク管理 |
| オーケストレーション | Docker Compose | v2.35.2（Docker Desktop v5.1.2 内蔵） | マルチコンテナ構成の定義と起動 |
| ベースOS | Alpine Linux | 3.20 | 軽量イメージ（約5MB）。musl libc ベース |
| 音楽サーバー | MPD (Music Player Daemon) | 0.23.14 | HTTPD 出力によるストリーミング配信 |
| エンコーダー | LAME | 3.100（Alpine パッケージ同梱） | MP3 エンコード（320kbps / 44100Hz） |
| 公開基盤 | Cloudflare Tunnel (cloudflared) | latest（イメージタグ） | ゼロトラスト公開（ポート開放不要）。固定バージョン移行は Phase 2 で検討 |
| クライアント | mpc / ncmpcpp | mpc 0.35 / ncmpcpp 0.9.2（Alpine パッケージ） | MPD のコマンドライン・TUI クライアント |

### 採用する Web 標準・プロトコル

- **ストリーミング**: HTTP/1.1（MPD HTTPD 出力 — ICY 互換の MP3 ストリーム）
- **制御プロトコル**: MPD Protocol（TCP 6600、テキストベースコマンド）
- **文字コード**: UTF-8（MPD タグ、ファイル名）
- **暗号化**: TLS 1.3（Cloudflare Tunnel 終端 — リスナー→Tunnel 間）

## 開発環境

### 必要ツール

| ツール | 最低バージョン | 用途 |
|--------|---------------|------|
| Docker Engine | 24.0+ | コンテナビルド・実行 |
| Docker Compose | 2.20+ | `compose.yaml` の解釈 |
| ターミナル（ターミナルエミュレータ） | — | `mpc` / `ncmpcpp` 操作 |

### セットアップ手順

```bash
# 1. リポジトリをクローン
git clone <repo-url>
cd radio

# 2a. Docker で起動（推奨）
bash scripts/setup.sh  # Docker 環境構築（初回のみ）
make setup             # .env 作成 + music/ 作成
make up-build          # 初回: ビルド + 起動
make up                # 2回目以降: 起動のみ（高速）
```

Make target の一覧と説明は、重複を避けるため `make help` を参照。

### 環境変数

| 変数名 | 必須 | 説明 | 取得方法 |
|--------|------|------|----------|
| `TUNNEL_TOKEN` | はい | Cloudflare Tunnel の認証トークン | Cloudflare Zero Trust ダッシュボードで作成した Tunnel のトークンをコピー |

> `.env.example` を `.env` にコピーして値を設定してください。
> `.env` は `.gitignore` に登録済み — 決してコミットしないこと。

## インフラ構成

### デプロイターゲット

- **開発**: ローカル Docker ホスト（Linux / macOS / Windows WSL2）— `make up` / `make up-tunnel`
- **本番（メンテナ）**: **Raspberry Pi 上の Docker Compose** — `mpd`・`mpc-bridge`・`tunnel`（`--profile tunnel`）が常時稼働。Workers は Cloudflare 上の `radio` のみデプロイし、Pi スタックは通常触らない
- **公開経路**: Cloudflare Tunnel（cloudflared コンテナ）→ `mpd.*`（ストリーム）・`mpc.*`（bridge、Access 保護）

詳細: [deploy-fork.md#メンテナ本番](deploy-fork.md#メンテナ本番)

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

実際の設定を正本として参照:

- [`compose.yaml`](../compose.yaml): MPD、mpc-bridge、Tunnel の起動・接続・ボリューム定義
- [`Dockerfile`](../Dockerfile): Alpine ベースの MPD 実行イメージ
- [`config/mpd.conf`](../config/mpd.conf): MPD の再生・HTTPD 出力設定
- [`scripts/entrypoint.sh`](../scripts/entrypoint.sh): 起動時の自動キュー投入・再生

設定ファイルのコピーを本書へ埋め込まない。変更時のドリフトを防ぐ。

### `config/config`（ncmpcpp 設定）

```
cmpcpp_directory = /root/.ncmpcpp
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

## Workers: MpdAgent DO + Hono

本番 UI は Cloudflare Workers（`workers/`）。MPD ポーリングは **Agents SDK `MpdAgent` DO** が global 1 本。

**デプロイ手順（フォーク / メンテナの違い・secrets 表）は [deploy-fork.md](deploy-fork.md) を正本とする。** 以下はルート・認証のリファレンスのみ。

### サブドメイン

| ホスト | 役割 | 公開 |
|--------|------|:----:|
| `your-domain.com` | Web UI（Workers） | ✅ リスナー + 管理 |
| `mpd.your-domain.com` | MP3 ストリーム（Tunnel → MPD HTTPD） | ✅ 聴取のみ |
| `mpc.your-domain.com` | mpc-bridge（MPD 制御 HTTP） | 🔒 Access Service Token のみ |

### Home データフロー（曲メタ / リスナー数）

図: [diagrams.md#mpd-home-data-flow](diagrams.md#mpd-home-data-flow)

| データ | SSR (`GET /`) | CSR（Play クリック後） |
|--------|---------------|----------------------|
| **現在曲** | `fetchCurrentSongResult()` → mpc-bridge 直叩き（短 TTL キャッシュ） | `useAgent` `onStateUpdate` |
| **リスナー数** | `fetchListenerCountResult()` → bridge `status` 直叩き（短 TTL キャッシュ） | `useAgent` `onStateUpdate` |
| **MPD state** | — | `useAgent` `onStateUpdate` |

**設計意図**: SSR / ops は mpc-bridge 直叩き（DO を起こさない）。ライブ更新は Play 後に `useAgent` が接続し、DO の `tick()` が正本。preview HTTP smoke の `listenerCount` は SSR 値、opencli はハイドレーション後のライブ値。

### 現在曲の取得経路

| 経路 | 用途 | 実装 |
|------|------|------|
| DO state push + `useAgent` | React クライアント（ライブ、Play 後） | `use-mpd-agent.tsx` → `onStateUpdate` |
| bridge `status` + `currentsong` | SSR / `GET /currentsong` | `current-song.ts`, `mpd/routes.ts` |
| bridge `status` 直叩き | SSR リスナー数 | `listener-count.ts` |
| DO `getCurrentSongView` | Play 後の RPC refresh のみ | `mpd-agent.ts` |

Workers は生 TCP 6600 不可（Tunnel HTTP のみ）。**MPD を叩くのは DO と mpc-bridge だけ**。ライブ更新は MpdAgent DO の state ブロードキャスト一本（[Agents SDK](https://developers.cloudflare.com/agents/)。Cap'n Web RPC は削除済み）。

### HTTP ルート（Workers）

| Method | Path | 認証 | 説明 |
|--------|------|------|------|
| GET | `/` | なし | リスナー Home |
| GET | `/status`, `/currentsong`, `/mpd/ping` | Basic | 診断・ops |
| GET | `/posts*` | Basic | 管理 UI 閲覧 |
| POST/PATCH/DELETE | `/posts*` | Basic or Bearer | キュー CRUD（Inertia or API） |

### Worker シークレット

| 名前 | 用途 |
|------|------|
| `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET` | mpc Access Service Token |
| `USERNAME` / `PASSWORD` | 管理 UI Basic Auth |
| `TOKEN` | 管理 API Bearer（write 用 `basicOrBearer`） |

登録手順・フォーク向け注意は [deploy-fork.md](deploy-fork.md) を参照。

### 関連ファイル

| ファイル | 役割 |
|----------|------|
| `workers/worker/mpd-agent.ts` | DO: poll, state push |
| `workers/app/server/mpd/bridge.ts` | mpc-bridge fetch + Access ヘッダ |
| `workers/app/server/mpd/playlist.ts` | キュー CRUD (better-result) |
| `workers/app/server/posts-routes.ts` | /posts HTTP + auth |
| `workers/app/lib/radio/use-mpd-agent.tsx` | React `useAgent` watch（lazy connect） |
| `workers/app/server/mpd/listener-count.ts` | SSR リスナー数（bridge 直叩き） |
| `workers/app/server/middleware.ts` | basic / bearer / hono-agents |
| `mpc-bridge/main.go` | MPD TCP 接続プール |

詳細は [workers/README.md](../workers/README.md)。

公式: [Agents SDK](https://developers.cloudflare.com/agents/) / [Durable Objects](https://developers.cloudflare.com/durable-objects/) / [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/policies/access/) / [MPD Protocol](https://mpd.readthedocs.io/en/latest/protocol.html)
