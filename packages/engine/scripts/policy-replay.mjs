#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

/**
 * Intent: resolve CLI flag value by name from --name=value pattern.
 * @param name Flag name without prefix.
 * @returns Flag value or undefined.
 */
function resolveFlag(name) {
  const prefix = `--${name}=`;
  const match = process.argv.find((argument) => argument.startsWith(prefix));
  return match ? match.slice(prefix.length) : undefined;
}

/**
 * Intent: build deterministic replay key sequence from baseline snapshots.
 * @param report Baseline report payload.
 * @returns Replay sequence array.
 */
function resolveReplaySequence(report) {
  return (report.snapshots ?? []).map((snapshot) => {
    return [
      snapshot.frameIndex,
      snapshot.phase,
      snapshot.budgetPressure,
      snapshot.fallbackReason ?? "none",
      Number(snapshot.predictorConfidence ?? 0).toFixed(4),
    ].join("|");
  });
}

/**
 * Intent: compute deterministic checksum for replay sequence comparison.
 * @param sequence Replay sequence list.
 * @returns SHA-256 checksum string.
 */
function resolveChecksum(sequence) {
  return crypto.createHash("sha256").update(sequence.join("\n")).digest("hex");
}

/**
 * Intent: run policy replay sequence extraction from baseline report file.
 */
function main() {
  const reportPath = resolveFlag("report");
  if (!reportPath) {
    console.error("[policy:replay] FAIL: missing --report=<path> argument.");
    process.exit(1);
  }

  const absoluteReportPath = path.resolve(reportPath);
  if (!fs.existsSync(absoluteReportPath)) {
    console.error(
      `[policy:replay] FAIL: report file not found: ${absoluteReportPath}`,
    );
    process.exit(1);
  }

  const report = JSON.parse(fs.readFileSync(absoluteReportPath, "utf8"));
  const sequence = resolveReplaySequence(report);
  const checksum = resolveChecksum(sequence);

  const replayOutput = {
    scenario: report.run?.scenario ?? null,
    frameCount: sequence.length,
    checksum,
    sequence,
  };

  console.log(JSON.stringify(replayOutput, null, 2));
}

main();
