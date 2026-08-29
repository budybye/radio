## 1. OpenSpec spec delta

- [x] 1.1 Verify `openspec/changes/refresh-docs-globe-e2e/specs/listener-home-ui/spec.md` MODIFIED/REMOVED/ADDED blocks match implemented GlobeSpeaker behavior
- [x] 1.2 Run `openspec validate --change refresh-docs-globe-e2e` → PASS

## 2. diagrams.md — 図の追加

- [x] 2.1 Add `home-ui-layout` Mermaid: central GlobeSpeaker, now-playing panel, dock footer; link from `design.md` / `requirements.md`
- [x] 2.2 Add `e2e-preview-flow` Mermaid: deploy → http-smoke (Inertia shell) → opencli (hydrated LISTENERS + globe-speaker); link from `test.md`
- [x] 2.3 Update `test-pyramid` section — preview URL に `radio.*` と `radio-preview.*` を明記

## 3. docs 同期

- [x] 3.1 `docs/requirements.md`: Phase 3 table — GlobeSpeaker；preview E2E 一行追記
- [x] 3.2 `docs/openspec.md`: specs 表の listener-home-ui 説明を GlobeSpeaker に更新
- [x] 3.3 `docs/design.md`: Home UI / MPD データフローを GlobeSpeaker + 二経路に更新
- [x] 3.4 `docs/directory.md`: `GlobeSpeaker.tsx`, fixture 契約, `scripts/e2e/lib/contract.sh` を反映
- [x] 3.5 `docs/README.md`: 索引・読む順の鮮度確認；diagrams アンカーへリンク
- [x] 3.6 `docs/test.md`: preview URL 表と Inertia/opencli 分担の最終整合

## 4. 任意クリーンアップ

- [x] 4.1 Grep `bass-reflex` across repo — Home 参照なし（archive 履歴のみ）
- [x] 4.2 BassReflex CSS — N/A: Home 簡素化時に削除済み

## 5. Archive & 検証

- [x] 5.1 Spot-check internal markdown links in `docs/README.md` and `diagrams.md` anchors
- [ ] 5.2 `openspec archive refresh-docs-globe-e2e` → `openspec/specs/listener-home-ui/spec.md` updated
- [ ] 5.3 Confirm `openspec list` shows no active changes
- [ ] 5.4 Optional: `export RADIO_E2E_PREVIEW_URL=https://radio.<account>.workers.dev && make test-e2e-preview`
