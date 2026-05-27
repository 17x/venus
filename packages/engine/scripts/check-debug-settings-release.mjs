#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const CREATE_ENGINE_FILE = "src/orchestration/api/createEngine.ts";

/**
 * Intent: enforce release-safe debug defaults in canonical engine create path.
 */
function main() {
  const absoluteFilePath = path.resolve(CREATE_ENGINE_FILE);
  if (!fs.existsSync(absoluteFilePath)) {
    console.error(
      `[debug:guard] FAIL: createEngine file missing: ${absoluteFilePath}`,
    );
    process.exit(1);
  }

  const source = fs.readFileSync(absoluteFilePath, "utf8");
  const hasForcedDebugEnable =
    source.includes("debug: true") || source.includes("debug = true");

  if (hasForcedDebugEnable) {
    console.error(
      "[debug:guard] FAIL: release defaults must not force debug mode on.",
    );
    process.exit(1);
  }

  console.log("[debug:guard] PASS: release defaults keep debug mode opt-in.");
}

main();
