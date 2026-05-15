import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const LEDGER_PATH = resolve(process.cwd(), "docs/3d-runtime-migration-task.md");

/**
 * Loads one migration ledger markdown file for policy checks.
 * @param {string} filePath Absolute or cwd-relative markdown file path.
 * @returns {string} Raw markdown content.
 */
export function loadLedgerText(filePath = LEDGER_PATH) {
  return readFileSync(filePath, "utf8");
}

/**
 * Collects all unchecked task lines within one markdown section.
 * @param {string} markdown Full markdown source.
 * @param {string} sectionTitle Heading title without hashes.
 * @returns {string[]} Unchecked task lines found in the target section.
 */
export function collectUncheckedTasks(markdown, sectionTitle) {
  const section = extractSection(markdown, sectionTitle);
  if (!section) {
    return [];
  }
  return section
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- [ ] "));
}

/**
 * Collects all phase task-list headings from one ledger markdown document.
 * @param {string} markdown Full markdown source.
 * @returns {string[]} Phase task-list section titles (for example "Phase O Task List").
 */
export function collectPhaseTaskListTitles(markdown) {
  const matches = markdown.match(/^## Phase [A-Z] Task List\s*$/gm) ?? [];
  return matches.map((heading) => heading.replace(/^##\s+/, "").trim());
}

/**
 * Extracts one markdown section by heading title.
 * @param {string} markdown Full markdown source.
 * @param {string} sectionTitle Heading title without hashes.
 * @returns {string} Matched section body including heading or empty string when missing.
 */
export function extractSection(markdown, sectionTitle) {
  const headingPattern = new RegExp(
    `^## ${escapeRegExp(sectionTitle)}\\s*$`,
    "m",
  );
  const headingMatch = markdown.match(headingPattern);
  if (!headingMatch || headingMatch.index === undefined) {
    return "";
  }
  const startIndex = headingMatch.index;
  const nextHeadingMatch = markdown.slice(startIndex + 1).match(/^##\s+/m);
  if (!nextHeadingMatch || nextHeadingMatch.index === undefined) {
    return markdown.slice(startIndex);
  }
  return markdown.slice(startIndex, startIndex + 1 + nextHeadingMatch.index);
}

/**
 * Escapes regex metacharacters in literal text.
 * @param {string} value Raw text.
 * @returns {string} Escaped regex-safe text.
 */
export function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Validates the accepted-ledger invariants and returns all violations.
 * @param {string} markdown Full markdown source.
 * @returns {string[]} Human-readable validation errors.
 */
export function validateAcceptedLedger(markdown) {
  const errors = [];

  if (!markdown.includes("Status: Accepted")) {
    errors.push('Missing accepted status line: "Status: Accepted".');
  }

  if (markdown.includes("In Progress: Phase")) {
    errors.push("Found stale in-progress phase markers in accepted ledger.");
  }

  const phaseOTasksUnchecked = collectUncheckedTasks(
    markdown,
    "Phase O Task List",
  );
  if (phaseOTasksUnchecked.length > 0) {
    errors.push(
      `Phase O task list still has unchecked items: ${phaseOTasksUnchecked.join(" | ")}`,
    );
  }

  const acceptanceUnchecked = collectUncheckedTasks(
    markdown,
    "Final Acceptance Checklist",
  );
  if (acceptanceUnchecked.length > 0) {
    errors.push(
      `Final acceptance checklist has unchecked items: ${acceptanceUnchecked.join(" | ")}`,
    );
  }

  if (
    !markdown.includes(
      "Completed: Phase O final acceptance, regression closure, and ledger sign-off.",
    )
  ) {
    errors.push(
      "Missing Phase O completion evidence line in execution progress.",
    );
  }

  const phaseTaskListTitles = collectPhaseTaskListTitles(markdown);
  for (const taskListTitle of phaseTaskListTitles) {
    const uncheckedTasks = collectUncheckedTasks(markdown, taskListTitle);
    if (uncheckedTasks.length > 0) {
      errors.push(
        `${taskListTitle} has unchecked items: ${uncheckedTasks.join(" | ")}`,
      );
    }
  }

  return errors;
}

/**
 * Runs the migration-ledger guard and returns one process-like exit code.
 * @param {string} filePath Absolute or cwd-relative markdown file path.
 * @returns {number} Zero for success and one for failure.
 */
export function runGuard(filePath = LEDGER_PATH) {
  const ledgerText = loadLedgerText(filePath);
  const errors = validateAcceptedLedger(ledgerText);

  if (errors.length === 0) {
    console.log("migration-ledger-guard: OK");
    return 0;
  }

  console.error("migration-ledger-guard: FAILED");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  return 1;
}

/**
 * Resolves whether current execution context is the CLI entrypoint.
 * @returns {boolean} True when invoked directly by node runtime.
 */
export function isCliEntrypoint() {
  const scriptArg = process.argv[1];
  if (!scriptArg) {
    return false;
  }
  return import.meta.url === pathToFileURL(scriptArg).href;
}

if (isCliEntrypoint()) {
  process.exitCode = runGuard();
}
