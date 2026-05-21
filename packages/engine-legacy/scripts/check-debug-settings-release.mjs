#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const DEBUG_SETTINGS_FILE = "src/settings/debug/debugSettings.ts";

/**
 * Intent: enforce release-safe debug settings defaults in source contract.
 */
function main() {
  const absoluteFilePath = path.resolve(DEBUG_SETTINGS_FILE);
  if (!fs.existsSync(absoluteFilePath)) {
    console.error(
      `[debug:guard] FAIL: debug settings file missing: ${absoluteFilePath}`,
    );
    process.exit(1);
  }

  const source = fs.readFileSync(absoluteFilePath, "utf8");
  const requiresDisabledOverlay = source.includes(
    "diagnosticsOverlayEnabled: false",
  );
  const requiresDisabledPolicyLogs = source.includes(
    "policyDecisionLogEnabled: false",
  );

  if (!requiresDisabledOverlay || !requiresDisabledPolicyLogs) {
    console.error(
      "[debug:guard] FAIL: release defaults must keep debug settings disabled.",
    );
    process.exit(1);
  }

  console.log(
    "[debug:guard] PASS: release defaults keep debug settings disabled.",
  );
}

main();
