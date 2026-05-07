# 🎵 Docker MPD Internet Radio

Docker + MPD + Cloudflare Tunnel で個人音楽をインターネットラジオとして配信します。不特定多数のリスナーがブラウザや音楽プレイヤーからアクセス可能です。

## 機能

- 🎶 **MP3 ストリーミング配信**（320kbps / CD 品質）
- 🌐 **Cloudflare Tunnel で安全に公開**（ポート開放不要）
- 🔄 **音楽フォルダの自動監視 & ライブラリ更新**
- 📻 **常時配信モード**（停止中もリスナー接続を維持）
- 🎛️ **mpc / ncmpcpp でのプレイリスト管理**
- 📱 **iOS / Android / ブラウザ対応**

## クイックスタート

### 前提条件

| ツール | 最低バージョン |
|--------|---------------|
| Docker Engine | 24.0+ |
| Docker Compose | 2.20+ |

### インストール

```bash
# 1. リポジトリをクローン
git clone <repo-url>
cd radio

# 2. セットアップ（.env 作成 + music/ 作成）
make setup

# 3. 音楽ファイルを music/ に配置して起動
make up-build # 初回: ビルド + 起動
make up       # 2回目以降: 起動のみ（高速）
```

> 全 `make` コマンド一覧は [docs/tech.md](docs/tech.md) を参照。

### 環境変数

`.env.example` をコピーし、`TUNNEL_TOKEN` を設定してください。

