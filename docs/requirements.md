# 要件定義

## プロジェクト概要

Docker + MPD（Music Player Daemon）+ Cloudflare Tunnel を組み合わせ、個人所有の音楽ファイルを不特定多数のリスナーに向けてインターネットラジオとして配信するシステム。開発中のプロジェクトで、将来的には複数ユーザーの同時接続や管理機能の拡張を見据えている。

## 機能要件

### Must Have

- [x] **音楽ストリーミング配信**: MPD の HTTP 出力で MP3（320kbps）ストリームを提供
- [x] **インターネット公開**: Cloudflare Tunnel を利用した安全な外部公開（ドメイン不要）
- [x] **プレイリスト管理**: mpc / ncmpcpp を使ったキュー・プレイリスト操作
- [x] **自動ライブラリ更新**: `auto_update yes` による music/ ディレクトリの自動監視
- [x] **常時配信**: `always_on yes` で停止中もリスナー接続を維持

### Should Have

- [ ] **複数ユーザー（リスナー）対応**: 同時接続リスナー数を現在の 10 名から拡張し、接続管理機能を追加
- [ ] **管理 UI（Web ベース）**: ブラウザからのプレイリスト操作・ステータス確認
- [ ] **エンコード品質切り替え**: ビットレート・フォーマットの動的変更（128kbps / 320kbps 等）

### Could Have

- [ ] **自動プレイリスト生成**: メタデータに基づくシャッフル・スマートプレイリスト
- [ ] **リスナー統計**: 接続数・視聴時間のログ収集
- [ ] **IRC / WebSocket 連携**: 現在再生中の曲情報を外部チャット等に連携

## 非機能要件

### パフォーマンス

- ストリーム遅延: クライアントバッファ依存（目標 5 秒以内）
- 同時接続: 現状 max_clients = 10、将来的なスケールを見据えた設計

### セキュリティ

- 公開エンドポイントは Cloudflare Tunnel 経由のみ（直接ポート公開なし）
- MPD 制御ポート（6600）は localhost のみ公開、外部からは到達不可
- 機密情報（TUNNEL_TOKEN）は `.env` 管理、ソースコードに含めない

### 可用性

- Docker Compose の `restart: unless-stopped` で自動復旧
- 音楽ファイルはボリュームマウントで永続化（music/ は read-only）
- MPD DB・ステートは named volume（mpd-data）で永続化

## 制約

- **ランタイム**: Alpine Linux 3.19 上の MPD（パッケージ版）— カスタムビルド不可
- **ミキサー**: コンテナ内にハードウェアミキサーが存在しないため `mixer_type none`、サーバ側音量調整不可
- **エンコーダー**: Alpine `mpd` パッケージ同梱の `lame` のみ使用可能
- **リバースプロキシ**: Cloudflare Tunnel のみ（自前 nginx/traefik 等は不要）

## 用語集

| 用語 | 定義 |
|------|------|
| MPD | Music Player Daemon — ヘッドレス音楽再生サーバー |
| MPC | Music Player Client — MPD のコマンドラインクライアント |
| ncmpcpp | NCurses Music Player Client (C++) — TUI ベースの高機能 MPD クライアント |
| Cloudflare Tunnel | ローカルサービスを安全にインターネット公開するツール（cloudflared） |
| HTTPD 出力 | MPD の `audio_output type "httpd"` — HTTP ストリーミング出力 |
