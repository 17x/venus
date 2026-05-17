#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const SOFT_LIMIT = 400;
const HARD_LIMIT = 500;
const TS_FILE_PATTERN = /\.(ts|tsx|js|jsx|mts|cts)$/;

const ALLOWED_ROOTS = [
  "packages/engine/src/",
  "apps/vector-editor-web/src/",
  "packages/lib/src/",
  "packages/editor-primitive/src/",
];

/**
 * Resolves CLI options for guard execution.
 * @param {string[]} argv Raw process argv.
 */
function resolveOptions(argv) {
  const scopeIndex = argv.indexOf("--scope");
  const baseIndex = argv.indexOf("--base");
  return {
    changedOnly: argv.includes("--changed"),
    scope: scopeIndex >= 0 ? argv[scopeIndex + 1] : "all",
    baseRef: baseIndex >= 0 ? argv[baseIndex + 1] : "origin/main",
  };
}

/**
 * Resolves scope roots to enforce by policy target.
 * @param {'all' | 'engine' | 'vector' | 'lib' | 'primitive'} scope Selected policy scope.
 */
function resolveScopeRoots(scope) {
  if (scope === "engine") {
    return ["packages/engine/src/"];
  }

  if (scope === "vector") {
    return ["apps/vector-editor-web/src/"];
  }

  if (scope === "lib") {
    return ["packages/lib/src/"];
  }

  if (scope === "primitive") {
    return ["packages/editor-primitive/src/"];
  }

  return ALLOWED_ROOTS;
}

/**
 * Resolves whether a relative file path is policy-targeted.
 * @param {string} relPath Repository-relative path.
 * @param {string[]} roots Scope roots.
 */
function isTargetFile(relPath, roots) {
  if (!TS_FILE_PATTERN.test(relPath)) {
    return false;
  }

  return roots.some((root) => relPath.startsWith(root));
}

/**
 * Resolves repository-relative files changed from base.
 * @param {string} baseRef Git diff base ref.
 */
function resolveChangedFiles(baseRef) {
  const command = `git diff --name-only ${baseRef}...HEAD`;
  try {
    const output = execSync(command, {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    });
    return output
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    try {
      const fallbackOutput = execSync("git diff --name-only HEAD~1...HEAD", {
        cwd: repoRoot,
        stdio: ["ignore", "pipe", "ignore"],
        encoding: "utf8",
      });
      console.warn(
        `[file-shape:warn] base ref not available (${baseRef}); fallback to HEAD~1...HEAD`,
      );
      return fallbackOutput
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    } catch {
      console.warn(
        "[file-shape:warn] unable to resolve changed files; no files checked",
      );
      return [];
    }
  }
}

/**
 * Resolves all files recursively under allowed policy roots.
 * @param {string[]} roots Scope roots.
 */
function resolveAllScopeFiles(roots) {
  const files = [];
  for (const root of roots) {
    const absoluteRoot = path.join(repoRoot, root);
    if (!fs.existsSync(absoluteRoot)) {
      continue;
    }
    collectFiles(absoluteRoot, files);
  }

  return files.map((absPath) =>
    path.relative(repoRoot, absPath).replace(/\\/g, "/"),
  );
}

/**
 * Collects files recursively for one root directory.
 * @param {string} absoluteDir Absolute directory path.
 * @param {string[]} sink Result sink.
 */
function collectFiles(absoluteDir, sink) {
  const entries = fs.readdirSync(absoluteDir, { withFileTypes: true });
  for (const entry of entries) {
    const nextPath = path.join(absoluteDir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(nextPath, sink);
      continue;
    }

    if (TS_FILE_PATTERN.test(entry.name)) {
      sink.push(nextPath);
    }
  }
}

/**
 * Resolves line count for one repository file path.
 * @param {string} relPath Repository-relative path.
 */
function countFileLines(relPath) {
  const absolutePath = path.join(repoRoot, relPath);
  if (!fs.existsSync(absolutePath)) {
    return 0;
  }

  const text = fs.readFileSync(absolutePath, "utf8");
  if (text.length === 0) {
    return 0;
  }
  // Match wc -l semantics: count newline terminators so trailing newlines do
  // not inflate line counts by one and trigger false hard-limit failures.
  const normalizedText = text.replace(/\r\n/g, "\n");
  const newlineCount = (normalizedText.match(/\n/g) ?? []).length;
  return newlineCount + (normalizedText.endsWith("\n") ? 0 : 1);
}

/**
 * Runs file-shape guard and emits policy diagnostics.
 * @param {{changedOnly: boolean, scope: string, baseRef: string}} options Guard options.
 */
function runGuard(options) {
  const roots = resolveScopeRoots(options.scope);
  const candidateFiles = options.changedOnly
    ? resolveChangedFiles(options.baseRef)
    : resolveAllScopeFiles(roots);

  const files = candidateFiles
    .map((relPath) => relPath.replace(/\\/g, "/"))
    .filter((relPath) => isTargetFile(relPath, roots));

  const warnings = [];
  const errors = [];

  for (const relPath of files) {
    const lineCount = countFileLines(relPath);
    if (lineCount > HARD_LIMIT) {
      errors.push(`file-shape hard limit exceeded (${lineCount}): ${relPath}`);
      continue;
    }

    if (lineCount > SOFT_LIMIT) {
      warnings.push(
        `file-shape soft limit exceeded (${lineCount}): ${relPath}`,
      );
    }
  }

  for (const warning of warnings) {
    console.warn(`[file-shape:warn] ${warning}`);
  }

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`[file-shape:error] ${error}`);
    }
    return {
      ok: false,
      filesChecked: files.length,
      warnings: warnings.length,
      errors: errors.length,
    };
  }

  console.log(
    `[file-shape] ok (scope=${options.scope}, mode=${options.changedOnly ? "changed" : "all"}, files=${files.length}, warnings=${warnings.length})`,
  );
  return {
    ok: true,
    filesChecked: files.length,
    warnings: warnings.length,
    errors: 0,
  };
}

const options = resolveOptions(process.argv);
const result = runGuard(options);
if (!result.ok) {
  process.exit(1);
}
