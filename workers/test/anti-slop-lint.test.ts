import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const workersRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function runVpLint(paths: string[]) {
  return spawnSync("bunx", ["vp", "lint", ...paths], {
    cwd: workersRoot,
    encoding: "utf8",
  });
}

describe("anti-slop via bun run lint", () => {
  it("vp lint reports anti-slop rules from vite.config.ts", () => {
    const dir = mkdtempSync(join(tmpdir(), "radio-anti-slop-"));
    const file = join(dir, "violation.ts");
    writeFileSync(
      file,
      'export function bad(x: unknown) {\n  return typeof x === "string";\n}\n',
    );

    const result = runVpLint([file]);
    rmSync(dir, { recursive: true, force: true });

    const output = `${result.stdout}\n${result.stderr}`;
    expect(result.status).not.toBe(0);
    expect(output).toContain("anti-slop(no-runtime-typeof)");
  });

  it("bun run lint passes on app and worker sources", () => {
    const result = spawnSync("bun", ["run", "lint"], {
      cwd: workersRoot,
      encoding: "utf8",
    });

    const output = `${result.stdout}\n${result.stderr}`;
    expect(result.status, output).toBe(0);
  });
});
