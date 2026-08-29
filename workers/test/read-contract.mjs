#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const CONTRACT_PATH = join(ROOT, "fixtures", "mpd", "contract.json");

function isRecord(value) {
  return value !== null && Object(value) === value;
}

const contract = JSON.parse(await readFile(CONTRACT_PATH, "utf8"));
const path = process.argv[2];

if (!path) {
  process.stdout.write(JSON.stringify(contract, null, 2));
  process.exit(0);
}

let value = contract;
for (const segment of path.split(".")) {
  if (!isRecord(value)) {
    console.error(`contract path not found: ${path}`);
    process.exit(1);
  }
  value = value[segment];
}

if (value === undefined) {
  console.error(`contract path not found: ${path}`);
  process.exit(1);
}

if (isRecord(value)) {
  process.stdout.write(JSON.stringify(value));
} else {
  process.stdout.write(String(value));
}
