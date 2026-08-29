## Why

`refresh-docs-globe-e2e`（2026-08-29 archive 済み）で GlobeSpeaker・MPD データフロー図・E2E preview 分離は docs に反映されたが、**post-archive チェックリストが未完了**のまま残っている。加えて `bun run deploy` の `--config wrangler.jsonc` 修正・preview/prod の workers.dev 挙動・Agents SDK 経路など、実装と docs の乖離が点検で見つかっている。本 change は **docs/ の再監査・統合・図の補完・archive 後の正本固定** を行い、次の機能開発に docs 負債を残さない。

## What Changes

- **`docs/openspec.md`**: post-archive チェックリストを完了状態に更新。archive 例に `refresh-docs-globe-e2e` を追加
- **`docs/deploy-fork.md` + `docs/diagrams.md#deploy-flow`**: `bun run deploy` が `wrangler.jsonc` を明示指定すること、`vpr build` 後に `dist/radio/wrangler.json` だけでは production vars が落ちる落とし穴を追記
- **`docs/tech.md`**: Workers セクションを現行実装に同期（`use-mpd-agent.tsx`、リスナー数 SSR 二経路、Agents SDK リンク、`diagrams.md#mpd-home-data-flow` への委譲）
- **`docs/test.md`**: preview URL 表を `radio.*` / `radio-preview.*` で明確化。本番 deploy 後に `workers_dev: false` で preview URL が 404 になる旨を追記
- **`docs/README.md`**: graphify 参照の鮮度更新。deploy / Agents 経路の索引リンク整理
- **`docs/tasks.md`**: Phase 3 進捗と OpenSpec archive 完了を反映（マイルストーン表の整合）
- **`docs/problems.md`**: 解決済み項目と残課題の鮮度確認。deploy vars 落とし穴をリスク表に追記（任意）
- **`docs/directory.md`**: `workers/package.json` deploy スクリプト・`wrangler.jsonc` の説明を反映
- **`docs/references.md`**: Cloudflare Agents SDK へのリンク追加
- **ルート `README.md`**: メンテナ deploy 手順を `deploy-fork.md` と整合
- **OpenSpec archive**: 本 change 完了後 `openspec archive docs-post-archive-audit`

## Capabilities

### New Capabilities

（なし — 振る舞い要件の変更なし）

### Modified Capabilities

（なし — `skip_specs: true`）

## Impact

- **ドキュメントのみ**: `docs/*`, ルート `README.md`（deploy 節）
- **OpenSpec**: `openspec/changes/docs-post-archive-audit/` → archive
- **コード**: 変更なし（apply フェーズでも原則 docs のみ）
