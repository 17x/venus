import assert from "node:assert/strict";
import test from "node:test";

import {
  collectUncheckedTasks,
  extractSection,
  validateAcceptedLedger,
} from "./migration-ledger-guard.mjs";

/**
 * Returns one minimal accepted-ledger markdown fixture.
 * @returns {string} Markdown fixture representing an accepted ledger.
 */
function createAcceptedLedgerFixture() {
  return [
    "# Ledger",
    "Status: Accepted",
    "",
    "## Execution Progress",
    "- Completed: Phase O final acceptance, regression closure, and ledger sign-off.",
    "",
    "## Phase O Task List",
    "- [x] O1: done",
    "- [x] O2: done",
    "- [x] O3: done",
    "",
    "## Final Acceptance Checklist",
    "- [x] acceptance one",
    "- [x] acceptance two",
  ].join("\n");
}

/**
 * Creates one ledger fixture with one targeted mutation for failure-case tests.
 * @param {(lines: string[]) => void} applyMutation Mutation callback that can edit line array in place.
 * @returns {string} Mutated markdown fixture.
 */
function createMutatedLedgerFixture(applyMutation) {
  const lines = createAcceptedLedgerFixture().split("\n");
  applyMutation(lines);
  return lines.join("\n");
}

test("extractSection returns target section content", () => {
  const markdown = createAcceptedLedgerFixture();
  const section = extractSection(markdown, "Phase O Task List");

  assert.ok(section.includes("## Phase O Task List"));
  assert.ok(section.includes("- [x] O1: done"));
});

test("collectUncheckedTasks returns unchecked lines only", () => {
  const markdown = [
    "## Phase O Task List",
    "- [x] O1: done",
    "- [ ] O2: pending",
    "- [ ] O3: pending",
  ].join("\n");

  const unchecked = collectUncheckedTasks(markdown, "Phase O Task List");

  assert.equal(unchecked.length, 2);
  assert.equal(unchecked[0], "- [ ] O2: pending");
  assert.equal(unchecked[1], "- [ ] O3: pending");
});

test("validateAcceptedLedger passes for accepted fixture", () => {
  const markdown = createAcceptedLedgerFixture();
  const errors = validateAcceptedLedger(markdown);

  assert.equal(errors.length, 0);
});

test("validateAcceptedLedger fails when status is not accepted", () => {
  const markdown = createMutatedLedgerFixture((lines) => {
    lines[1] = "Status: Active";
  });
  const errors = validateAcceptedLedger(markdown);

  assert.ok(errors.some((error) => error.includes("Status: Accepted")));
});

test("validateAcceptedLedger fails on stale in-progress marker", () => {
  const markdown = createMutatedLedgerFixture((lines) => {
    lines.splice(4, 0, "- In Progress: Phase Z");
  });
  const errors = validateAcceptedLedger(markdown);

  assert.ok(
    errors.some((error) => error.includes("in-progress phase markers")),
  );
});

test("validateAcceptedLedger fails on unchecked acceptance checklist", () => {
  const markdown = createMutatedLedgerFixture((lines) => {
    const index = lines.findIndex((line) => line.includes("acceptance one"));
    lines[index] = "- [ ] acceptance one";
  });
  const errors = validateAcceptedLedger(markdown);

  assert.ok(
    errors.some((error) => error.includes("Final acceptance checklist")),
  );
});
