# 既知の問題と懸念

## 未解決の技術的課題

| ID | 問題 | 影響 | 対応計画 | 担当 |
|----|------|------|----------|------|
| P-001 | ~~ncmpcpp の動作確認未完了~~ | — | ✅ 解決済み。`make ncmpcpp` で TUI の表示・操作が正常に機能することを確認済み | — |
| P-002 | `mixer_type none` によるサーバ側音量調整不可 | 低 | クライアント側（VLC / ブラウザ）での音量調整を推奨する運用ドキュメントを整備 | 未設定 |
| P-003 | MPD HTTPD 出力の `max_clients = 20` 制限 | 高（将来） | 同時接続リスナーが 20 を超える場合、新規接続が拒否される。Phase 2 で Icecast リレーまたは nginx 等のストリームリバースプロキシを MPD 前段に配置して対応を検討 | 未設定 |
| P-004 | ~~mpc サブドメインが認証なし公開~~ | — | ✅ 解決済み。Cloudflare Access（Service Auth + Block）+ Worker Service Token ヘッダ | — |

## 既知の不具合と制限

### ncmpcpp の動作状況

- **状況**: ✅ 動作確認済み。`make ncmpcpp` で TUI が正常に起動する
- **修正履歴**: `config/config` から非サポートオプション（`volume_normalization`、`visualizer_sync_interval`）を削除し、起動エラーを解決

### 音量制御の制約

- `mixer_type none` を設定しているため、`mpc volume` コマンドは無効
- 音楽ファイルの音量差が大きい場合、聴取時にクライアント側で都度調整が必要
- `replaygain` タグを付与済みのファイルでは、MPD の `replaygain` 設定で自動正規化が可能（要検証）

### ストリーミングの同期制約

- MPD の HTTPD 出力は「同期的」に動作 — 各リスナーに同じバイト列を同時に配信する形ではなく、リスナーが接続したタイミングからのストリームを個別に提供
- これは「ライブラジオ」としては問題ないが、リスナー数が増えると MPD プロセスの負荷が線形に増加

### ブラウザ再生での途切れ

- **症状**: ブラウザ（Chrome / Firefox / Safari）の `<audio>` タグで直接再生すると、数分〜数十分後に音が途切れる。リロードで復旧
- **原因**: ブラウザの `<audio>` タグはライブストリーム向けに設計されていない。バッファ管理・省電力モード・バックグラウンド動作などにより接続が切断される
- **対処**: VLC、AIMP、foobar2000 などの専用プレイヤーアプリを使用。または Icecast リレーを MPD 前段に配置（Phase 2 で検討）

### デプロイ時の落とし穴

| 問題 | 対処の正本 |
|------|------------|
| `radio-production.*` が作成される | 常に Worker 名 `radio` を使う [`maintenance.md#deploy-targets`](maintenance.md#deploy-targets) |
| `MPD_HOST` / `MPC_HOST` が未設定 | `workers/.env` に両ホスト名を設定する [`maintenance.md#env-files`](maintenance.md#env-files) |
| カスタムドメインの deploy に失敗する | 既存 CNAME と Cloudflare アカウントを確認する [`maintenance.md#deploy-targets`](maintenance.md#deploy-targets) |
| `/openapi.json` がカスタムドメインで見えない | カスタムドメインでは意図的に 404。公開範囲は [`pattern.md`](pattern.md) の OpenAPI パターンを参照 |

## 技術的負債

| 負債 | 影響 | 返済計画 |
|------|------|----------|
| `cloudflared:latest` タグの使用 | 再現性が低下（予期しないバージョン変更） | `compose.yaml` で固定バージョン（例: `2026.3.0`）に変更し、更新時に意図的にバージョンアップする |
| `max_clients` ハードコーディング | スケール時の設定変更漏れリスク | `mpd.conf` の `max_clients` を環境変数またはビルド引数で外部化する |
| deploy 設定の取り違え | ソースの `wrangler.jsonc` を直接 deploy するとビルド済み bundle / assets を使わない | `bun run deploy` でビルド後の `dist/radio/wrangler.json` を deploy する。詳細: [maintenance.md#deploy-pitfall](maintenance.md#deploy-pitfall) |
| ヘルスチェック未設定 | ~~Tunnel が MPD 準備完了前に起動~~ | ✅ `compose.yaml` に mpd / mpc-bridge healthcheck + `depends_on: service_healthy` 済み |

## リスク登録

| リスク | 発生確率 | 影響 | 対策 |
|--------|----------|------|------|
| Cloudflare Tunnel 接続断 | 低 | 高（公開不可） | `restart: unless-stopped` で自動復旧。監視通知は未設定（将来対応） |
| 音楽ファイルの著作権問題 | 中 | 高（法的） | 配信する音楽は自己所有・著作権フリーのみに限定。公開範囲の再検討が必要な場合あり |
| Alpine パッケージの非互換更新 | 低 | 中（ビルド失敗） | `Dockerfile` で `alpine:3.20` を固定。Alpine メジャーバージョンアップ時は `mpd` パッケージの互換性を確認 |
| MPD DB 破損 | 低 | 中（ライブラリ消失） | named volume（`mpd-data`）のバックアップ手順を確立。DB の保存先は `/var/lib/mpd/database` |
| 帯域圧迫（大量同時接続） | 低（現状） / 高（将来） | 高 | 現状 `max_clients: 20` で制限。将来 Icecast リレー or CDN 配信への移行を検討 |

## 調査中

- [ ] 開発サーバーで `GET /og.png` が HTTP 500（レスポンス本文は `Internal Server Error` のみ。原因未特定、本番未確認）
- [ ] `/og.png` の配色が Home の navy/mint テーマと未整合（[`workers/app/server/index.tsx`](../workers/app/server/index.tsx) の ImageResponse は legacy amber/gray のまま）
- [ ] ncmpcpp の ncurses 互換性（Alpine 3.20 + ホストのターミナルエミュレータ依存）
- [ ] MPD の `replaygain` 機能が HTTPD 出力に適用されるか
- [ ] Cloudflare Tunnel の無料プラン帯域制限と、ストリーミング配信への影響
- [ ] ブラウザ `<audio>` タグでストリーム再生中に途切れる問題の再現性確認
