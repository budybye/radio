## 1. deploy ドキュメント同期

- [x] 1.1 `docs/deploy-fork.md`: `bun run deploy` / `deploy:preview` が `--config wrangler.jsonc` を使う旨と、`vpr build` 後の `dist/radio/wrangler.json` 落とし穴を追記 — `grep wrangler.jsonc deploy-fork.md` で 2 箇所以上ヒット
- [x] 1.2 `docs/diagrams.md#deploy-flow`: メンテナ deploy ノードに `--config wrangler.jsonc` を注記 — Mermaid 図または表に 1 行追加
- [x] 1.3 ルート `README.md` メンテナ deploy 節を `deploy-fork.md` と整合 — `bun run deploy` の説明が wrangler.jsonc 付きであること

## 2. MPD / Agents / E2E ドキュメント

- [x] 2.1 `docs/tech.md` Workers 節: `use-mpd-agent.ts` → `.tsx`、リスナー数 SSR（bridge 直叩き）vs CSR（DO push）の二経路を 1 表で追記 — `diagrams.md#mpd-home-data-flow` へリンク
- [x] 2.2 `docs/test.md`: `radio.*` vs `radio-preview.*` URL 表の最終整合。`env.production` deploy 後に workers.dev が 404 になる旨を追記
- [x] 2.3 `docs/references.md`: Cloudflare Agents SDK 公式リンクを追加 — `developers.cloudflare.com/agents` が表に存在

## 3. 索引・ディレクトリ・マイルストーン

- [x] 3.1 `docs/README.md`: graphify 固定 commit 参照を削除し「大きな Workers 変更後は `graphify update .`」に汎用化 — `6cdb419` が残っていないこと
- [x] 3.2 `docs/directory.md`: `workers/wrangler.jsonc` の env（default / production / preview）説明と deploy スクリプト行を反映
- [x] 3.3 `docs/tasks.md`: Phase 3 マイルストーンを `requirements.md` と整合（GlobeSpeaker・E2E ティア・フォーク Deploy 完了）
- [x] 3.4 `docs/problems.md`: deploy vars 落とし穴（vpr dist vs wrangler.jsonc）を技術的負債または既知課題表に 1 行追記

## 4. OpenSpec post-archive

- [x] 4.1 `docs/openspec.md`: post-archive チェックリスト 3 項目を `[x]` に更新。archive 例に `refresh-docs-globe-e2e` を追加
- [x] 4.2 Spot-check: `docs/README.md` から主要内部リンクが有効 — deploy-fork / diagrams / test / openspec
- [x] 4.3 `openspec validate --change docs-post-archive-audit` → PASS
- [ ] 4.4 `openspec archive docs-post-archive-audit` → `openspec list` が空

## 5. 任意

- [x] 5.1 `docs/patterns/agents-sdk.md` を新規作成するか判断 — **見送り**（`tech.md` + `diagrams.md#mpd-home-data-flow` で十分）