- `TUNNEL_TOKEN` の取得方法: [Cloudflare Zero Trust](https://one.dash.cloudflare.com/) → Zero Trust → Networks → Tunnels → Create a tunnel → トークンをコピー

> ⚠️ `.env` は `.gitignore` に登録済みです。決してコミットしないでください。

### 起動

```bash
make up-build # 初回: ビルド + 起動
make up       # 2回目以降: 起動のみ（高速）
```

> `make up` 後にキューが空の場合、`scripts/entrypoint.sh` が自動で `mpc ls | mpc add` → `mpc random on` → `mpc play` を実行します。手動で操作したい場合は `make play`（ライブラリ更新 → キュー追加 → 再生）を使ってください。

#### Pre-built イメージを使う（オプション）

毎回ビルドしないで済ませたい場合、`compose.yaml` の `mpd` サービスを以下のように変更：

```yaml
  mpd:
    # build: .                    # ← コメントアウト
    image: ghcr.io/<your-username>/radio-mpd:latest  # ← 有効化
```

事前に GitHub Actions でビルドされたイメージが必要。[`.github/workflows/build.yaml`](.github/workflows/build.yaml) を参照。

### ストリームを聴く

Cloudflare Tunnel で公開された URL にブラウザや音楽プレイヤーでアクセスしてください：

```
https://your-tunnel-domain/
```

> Cloudflare Tunnel ダッシュボードで Public Hostname の Service を `http://mpd:8000` に設定してください。

## アーキテクチャ

```
リスナー（ブラウザ / VLC / アプリ）
    │ HTTPS
    ▼
Cloudflare Tunnel（cloudflared）
    │
    ├──► http://mpd:8000  ──► MP3 ストリーム（リスナー向け）
    │
    ├──► http://radio-app:5173  ──► Web UI（MPD 制御・SPA）
    │
    └──► 管理操作は `docker compose exec` のみ（ホストにポート公開なし）
             │
             ▼
        MPD コンテナ（Alpine Linux + MPD 0.23.14）
```

詳細は [docs/design.md](docs/design.md) を参照してください。

## 開発

開発環境の構築、テスト実行、コーディング規約は `AGENTS.md` に定義されています。

```bash
make test    # ヘルスチェック実行
make logs    # リアルタイムログ表示
make status  # 現在の再生状態を表示
```

## 操作ガイド

### MPC コマンド一覧

| コマンド | 説明 |
|---------|------|
| `mpc play` | 再生 |
| `mpc pause` | 一時停止 |
| `mpc next` | 次の曲 |
| `mpc prev` | 前の曲 |
| `mpc volume 80` | 音量 80%（※無効 — クライアント側で調整） |
| `mpc clear` | プレイリストをクリア |
| `mpc add <path>` | 曲を追加 |
| `mpc update` | ライブラリを更新 |
| `mpc status` | 現在の状態を表示 |

### ncmpcpp（TUI クライアント）

```bash
docker compose exec -it mpd ncmpcpp
```

主なキーバインド：
- `Enter` — 再生
- `p` — 一時停止
- `n` — 次の曲
- `b` — 前の曲
- `q` — 終了
- `F1` — ヘルプ（全キーバインド表示）

### おすすめクライアントアプリ

| プラットフォーム | アプリ | 機能 |
|---------------|-------|------|
| iOS | [MPod](https://apps.apple.com/jp/app/mpod/id285063020) / [MPad](https://apps.apple.com/jp/app/mpad/id423097706) | コントロール + ストリーミング再生 |
| Android | [MPDroid](https://play.google.com/store/apps/details?id=com.namelessdev.mpdroid) | コントロール + ストリーミング再生 |
| クロスプラットフォーム | [ncmpcpp](https://github.com/ncmpcpp/ncmpcpp) (CUI) | 高機能ターミナルクライアント |
| ブラウザ | Chrome / Firefox / Safari | URL で直接再生 |

> 参考: [ラボヒット – MPD 導入メモ](https://www.labohyt.net/server/post-927/)

## 設定のポイント

| 設定 | 値 | 理由 |
|-----|---|------|
| `always_on yes` | 有効 | 再生停止時もリスナー接続を維持（ラジオ配信に必須） |
| `tags yes` | 有効 | 曲名・アーティスト情報をストリームに含める |
| `mixer_type none` | 無効 | コンテナ内にハードウェアミキサーがないため |
| `auto_update yes` | 有効 | ファイル追加後自動反映 |
| `entrypoint.sh` | 自動実行 | MPD 起動後に空キューを検出 → 自動で曲追加 + ランダム再生開始 |
| `fifo` 出力 | `/var/lib/mpd/mpd.fifo` | ncmpcpp の visualizer 用データソース |

※ `mixer_type none` のため、音量調整はクライアント側（VLC 等）で行ってください。`mpc volume` は無効です。

詳細な設定ファイル解説は [docs/tech.md](docs/tech.md) を参照してください。

## ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| [docs/requirements.md](docs/requirements.md) | 要件定義・機能要件 |
| [docs/design.md](docs/design.md) | システム設計・アーキテクチャ・ADR |
| [docs/tech.md](docs/tech.md) | 技術スタック・環境構築手順・`make` コマンド一覧 |
| [docs/test.md](docs/test.md) | テスト戦略・検証手順 |
| [docs/tasks.md](docs/tasks.md) | ロードマップ・タスク管理 |
| [docs/directory.md](docs/directory.md) | ディレクトリ構造・規約 |
| [docs/problems.md](docs/problems.md) | 既知の問題・リスク |
| [docs/references.md](docs/references.md) | 参考資料リンク集 |
| [AGENTS.md](AGENTS.md) | 開発ルール・ガイドライン（英語） |

## トラブルシューティング

| 症状 | 対処法 |
|------|--------|
| 音楽が追加されない | `docker compose exec mpd mpc update` を実行。`auto_update` により自動反映もされます |
| ストリームに接続できない | Tunnel の Public Hostname で Service が `http://mpd:8000` になっているか確認 |
| 音が出ない・エンコードエラー | `docker compose logs mpd` で確認。Alpine の `mpd` パッケージに `lame` が含まれていることを確認済み |
| ncmpcpp の画面が崩れる | `docker compose exec -it mpd ncmpcpp` で `-it`（TTY + 対話モード）を付けているか確認 |

詳細は [docs/problems.md](docs/problems.md) を参照してください。

## ライセンス

MIT
