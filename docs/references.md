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
| DESIGN.md 形式仕様 | https://github.com/google-labs-code/design.md | コーディングエージェント向けデザインシステム記述フォーマット（本リポジトリの [DESIGN.md](../DESIGN.md) は `style.css` をトークン正本とするハイブリッド） |

## 関連規格・プロトコル

| 規格 | リンク | 説明 |
|------|--------|------|
| ICY プロトコル（Shoutcast メタデータ） | https://cast.readme.io/docs/icy | HTTP ストリーミングにおけるタイトルメタデータ伝送方式 |
| MPEG Audio Layer III | https://www.iso.org/standard/22412.html | MP3 フォーマットの ISO 規格 |

## 内部ドキュメント

文書ごとの責務と入口は [ルート README のドキュメント一覧](../README.md#ドキュメント) を参照。作業時は [AGENTS.md](../AGENTS.md) から該当文書へ進む。
