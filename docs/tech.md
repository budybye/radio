# 技術仕様

## 技術スタック

| カテゴリ | 技術 | バージョン | 備考 / 標準 |
|----------|------|-----------|-------------|
| コンテナランタイム | Docker Engine | 29.4.0 | コンテナのビルド・実行・ネットワーク管理 |
| オーケストレーション | Docker Compose | v2.35.2（Docker Desktop v5.1.2 内蔵） | マルチコンテナ構成の定義と起動 |
| ベースOS | Alpine Linux | 3.19 | 軽量イメージ（約5MB）。musl libc ベース |
| 音楽サーバー | MPD (Music Player Daemon) | 0.23.14 | HTTPD 出力によるストリーミング配信 |
| エンコーダー | LAME | 3.100（Alpine パッケージ同梱） | MP3 エンコード（320kbps / 44100Hz） |
| 公開基盤 | Cloudflare Tunnel (cloudflared) | 2026.3.0 | ゼロトラスト公開（ポート開放不要） |
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
make up                # ビルド・起動・自動キュー追加・ランダム再生開始

# 2b. またはローカルに直接インストール（Ubuntu/Debian）
bash scripts/install.sh ~/Music   # apt で MPD をインストールし設定
```

### Makefile コマンド一覧

| コマンド | 内容 |
|----------|------|
| `make up` | コンテナをビルドして起動 |
| `make down` | コンテナを停止・削除 |
| `make play` | 手動でライブラリ更新 → キュー追加 → 再生（自動再生失敗時のフォールバック） |
| `make random` | ランダム再生モード ON |
| `make sequential` | ランダム再生モード OFF（順番再生） |
| `make stop` / `make pause` | 停止 / 一時停止 |
| `make next` / `make prev` | 次の曲 / 前の曲 |
| `make status` | 現在の再生状態を表示 |
| `make ncmpcpp` | ncmpcpp TUI を起動 |
| `make test` | ヘルスチェックを実行 |
| `make logs` | リアルタイムログ表示 |
| `make restart` | コンテナ再起動 |
| `make clean` | ボリューム含め完全削除 |

### 環境変数

| 変数名 | 必須 | 説明 | 取得方法 |
|--------|------|------|----------|
| `TUNNEL_TOKEN` | はい | Cloudflare Tunnel の認証トークン | Cloudflare Zero Trust ダッシュボードで作成した Tunnel のトークンをコピー |

> `.env.example` を `.env` にコピーして値を設定してください。
> `.env` は `.gitignore` に登録済み — 決してコミットしないこと。

## インフラ構成

### デプロイターゲット

- **開発・本番両方**: ローカル Docker ホスト（Linux / macOS / Windows WSL2）
- **公開経路**: Cloudflare Tunnel（cloudflared コンテナ）

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

### `compose.yaml`

```yaml
services:
  mpd:
    build: .
    container_name: radio-mpd
    volumes:
      - ./music:/music
      - ./config/mpd.conf:/etc/mpd.conf:ro
      - ./config/config:/root/.ncmpcpp/config:ro
      - mpd-data:/var/lib/mpd
    # ports:
    #   - "127.0.0.1:6600:6600"  # MPD control (mpc / ncmpcpp from host)
    #   - "127.0.0.1:8000:8000"  # HTTP stream (local testing)
    restart: unless-stopped

  tunnel:
    image: cloudflare/cloudflared:latest
    container_name: radio-tunnel
    command: tunnel run --token ${TUNNEL_TOKEN:-}
    restart: unless-stopped
    depends_on:
      - mpd

volumes:
  mpd-data:

networks:
  default:
    name: radio-network
    driver: bridge
```

**設定のポイント**:
- `build: .` → `Dockerfile` から MPD 環境をビルド
- `./config/config:/root/.ncmpcpp/config:ro` → ncmpcpp 設定をコンテナ内にマウント
- `ports` を **コメントアウト** → デフォルトではホスト側へのポート公開を避け、ローカル MPD 等との衝突を防止。アクセスは Tunnel 経由または `docker compose exec` のみ。モバイルアプリ等で直接制御する場合のみ `127.0.0.1:` プレフィックス付きで有効化
- `networks` → `radio-network` として明示的に命名。サービス間通信と外部識別が容易になる
- `depends_on` → Tunnel が MPD 起動後に開始されるよう依存関係を定義

### `Dockerfile`

```dockerfile
FROM alpine:3.19

RUN apk add --no-cache mpd mpc ncmpcpp && \
    mkdir -p /var/lib/mpd/playlists /music && \
    touch /var/lib/mpd/mpd.pid \
        /var/lib/mpd/state \
        /var/lib/mpd/sticker.sql && \
    chown -R mpd:audio /var/lib/mpd

COPY config/mpd.conf /etc/mpd.conf
COPY scripts/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 6600 8000

ENTRYPOINT ["/entrypoint.sh"]
```

**設定のポイント**:
- `--no-cache` で apk キャッシュ削除（イメージサイズ削減）
- `apk add` と `mkdir`/`touch`/`chown` を同じ `RUN` 内で実行 — `mpd` パッケージの `pre-install` で作成された `mpd:audio` ユーザー/グループが確実に存在する状態で権限設定
- `touch` で空ファイルを事前作成 — MPD 初回起動時の `pid`/`state`/`sticker` 不存在エラーを防止（`database` は MPD が自動作成するため `touch` しない）
- `chown mpd:audio` — Alpine の `mpd` パッケージは `mpd` ユーザー + `audio` グループで実行される（`mpd:mpd` ではなく `audio` グループ）
- `entrypoint.sh` で MPD 起動後にキューが空なら自動で曲を追加・再生（`make up` 後に `make play` 不要）
- `ENTRYPOINT` + `exec mpd` → PID 1 で実行。シグナル処理も適切（Docker のプロセス管理に最適）

### `config/config`（ncmpcpp 設定）

```
cmpcpp_directory = /root/.ncmpcpp
mpd_host = localhost
mpd_port = 6600
mpd_music_dir = /music

# Visualizer（MPD の fifo 出力と連携）
visualizer_data_source = /var/lib/mpd/mpd.fifo
visualizer_type = wave_filled
```

**設定のポイント**:
- `ncmpcpp_directory` → `/root/.ncmpcpp`（コンテナ内のホームディレクトリ）
- `visualizer_data_source` → MPD の fifo 出力 `/var/lib/mpd/mpd.fifo` と一致させる必要あり
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
| `max_clients 10` | 10 接続 | MPD HTTPD 出力の同時接続上限 |
| `fifo` 出力 | `/var/lib/mpd/mpd.fifo` | ncmpcpp の visualizer 用データソース |
