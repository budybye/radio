## 1. OpenSpec spec delta

- [x] 1.1 Verify `openspec/changes/refresh-docs-globe-e2e/specs/listener-home-ui/spec.md` MODIFIED/REMOVED/ADDED blocks match implemented GlobeSpeaker behavior
- [ ] 1.2 Run `openspec validate --change refresh-docs-globe-e2e` → PASS

## 2. diagrams.md — 図の追加

- [ ] 2.1 Add `home-ui-layout` Mermaid: central GlobeSpeaker, now-playing panel, dock footer; link from `design.md` / `requirements.md`
- [ ] 2.2 Add `e2e-preview-flow` Mermaid: deploy → http-smoke (Inertia shell) → opencli (hydrated LISTENERS + globe-speaker); link from `test.md`
- [ ] 2.3 Update `test-pyramid` section if preview URL examples still say only `radio-preview.*`

## 3. docs 同期

- [x] 3.1 `docs/requirements.md`: Phase 3 table —「バスレフ UI」→ GlobeSpeaker；preview E2E 一行追記
- [x] 3.2 `docs/openspec.md`: specs 表の listener-home-ui 説明を GlobeSpeaker に更新；post-archive チェックリスト進捗
- [x] 3.3 `docs/design.md`: Home UI モジュール記述を GlobeSpeaker に；bass-reflex 参照削除
- [x] 3.4 `docs/directory.md`: `GlobeSpeaker.tsx`, `workers/test/fixtures/mpd/contract.json`, `scripts/e2e/lib/contract.sh` を反映
- [ ] 3.5 `docs/README.md`: 索引・読む順の鮮度確認；重複があれば `diagrams.md` / `test.md` へリンク化
- [ ] 3.6 `docs/test.md`: preview URL 表（`radio.*` vs `radio-preview.*`）と Inertia/opencli 分担の最終整合（既更新分を含む spot-check）

## 4. 任意クリーンアップ

- [x] 4.1 Grep `bass-reflex` across repo；docs/openspec 以外に Home 参照がなければ `BassReflexSpeaker.tsx` と未使用 `bass-reflex-*` CSS を削除
- [x] 4.2 If kept for reference, add one-line comment in `style.css` that bass-reflex utilities are legacy (not used by Home) — N/A: CSS already removed with Home simplification

## 5. Archive & 検証

- [ ] 5.1 Spot-check internal markdown links in `docs/README.md` and new `diagrams.md` anchors
- [ ] 5.2 `openspec archive refresh-docs-globe-e2e` → `openspec/specs/listener-home-ui/spec.md` updated
- [ ] 5.3 Confirm `openspec list` shows no active changes
- [ ] 5.4 Optional: `export RADIO_E2E_PREVIEW_URL=https://radio.<account>.workers.dev && make test-e2e-preview`
