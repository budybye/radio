# 参考資料

## 技術スタック別リファレンス

| 技術 | リンク | 用途 |
|------|--------|------|
| Docker Engine | https://docs.docker.com/engine/ | コンテナランタイムの公式ドキュメント |
| Docker Compose | https://docs.docker.com/compose/ | マルチコンテナ構成の定義と管理 |
| Alpine Linux | https://wiki.alpinelinux.org/wiki/Main_Page | 軽量ディストリビューションのパッケージ管理・musl libc 情報 |
| Alpine Packages — mpd | https://pkgs.alpinelinux.org/packages?name=mpd | Alpine 公式パッケージ情報（バージョン追跡） |
| MPD (Music Player Daemon) | https://www.musicpd.org/doc/html/ | MPD の公式ドキュメント。設定ディレクティブ、プロトコル仕様、出力プラグイン詳細 |
| MPD User's Manual | https://www.musicpd.org/doc/html/user.html | クライアント操作、ライブラリ管理、設定ファイル記法 |
| MPD — HTTPD Output | https://www.musicpd.org/doc/html/plugins.html#httpd | HTTPD 出力プラグインの設定項目（`max_clients`、`always_on`、`tags` 等） |
| LAME MP3 Encoder | https://lame.sourceforge.io/ | MP3 エンコーダーの仕様と品質設定 |
| Cloudflare Tunnel | https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/ | Zero Trust ネットワーク公開の公式ガイド |
| Cloudflare Agents SDK | https://developers.cloudflare.com/agents/ | MpdAgent DO、`useAgent`、callable RPC、hibernation |
| Cloudflare Durable Objects | https://developers.cloudflare.com/durable-objects/ | MpdAgent の永続化・SQLite |
| cloudflared Docker | https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/deploy-tunnels/tunnel-with-docker/ | Docker 環境での Tunnel デプロイ手順 |
| mpc (Music Player Client) | https://www.musicpd.org/clients/mpc/ | コマンドラインクライアントのリファレンス |
| ncmpcpp | https://ncmpcpp.rybczak.net/ | TUI クライアントの公式サイトとキーバインド一覧 |
| ラボヒット — MPD 導入メモ | https://www.labohyt.net/server/post-927/ | 日本語による MPD 導入・設定の解説記事 |

## 関連規格・プロトコル

| 規格 | リンク | 説明 |
|------|--------|------|
| ICY プロトコル（Shoutcast メタデータ） | https://cast.readme.io/docs/icy | HTTP ストリーミングにおけるタイトルメタデータ伝送方式 |
| MPEG Audio Layer III | https://www.iso.org/standard/22412.html | MP3 フォーマットの ISO 規格 |

## 内部ドキュメントリンク

| ドキュメント | パス | 内容 |
|--------------|------|------|
| 索引 | [README.md](README.md) | 読む順・ドキュメント一覧 |
| 図解 | [diagrams.md](diagrams.md) | アーキテクチャ・認証・デプロイ（Mermaid） |
| 要件定義 | [requirements.md](requirements.md) | 機能要件・非機能要件 |
| 設計仕様 | [design.md](design.md) | モジュール責務・ADR |
| フォークデプロイ | [deploy-fork.md](deploy-fork.md) | Deploy to Cloudflare 手順 |
| OpenSpec | [openspec.md](openspec.md) | ワークフロー・archive |
| コードパターン | [patterns/README.md](patterns/README.md) | better-result 等テンプレート |
| 技術仕様 | [tech.md](tech.md) | スタック詳細・設定ファイル解説 |
| テスト方針 | [test.md](test.md) | テスト戦略と検証手順 |
| タスク管理 | [tasks.md](tasks.md) | マイルストーン・バックログ |
| ディレクトリ構造 | [directory.md](directory.md) | ファイル配置規則 |
| 既知の問題 | [problems.md](problems.md) | 未解決課題・リスク |
