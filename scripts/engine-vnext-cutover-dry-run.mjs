import {
  mkdtempSync,
  mkdirSync,
  renameSync,
  rmSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Builds one temporary workspace that simulates canonical and vNext engine folders.
 * @returns Absolute path to the temporary rehearsal root.
 */
function createRehearsalWorkspace() {
  const rehearsalRoot = mkdtempSync(join(tmpdir(), "venus-engine-cutover-"));
  mkdirSync(join(rehearsalRoot, "packages", "engine"), { recursive: true });
  mkdirSync(join(rehearsalRoot, "packages", "_vnext", "engine"), {
    recursive: true,
  });
  writeFileSync(
    join(rehearsalRoot, "packages", "engine", "marker.txt"),
    "canonical",
  );
  writeFileSync(
    join(rehearsalRoot, "packages", "_vnext", "engine", "marker.txt"),
    "vnext",
  );
  return rehearsalRoot;
}

/**
 * Executes one folder-level cutover rehearsal and validates rename invariants.
 * @param rehearsalRoot Temporary rehearsal root.
 */
function runCutoverRehearsal(rehearsalRoot) {
  const canonicalPath = join(rehearsalRoot, "packages", "engine");
  const vnextPath = join(rehearsalRoot, "packages", "_vnext", "engine");
  const archivePath = join(rehearsalRoot, "archive", "engine-pre-cutover");

  mkdirSync(join(rehearsalRoot, "archive"), { recursive: true });

  // Step 1: archive canonical engine path.
  renameSync(canonicalPath, archivePath);
  // Step 2: promote vNext path into canonical slot.
  renameSync(vnextPath, canonicalPath);

  if (!existsSync(canonicalPath)) {
    throw new Error(
      "cutover rehearsal failed: canonical path missing after promote",
    );
  }
  if (!existsSync(archivePath)) {
    throw new Error(
      "cutover rehearsal failed: archive path missing after archive move",
    );
  }

  // Step 3: rollback rehearsal back to original folder layout.
  renameSync(canonicalPath, vnextPath);
  renameSync(archivePath, canonicalPath);

  if (!existsSync(canonicalPath) || !existsSync(vnextPath)) {
    throw new Error(
      "cutover rehearsal rollback failed: expected paths were not restored",
    );
  }
}

/**
 * Runs the dry-run rehearsal and reports one concise pass/fail status.
 */
function main() {
  const rehearsalRoot = createRehearsalWorkspace();
  try {
    runCutoverRehearsal(rehearsalRoot);
    console.log("CUTOVER_DRY_RUN_PASS", rehearsalRoot);
  } finally {
    rmSync(rehearsalRoot, { recursive: true, force: true });
  }
}

main();
