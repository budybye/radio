# Anti-slop provenance

- Source repository: https://github.com/dmmulroy/anti-slop
- Resolved upstream commit: `c44ef22ca116d0ba62a3ff663a0bd13a3f3fa40b`.
- Resolved upstream tree: `6169796cdf8b45ceada340a5a0476dcc5cc6c7c0`.
- Copied source paths: upstream `src/index.ts`, `src/rules/`, `src/shared/`, and `src/vendor/`, excluding `.test.ts` files as prescribed by the upstream asset-sync script. Upstream `src/effect/` was intentionally not adopted.
- Local pre-update backup: `/var/folders/2v/gjb2vdq56d18kp155y_mgspc0000gn/T/tmp.udylyC8xfC/backup/`.

## Applied update

- Updated generic rules and shared helpers from upstream `src/rules/` and `src/shared/`.
- Added and enabled `no-array-filter-map` and `no-reduce-accumulator-copy`.
- Added and enabled `require-readable-spacing` with its vendored `vendor/eslint-stylistic` implementation (license and upstream provenance included). The first enablement pass fixed 270+ diagnostics across owned application files; vendored plugin sources remain lint-ignored.
- Adopted upstream fixes for type-alias resolution, function-parameter analysis, runtime `typeof` existence probes, borrowed member names, and related rule behavior.
- Enabled every generic rule from the requested install policy at `error`, including `oxc/no-accumulating-spread` and `anti-slop/require-readable-spacing`.
- Preserved the local `effect/` plugin files and did not register or update them because `effect` is not a direct package dependency in this repository. Upstream Effect changes remain intentionally deferred.
- Aligned direct `@oxlint/plugins` with the installed Oxlint version at exact version `1.81.0`.

## Intentional local policy

- The vendored generic source is ignored by the repository's lint and format scans; the registered plugin and configuration remain owned by this repository.
- The upstream package declares `@oxlint/plugins` `1.78.0`; the repository uses the resolved local Oxlint `1.81.0` pair instead.
- `anti-slop/require-readable-spacing` is registered in `index.ts` and enabled at `error` in `workers/lint/anti-slop.ts`.
- `workers/package.json` retains the repository's existing key order; only the exact `@oxlint/plugins` version changed.

## Verification

- Upstream `pnpm check`: passed at commit `c44ef22ca116d0ba62a3ff663a0bd13a3f3fa40b`.
- Target `bunx vp check --fix`: passed; formatted 80 files and linted 74 files.
- Target `bunx vp check`: passed; all 80 files formatted and no lint warnings/errors in 74 files.
- Target `bunx tsc --noEmit`: passed.
- Target `bun run test`: passed, 17 files / 72 tests.
- `git diff --check`: passed.
- Upstream RuleTester suite was not copied into the vendored target; upstream source and behavior were validated by the upstream `pnpm check` and target lint/typecheck/test commands.
