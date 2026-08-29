## 1. OpenSpec ワークフロー文書

- [x] 1.1 Create `docs/openspec.md` with: three-layer model (specs / changes / docs), propose→apply→archive flow, file ownership table, agent checklist, and commands (`openspec list`, `openspec status`, `openspec archive`); verify file exists and `docs/README.md` links to it
- [x] 1.2 Extend `docs/README.md` with an "OpenSpec" section in the reading-order table and document list; verify the new row points to `openspec.md`
- [x] 1.3 Add a "Documentation & OpenSpec" subsection to `AGENTS.md` (after Golden Rules) linking `docs/openspec.md` and stating: active work lives in `openspec/changes/`, behavior specs in `openspec/specs/`; verify link resolves

## 2. OpenSpec project context

- [x] 2.1 Populate `openspec/config.yaml` `context:` with tech stack (Docker MPD + Workers), Golden Rules summary, validation commands (`make test`, `cd workers && bun run build`), and doc index paths; verify `openspec instructions proposal --change sync-docs-with-openspec --json` includes the context block

## 3. Slim duplicate docs

- [x] 3.1 Refactor `docs/tasks.md`: keep Phase milestone table and long-term backlog; remove or shorten "現在のフォーカス" items that duplicate active changes; add section "アクティブ作業は OpenSpec" with `openspec list` command; verify no broken internal links
- [x] 3.2 Update `docs/requirements.md` intro: add note that detailed behavioral requirements live in `openspec/specs/` (link when populated) and active deltas in `openspec/changes/`; keep Phase progress summary; verify requirements.md still renders valid markdown tables
- [x] 3.3 Add cross-reference in `docs/design.md` (top or ADR section): system architecture remains here; change-scoped design lives in `openspec/changes/<name>/design.md` until archived; verify one-line pointer exists

## 4. First spec baseline (documented procedure)

- [x] 4.1 In `docs/openspec.md`, document the archive procedure for `upgrade-home-ui-bass-reflex`: run `openspec validate --change upgrade-home-ui-bass-reflex`, complete implementation, `openspec archive upgrade-home-ui-bass-reflex`, then update `docs/requirements.md` Phase 3 progress; verify procedure is step-numbered
- [x] 4.2 Add post-archive sync checklist to `docs/openspec.md`: update `docs/problems.md` if issues resolved, update `docs/tasks.md` milestones, run `graphify update .` if Workers structure changed; verify checklist has at least 3 items

## 5. Code pattern templates (added)

- [x] 5.1 Create `docs/patterns/README.md` and `docs/patterns/better-result.md` documenting reusable Result/HTTP/form boundaries
- [x] 5.2 Implement `workers/app/lib/radio/mpd-http.ts` and `workers/app/lib/validation/form-errors.ts` templates with unit tests

## 6. Validation

- [x] 6.1 Run `openspec validate --change sync-docs-with-openspec` and verify PASS
- [x] 6.2 Manually verify all new internal links from `docs/README.md`, `AGENTS.md`, and `docs/openspec.md` resolve to existing files
