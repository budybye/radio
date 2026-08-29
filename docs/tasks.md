# タスク管理

## マイルストーン

| フェーズ | 目標 | 期限 | 状態 |
|----------|------|------|------|
| Phase 0: 環境構築 | Docker + MPD + Tunnel の基本構成を構築し、ローカルでストリーミング確認 | — | ✅ 完了 |
| Phase 1: 動作確認 | ncmpcpp / mpc からの操作、Cloudflare Tunnel 経由での外部接続、タグ情報伝送を検証 | — | 🔄 進行中 |
| Phase 2: 複数ユーザー対応 | 同時接続リスナー数の拡張、接続管理、リスナー統計の収集基盤 | TBD | ⏳ 未開始 |
| Phase 3: 管理 UI | Web ベースのプレイリスト操作・ステータス表示・リスナー数モニタリング | TBD | 🔄 進行中 — 詳細は [requirements.md](requirements.md#phase-3-管理-ui進行中) |

## アクティブ作業は OpenSpec

進行中の実装タスク・チェックリストは **`docs/tasks.md` ではなく OpenSpec** を正本とする。

```bash
openspec list
openspec status --change <name>
```

手順は [openspec.md](openspec.md) を参照。

## 現在のフォーカス（インフラ・検証）

- [x] ncmpcpp の正常動作確認（コンテナ内 TUI 操作）
- [ ] 外部クライアント（MPod / MPad / MPDroid）からの接続確認
- [ ] 長時間配信時のメモリ・CPU 使用状況の観測
- [ ] `max_clients` を超えた接続時の挙動確認とエラーハンドリング

## バックログ

### 高優先度

- [ ] **同時接続数の拡張設計**: MPD HTTPD 出力の max_clients 上限突破のため Icecast リレーまたはリバースプロキシ検討
- [ ] **ヘルスチェック追加**: ~~`compose.yaml` に MPD サービスの `healthcheck` を定義~~ ✅ 完了
- [ ] **音量制御の代替策**: `mixer_type none` によるサーバ側音量調整不可の代替（クライアント側ガイド or リプレイゲイン設定）

### 中優先度

- [x] **自動プレイリスト化**: `scripts/entrypoint.sh` で MPD 起動後に空キューを自動検出 → `mpc ls | mpc add` → `mpc play`（2024-??）
- [x] **Web UI（Workers）**: `workers/` に Vite + Hono + MpdAgent DO。`/posts` でキュー CRUD、Basic/Bearer 認証
- [x] **GitHub Actions CI**: `.github/workflows/build.yaml`（GHCR マルチアーキビルド）と `tag.yaml`（自動タグ付け・リリース）を設定
- [ ] `.env.example` の充実化: オプション設定（ビットレート変更、max_clients 調整）のコメント追加

### 低優先度

- [ ] **統計収集**: リスナー接続数・視聴時間のログ収集（MPD の `sticker` 機能 or 外部スクリプト）
- [ ] **IRC / WebSocket 連携**: 現在再生中の曲情報を外部サービスへ通知
- [ ] **マルチビットレート対応**: 同時に複数のビットレートストリームを提供（128kbps / 320kbps）
- [ ] **カバーアート配信**: HTTP エンドポイントでアルバムアートを提供

## 完了済み

- [x] Alpine Linux + MPD の Docker コンテナ構築（2024-??）
- [x] Cloudflare Tunnel との連携構成（2024-??）
- [x] `config/mpd.conf` の最適化（always_on, tags, auto_update）（2024-??）
- [x] `scripts/entrypoint.sh` による起動時自動キュー追加 + ランダム再生（2024-??）
- [x] `config/config` の非サポートオプション削除（`volume_normalization`、`visualizer_sync_interval`）
- [x] `Makefile` の `mpc ls music` → `mpc ls` 修正
- [x] `scripts/test.sh` の `mpd --test` → `mpc status` 修正、算術式バグ修正、ポートチェック方法更新
- [x] `config/mpd.conf` の `log_file` 削除、`zeroconf_enabled "no"` 追加
- [x] `Makefile` に `make random` / `make sequential` 追加
- [x] `compose.yaml` の `devices: /dev/snd` 削除
