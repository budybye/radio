## 1. 図の一元化

- [x] 1.1 Create `docs/diagrams.md` with Mermaid: system topology, auth matrix, fork vs maintainer deploy, test pyramid, docs three-layer model; verify GitHub renders Mermaid
- [x] 1.2 Slim `docs/README.md`: remove duplicate ASCII diagram/code map; link to `diagrams.md`; verify document list complete
- [x] 1.3 Point `docs/design.md` architecture section to `diagrams.md`; verify ADRs unchanged

## 2. デプロイ・参照の統合

- [x] 2.1 Expand `docs/deploy-fork.md` (custom domain, fork `wrangler deploy` vs `bun run deploy`, pitfalls); verify Deploy button URL
- [x] 2.2 Trim `docs/tech.md` Workers deploy to link `deploy-fork.md`; verify Makefile/compose intact
- [x] 2.3 Update `docs/references.md` internal index (deploy-fork, openspec, patterns, diagrams)

## 3. ディレクトリ・要件

- [x] 3.1 Rewrite `docs/directory.md` tree (e2e, workers-ci, openspec, patterns, deploy-fork, diagrams); verify matches repo
- [x] 3.2 Sync `docs/requirements.md` Phase 3 completed items (bass-reflex, listeners, CI/E2E, fork deploy)
- [x] 3.3 Add `docs/diagrams.md` link to root `README.md` documentation section

## 4. OpenSpec archive

- [x] 4.1 `openspec validate --change upgrade-home-ui-bass-reflex` → PASS
- [x] 4.2 `openspec archive upgrade-home-ui-bass-reflex` → `openspec/specs/listener-home-ui/spec.md` exists
- [x] 4.3 `openspec archive sync-docs-with-openspec` → under `openspec/changes/archive/`
- [x] 4.4 Update `docs/openspec.md` with specs path and archive location

## 5. 検証

- [x] 5.1 `openspec validate --change consolidate-docs` → PASS
- [x] 5.2 Spot-check internal markdown links in `docs/README.md`
- [x] 5.3 `openspec list` shows only `consolidate-docs` active after §4 archives
