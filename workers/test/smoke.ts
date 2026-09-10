#!/usr/bin/env bun
/**
 * Deployed E2E HTTP smoke — tier guards + Inertia shell assertions.
 * Hydrated UI checks stay in scripts/e2e/opencli-home.sh (opencli).
 */
import { loadMpdFixtureContract } from "./fixtures/mpd/contract";
type E2ETier = "workers" | "prod";

function parseTier(raw: string | undefined): E2ETier {
  if (raw === "workers" || raw === undefined) {
    return "workers";
  }
  if (raw === "prod") {
    return "prod";
  }
  fail(`unknown RADIO_E2E_TIER=${raw} (use workers | prod)`);
}

function log(message: string): void {
  console.log(`[e2e] ${message}`);
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function resolveBaseUrl(tier: E2ETier): string {
  let base = process.env.RADIO_E2E_BASE_URL;

  if (!base) {
    if (tier === "workers") {
      base =
        process.env.RADIO_E2E_WORKERS_URL ??
        `https://radio.${process.env.CLOUDFLARE_ACCOUNT_SUBDOMAIN ?? "<account>"}.workers.dev`;
    } else {
      base = process.env.RADIO_E2E_PROD_URL;
    }
  }

  if (!base) {
    fail(
      tier === "prod"
        ? "Set RADIO_E2E_PROD_URL or RADIO_E2E_BASE_URL for prod tier"
        : "Set RADIO_E2E_WORKERS_URL=https://radio.<account>.workers.dev",
    );
  }

  return base.replace(/\/$/, "");
}

function guardTier(base: string, tier: E2ETier): E2ETier {

  if (tier === "prod") {
    if (process.env.RADIO_E2E_ALLOW_PROD !== "1") {
      fail(`Refusing prod E2E without RADIO_E2E_ALLOW_PROD=1 (base=${base})`);
    }
    if (process.env.RADIO_E2E_WRITE === "1") {
      fail("Refusing write-mode prod E2E (read-only smoke only)");
    }
  }

  if (tier === "workers" && !base.includes(".workers.dev")) {
    fail(`workers tier expects *.workers.dev base URL (got ${base})`);
  }

  process.env.RADIO_E2E_TIER = tier;
  process.env.RADIO_E2E_BASE_URL = base;
  return tier;
}

async function loadUiContract() {
  const { ui } = await loadMpdFixtureContract();
  if (!ui) fail("Fixture contract missing ui section");
  return ui;
}

function assertInertiaShell(html: string, titleFallback: string): void {
  if (!html.includes('"component":"Home"')) {
    fail("FAIL: Inertia shell missing Home component");
  }
  if (!html.includes('"listenerCount"')) {
    fail("FAIL: Inertia shell missing listenerCount prop");
  }
  if (!html.includes(titleFallback)) {
    fail(`FAIL: Inertia shell missing title fallback '${titleFallback}'`);
  }
  log("OK: Inertia shell markers (hydrated UI → opencli)");
}

async function httpSmoke(base: string, tier: E2ETier): Promise<void> {
  log(`tier=${tier} base=${base}`);

  const response = await fetch(`${base}/`);
  if (!response.ok) {
    fail(`FAIL: GET / returned HTTP ${response.status}`);
  }

  const html = await response.text();

  if (tier === "prod") {
    log("OK: prod tier HTTP 200 only (no HTML assertions)");
  } else {
    const ui = await loadUiContract();
    assertInertiaShell(html, ui.titleFallback);
  }

  log(`PASS: Home smoke (HTTP ${response.status}, tier=${tier})`);
}

const tier = parseTier(process.env.RADIO_E2E_TIER);
const base = resolveBaseUrl(tier);
guardTier(base, tier);
await httpSmoke(base, tier);
