# 設計仕様

> **変更スコープの設計**は進行中は `openspec/changes/<name>/design.md`、システム全体のアーキテクチャ・ADR は本書を正本とする。

## アーキテクチャ概要

システムトポロジ・認証マトリクスは **[diagrams.md](diagrams.md)** を正本とする（Mermaid 図）。

### 原則と Web 標準

- **最小構成主義**: Alpine Linux + 公式パッケージのみ。不要なレイヤーを排除し、イメージサイズと攻撃対象を最小化
- **コンテナ単一責任**: MPD は再生・ストリーム、mpc-bridge はプロトコル変換、Tunnel は公開。Web UI は Cloudflare Workers
- **読み取り専用化**: 音楽ファイルは `:ro` マウント、設定ファイルも read-only で改ざん防止
- **ローカル制御ポートの分離**: 6600 ポートは `127.0.0.1` にのみバインドし、外部からの不正アクセスを防ぐ

## モジュール構成

### `Dockerfile`
- **責任**: MPD 実行環境の構築（Alpine 3.20 + mpd/mpc/ncmpcpp）
- **依存**: `alpine:3.20` ベースイメージ
- **公開インターフェース**: ポート 6600（制御）, 8000（ストリーム）

### `compose.yaml`
- **責任**: Docker スタック（MPD + mpc-bridge + Tunnel + ボリューム）
- **依存**: `Dockerfile`、`mpc-bridge/Dockerfile`、`.env`（TUNNEL_TOKEN）
- **公開インターフェース**: `docker compose up` — Web UI は別途 `workers/` を Workers へ deploy

### `mpc-bridge/`
- **責任**: MPD テキストプロトコルを HTTP に変換（TCP 接続プール）
- **依存**: MPD 6600
- **公開インターフェース**: `GET /mpd.cgi?cmd=...`、Tunnel 経由で Workers から到達

### `config/mpd.conf`
- **責任**: MPD の動作設定（音楽ディレクトリ、出力形式、自動更新等）
- **依存**: なし（静的設定）
- **公開インターフェース**: `/etc/mpd.conf` としてコンテナにマウント

### `Makefile`
- **責任**: 高頻度操作のエイリアス提供（`make up`, `make test`, `make ncmpcpp`, `make random` / `make sequential` 等）
- **依存**: `docker compose`, `scripts/test.sh`
- **公開インターフェース**: `make <target>` — 各種 docker compose ラッパーコマンド

### `scripts/test.sh`
- **責任**: 自動化されたヘルスチェック（コンテナ起動・デーモン応答・制御ポート到達性・HTTPD 出力有効・ライブラリ確認・マウント確認）
- **依存**: `docker compose`, `bash`
- **公開インターフェース**: `make test` または `bash scripts/test.sh`

### `music/` ディレクトリ
- **責任**: 配信対象音楽ファイルの格納
- **依存**: なし（ホスト側で管理）
- **公開インターフェース**: `/music` としてコンテナに read-only マウント

## データモデル

MPD 内部で管理される主要データ構造（外部から直接編集しない）：

| データ | 場所 | 説明 |
|--------|------|------|
| 楽曲ライブラリDB | `/var/lib/mpd/database` | タグ情報・ファイルパス索引（named volume 永続化） |
| プレイリスト | `/var/lib/mpd/playlists` | 保存済みプレイリストファイル |
| ステート | `/var/lib/mpd/state` | 再生位置・音量・ランダム設定等の復元情報 |
| ステッカーDB | `/var/lib/mpd/sticker.sql` | 楽曲へのユーザー定義メタデータ（評価等） |

## API / インターフェース設計

### ストリーミングエンドポイント（リスナー向け）

| Method | パス | 説明 | 認証 | 標準 |
|--------|------|------|------|------|
| GET | `/` | MP3 ストリーム（HTTPD 出力） | 不要 | HTTP/1.1, MP3 (MPEG Audio) |

### MPD 制御プロトコル（管理者向け）

| インターフェース | ポート / パス | 説明 |
|------------------|---------------|------|
| MPD Protocol | 6600（コンテナ内部） | TCP テキストプロトコル（mpc, ncmpcpp） |
| mpc-bridge | `mpc.*` → `/mpd.cgi?cmd=` | Tunnel 経由 HTTP。Access Service Token で保護 |
| Workers `/posts` | 044g.com | キュー CRUD。Basic（read）/ Basic or Bearer（write） |
| ncmpcpp (TUI) | コンテナ内 | 対話的ターミナルクライアント |

### Workers 診断エンドポイント

| Method | パス | 説明 | 認証 |
|--------|------|------|------|
| GET | `/status` | MPD status JSON | Basic |
| GET | `/currentsong` | 現在曲（`Result` シリアライズ） | Basic |
| GET | `/mpd/ping` | mpc-bridge + MPD 到達性 | Basic |

### Workers: 現在曲データフロー

```
[SSR GET /]
  fetchCurrentSong() ──RPC──► MpdAgent.getCurrentSongView()
       │                         │
       │                         └── pollTick ──► mpc-bridge ──► MPD
       └── Inertia props.song

[Browser Home]
  useRadioPlayer()
    ├── useState (currentSong)
    └── useMpdAgentWatch()
          ├── onStateUpdate ──► DO state push（変化 tick のみ）
          └── refresh() ──► getCurrentSongView RPC（visibility 復帰時）
```

- **削除済み**: Cap'n Web RPC、SWR、`use-current-song.ts`、`client.ts`
- **ops**: `GET /currentsong` は `getCurrentSongResult()` を JSON で返す（Basic 認証）

## 状態管理

```
[停止/準備中] --mpc play--> [再生中] --mpc pause--> [一時停止]
     ▲                            │                      │
     └────────────────────────────┴──────────────────────┘
              （mpc toggle / キュー終了時の自動停止）
```

- `always_on yes` により、停止状態でもリスナーは接続維持（無音ストリーム）
- `auto_update yes` により music/ へのファイル追加・変更が自動反映

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
  - 豊富なクライアントエコシステム（mpc, ncmpcpp, 各種スマホアプリ）
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
- **結果**: 運用コストゼロで安全な公開が実現。ただし Cloudflare のネットワーク経由のため、レイテンシは地理的に依存

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
- **決定**: `mpc.044g.com` に Cloudflare Access を適用。Policy は Service Auth（Service Token のみ Allow）+ Block（Everyone）
- **理由**:
  - CORS 制限は curl / スクリプトを防げない
  - Workers から mpc-bridge へ fetch する際、`CF-Access-Client-Id/Secret` ヘッダで認証
  - ストリーム（`mpd.*`）と UI（`044g.com`）は公開のまま維持
- **結果**: 制御面のみ閉じ、Tunnel の利点（ポート開放不要）は維持。Worker secrets に Service Token を登録
