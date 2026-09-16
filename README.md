# 🎵 Docker MPD Internet Radio

個人の音楽ファイルをインターネットラジオとして配信する Docker 構成です。Docker + MPD + Cloudflare Tunnel で、ポート開放なしにストリームを公開します。

## 目次

- [機能](#機能)
- [クイックスタート](#クイックスタート)
- [アーキテクチャ](#アーキテクチャ)
- [開発](#開発)
- [操作ガイド](#操作ガイド)
- [設定のポイント](#設定のポイント)
- [ドキュメント](#ドキュメント)
- [トラブルシューティング](#トラブルシューティング)
- [ライセンス](#ライセンス)

## 機能

- 🎶 **MP3 ストリーミング配信**（320kbps）
- 🌐 **Cloudflare Tunnel で公開**（ポート開放不要）
- 🔄 **音楽フォルダの自動監視 & ライブラリ更新**
- 📻 **常時配信モード**（停止中もリスナー接続を維持）
- 🎛️ **mpc / ncmpcpp でのプレイリスト管理**
- 📱 **iOS / Android / ブラウザ対応**

## クイックスタート

### 前提条件

| ツール | 要件 |
|--------|------|
| Docker Engine | リポジトリで固定なし |
| Docker Compose | リポジトリで固定なし |

### セットアップ & 起動

```bash
# 1. リポジトリをクローン
git clone <repo-url>
cd radio

# 2. セットアップ（.env + workers/.env + music/ 作成）
make setup

# 3. TUNNEL_TOKEN を .env に設定（公開配信する場合）
#    取得方法: Cloudflare Zero Trust → Networks → Tunnels → Create a tunnel

# 4. 音楽ファイルを music/ に配置

# 5. 起動（ローカル MPD + mpc-bridge）
make up-build

# 公開配信する場合（TUNNEL_TOKEN 設定後）
make up-tunnel
```

環境ファイルの取り扱いは [AGENTS.md の禁止事項](AGENTS.md#golden-rules-read-before-any-change) を参照してください。

`make up` 後、キューが空の場合は `scripts/entrypoint.sh` が自動で全曲を追加 → ランダム再生を開始します。初回でローカルイメージがない場合は `make up-build` を使ってください。手動でライブラリを更新したい場合は `make reload` を使ってください。

全 `make` コマンド一覧は下記「操作ガイド」を参照。詳細は [docs/tech.md](docs/tech.md) もどうぞ。

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

### Web UI で操作する

Web UI は `workers/` を Cloudflare Workers に deploy して使う（compose には含めない）。

#### フォークして自分の Cloudflare に載せる（Deploy to Cloudflare）

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/budybye/radio&directory=workers)

ボタンで **Workers のみ** がデプロイされます。MPD / Tunnel は別途 [クイックスタート](#クイックスタート) の Docker スタックが必要です。

> **メンテナ本番**: MPD・mpc-bridge・Tunnel の Docker は **Raspberry Pi 上で既に常時稼働**しています。Workers の変更は `cd workers && bun run deploy` のみでよく、Pi 側の compose を毎回起動する必要はありません（詳細: [docs/maintenance.md](docs/maintenance.md#maintainer-production)）。

デプロイ後のチェックリスト（vars・secrets・Access・Tunnel）は **[docs/maintenance.md](docs/maintenance.md)** を参照。

#### このリポジトリのメンテナが手動デプロイする場合

```bash
cd workers
bun install
bun run deploy   # Worker "radio" — workers/.env があれば実ホスト名を注入
```

> 単一 Worker `radio`。詳細: [docs/maintenance.md](docs/maintenance.md#deploy-targets)

| ホスト | 用途 |
|--------|------|
| `your-domain.com` | リスナー Home + 管理 UI（`GET /queue*` は Basic、書き込みは Basic または Bearer） |
| `mpd.your-domain.com` | MP3 ストリーム URL（Home の `config.stations` 内の MPD 局が参照） |

ローカル UI 確認（任意）: `cd workers && bun run dev`

E2E は `radio.*.workers.dev` / `radio-preview.*.workers.dev` とカスタムドメインで実行できます。詳細は [docs/test.md](docs/test.md)。

## アーキテクチャ

```
リスナー（ブラウザ / VLC / アプリ）
    │ HTTPS
    ▼
Cloudflare（Workers UI + Tunnel エッジ）
    │
    ├──► mpd.* ──► MPD HTTPD ──► MP3 ストリーム
    │
    ├──► mpc.* ──► mpc-bridge ──► MPD TCP 6600（Access 保護）
    │
    └──► your-domain.com ──► Workers（Web UI + MpdAgent DO）
             │
             ▼
        Docker: MPD + mpc-bridge + cloudflared
```

構成とデータフローは [docs/architecture.md](docs/architecture.md)、認証境界は [docs/security.md](docs/security.md) を参照してください。

## 開発

開発環境は [docs/tech.md](docs/tech.md)、検証は [docs/test.md](docs/test.md)、実装パターンは [docs/pattern.md](docs/pattern.md) を参照。作業時の注意と読む順は [AGENTS.md](AGENTS.md) にあります。

```bash
make test      # 統合テスト（7項目のヘルスチェック）
make logs      # リアルタイムログ表示
make status    # 現在の再生状態を表示
make ncmpcpp   # TUI プレイヤーを開く
```

## 操作ガイド

完全な Make target 一覧は `make help` を参照。

### MPC コマンド（コンテナ内直接操作）

```bash
docker compose exec mpd mpc play
docker compose exec mpd mpc pause
docker compose exec mpd mpc next
docker compose exec mpd mpc prev
docker compose exec mpd mpc status
docker compose exec mpd mpc update   # ライブラリ更新
docker compose exec mpd mpc clear    # プレイリストクリア
```

> `mpc volume` はコンテナ内にハードウェアミキサーがないため無効です。音量調整はクライアント側（VLC / ブラウザ）で行ってください。

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

詳細な設定ファイル解説は [docs/tech.md](docs/tech.md) を参照してください。

| 設定 | 値 | 理由 |
|-----|---|------|
| `always_on yes` | 有効 | 再生停止時もリスナー接続を維持 |
| `mixer_type none` | 無効 | コンテナ内にハードウェアミキサーがないため |
| `auto_update yes` | 有効 | ファイル追加後自動反映 |

※ `mixer_type none` のため、音量調整はクライアント側（VLC 等）で行ってください。`mpc volume` は無効です。

## ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| [docs/requirements.md](docs/requirements.md) | 機能要件・受け入れ範囲・バックログ |
| [docs/architecture.md](docs/architecture.md) | モジュール責務・データモデル・データフロー |
| [DESIGN.md](DESIGN.md) | Home UI の表示・操作・アクセシビリティ |
| [docs/security.md](docs/security.md) | 認証・権限・境界 |
| [docs/tech.md](docs/tech.md) | 技術スタック・ADR |
| [docs/maintenance.md](docs/maintenance.md) | デプロイ・環境変数・運用 |
| [docs/pattern.md](docs/pattern.md) | Result・wire・HTTP・フォーム・OpenAPI の実装パターン |
| [docs/test.md](docs/test.md) | テスト戦略・検証手順 |
| [docs/directory.md](docs/directory.md) | ディレクトリ構造・規約 |
| [docs/problems.md](docs/problems.md) | 既知の問題・リスク |
| [docs/references.md](docs/references.md) | 参考資料リンク集 |
| [AGENTS.md](AGENTS.md) | 作業時の禁止事項・読む順 |
| [workers/README.md](workers/README.md) | Workers 開発・ルート・シークレット |

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
