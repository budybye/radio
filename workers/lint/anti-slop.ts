/** Shared ignore list for `vp lint` / `vp fmt` (agent dirs + vendored plugin sources). */
export const lintIgnorePatterns = [
  ".agent/**",
  ".agents/**",
  ".claude/**",
  ".codex/**",
  ".continue/**",
  ".cursor/**",
  ".gemini/**",
  ".omp/**",
  ".opencode/**",
  ".pi/**",
  ".roo/**",
  ".windsurf/**",
  "tools/oxlint/anti-slop/**",
  "node_modules",
  "public",
  ".wrangler",
  "dist",
] as const;

/** Vendored Oxlint JS plugin (see workers/tools/oxlint/anti-slop/). */
export const antiSlopJsPlugins = [
  {
    name: "anti-slop",
    specifier: "./tools/oxlint/anti-slop/index.ts",
  },
] as const;

export const antiSlopRules = {
  "anti-slop/no-chained-type-assertions": "error",
  "anti-slop/no-conditional-empty-object-spread": "error",
  "anti-slop/no-known-value-widening": "error",
  "anti-slop/no-module-mocking": "error",
  "anti-slop/no-object-parameters": "error",
  "anti-slop/no-reflect-apply": "error",
  "anti-slop/no-reflect-get": "error",
  "anti-slop/no-runtime-typeof": "error",
  "anti-slop/no-shape-in-symbol-names": "error",
  "anti-slop/no-unknown-parameters": "error",
  "anti-slop/no-unknown-returns": "error",
  "anti-slop/no-unknown-type-aliases": "error",
  "anti-slop/no-unsafe-dictionary-type": "error",
  "anti-slop/no-widen-then-assert": "error",
  "anti-slop/require-safety-comment-for-type-assertion": "error",
} as const;

/** `vite.config.ts` → `lint` block consumed by `bun run lint` (`vp lint`). */
export const antiSlopLintConfig = {
  ignorePatterns: [...lintIgnorePatterns],
  jsPlugins: [...antiSlopJsPlugins],
  rules: {
    "eslint/no-unused-expressions": [
      "error",
      { allowTaggedTemplates: true },
    ],
    ...antiSlopRules,
  },
} as const;
