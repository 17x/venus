import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

/**
 * Resolves the engine direction ledger source text from package-local ai directory.
 */
async function readEngineDirectionLedgerSource() {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const ledgerPath = path.resolve(
    currentDir,
    "../../ai/engine-direction-evolution-task-ledger-2026-05-23.md",
  );
  return fs.readFile(ledgerPath, "utf8");
}

/**
 * Resolves ordered execution-record ids from ledger markdown source.
 * @param ledgerSource Full ledger markdown source.
 */
function resolveExecutionRecordIds(ledgerSource) {
  const recordIdRegex = /^### ER-(\d+)/gm;
  const ids = [];
  let match = recordIdRegex.exec(ledgerSource);

  while (match) {
    const numericValue = Number(match[1]);
    if (Number.isInteger(numericValue)) {
      ids.push(numericValue);
    }
    match = recordIdRegex.exec(ledgerSource);
  }

  return ids;
}

/**
 * Resolves execution-record blocks keyed by ER id from ledger source.
 * @param ledgerSource Full ledger markdown source.
 */
function resolveExecutionRecordBlocks(ledgerSource) {
  const blocks = new Map();
  const segments = ledgerSource.split(/^### ER-(\d+)\s*$/gm);

  for (let index = 1; index < segments.length; index += 2) {
    const id = Number(segments[index]);
    const body = segments[index + 1] ?? "";
    if (Number.isInteger(id)) {
      blocks.set(id, body);
    }
  }

  return blocks;
}

/**
 * Verifies execution records remain sequential so backlog history stays auditable.
 */
test("engine direction ledger execution records stay sequential", async () => {
  const ledgerSource = await readEngineDirectionLedgerSource();
  const recordIds = resolveExecutionRecordIds(ledgerSource);

  assert.equal(recordIds.length > 0, true);
  for (let index = 0; index < recordIds.length; index += 1) {
    assert.equal(recordIds[index], index + 1);
  }
});

/**
 * Verifies every execution record keeps the mandatory tracking fields.
 */
test("engine direction ledger execution records keep required tracking fields", async () => {
  const ledgerSource = await readEngineDirectionLedgerSource();
  const recordBlocks = resolveExecutionRecordBlocks(ledgerSource);
  const requiredFieldMarkers = [
    "- Touched files:",
    "- Validation commands and result:",
    "- Risk notes:",
    "- Next task ID:",
  ];

  assert.equal(recordBlocks.size > 0, true);
  for (const [recordId, recordBody] of recordBlocks.entries()) {
    for (const marker of requiredFieldMarkers) {
      assert.equal(
        recordBody.includes(marker),
        true,
        `Execution record ER-${recordId} missing required marker: ${marker}`,
      );
    }
  }
});
