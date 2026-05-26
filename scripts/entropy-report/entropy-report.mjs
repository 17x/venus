#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const outputPath = path.join(
  repoRoot,
  ".ai-tasks/entropy/entropy-dashboard.md",
);
const metricsOutputPath = path.join(
  repoRoot,
  ".ai-tasks/entropy/entropy-metrics.json",
);

const TARGET_ROOTS = [
  "apps/vector-editor-web/src",
  "packages/engine/src",
  "packages/lib/src",
  "packages/editor-primitive/src",
];

const FILE_PATTERN = /\.(ts|tsx|js|jsx|mts|cts|md)$/;

/**
 * Collects files recursively under a target root.
 * @param {string} relRoot Repository-relative root path.
 * @returns {string[]} Repository-relative file paths.
 */
function collectFiles(relRoot) {
  const absoluteRoot = path.join(repoRoot, relRoot);
  if (!fs.existsSync(absoluteRoot)) {
    return [];
  }

  const files = [];
  const stack = [absoluteRoot];

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === "dist") {
          continue;
        }
        stack.push(fullPath);
        continue;
      }
      if (!FILE_PATTERN.test(entry.name)) {
        continue;
      }
      files.push(path.relative(repoRoot, fullPath).replace(/\\/g, "/"));
    }
  }

  return files;
}

/**
 * Counts all matches of a regex in text.
 * @param {string} text Input content.
 * @param {RegExp} regex Global regex pattern.
 */
function countMatches(text, regex) {
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

/**
 * Returns line count using normalized newline semantics.
 * @param {string} text File content.
 */
function countLines(text) {
  if (text.length === 0) {
    return 0;
  }
  const normalized = text.replace(/\r\n/g, "\n");
  const newlineCount = (normalized.match(/\n/g) ?? []).length;
  return newlineCount + (normalized.endsWith("\n") ? 0 : 1);
}

/**
 * Builds entropy metrics and hotspot lists for report output.
 */
function buildEntropyMetrics() {
  const files = TARGET_ROOTS.flatMap((root) => collectFiles(root));

  let aiTempCount = 0;
  let govExceptionCount = 0;
  const softLimitFiles = [];
  const hardLimitFiles = [];
  const wrapperLikeNames = [];

  for (const relPath of files) {
    const absolutePath = path.join(repoRoot, relPath);
    const content = fs.readFileSync(absolutePath, "utf8");

    aiTempCount += countMatches(content, /AI-TEMP:/g);
    govExceptionCount += countMatches(content, /\[GOV-EXCEPTION\]/g);

    const lineCount = countLines(content);
    if (lineCount > 600) {
      hardLimitFiles.push({ relPath, lineCount });
    } else if (lineCount > 500) {
      softLimitFiles.push({ relPath, lineCount });
    }

    if (
      /(manager|helper|util|wrapper|facade)\.(ts|tsx|js|jsx|mts|cts)$/.test(
        relPath,
      )
    ) {
      wrapperLikeNames.push(relPath);
    }
  }

  hardLimitFiles.sort((a, b) => b.lineCount - a.lineCount);
  softLimitFiles.sort((a, b) => b.lineCount - a.lineCount);

  return {
    generatedAt: new Date().toISOString(),
    fileCount: files.length,
    aiTempCount,
    govExceptionCount,
    hardLimitFiles,
    softLimitFiles,
    wrapperLikeNames,
  };
}

/**
 * Renders entropy dashboard markdown from collected metrics.
 * @param {{generatedAt: string, fileCount: number, aiTempCount: number, govExceptionCount: number, hardLimitFiles: Array<{relPath: string, lineCount: number}>, softLimitFiles: Array<{relPath: string, lineCount: number}>, wrapperLikeNames: string[]}} metrics Entropy metrics payload.
 */
function renderDashboard(metrics) {
  const hardTop = metrics.hardLimitFiles.slice(0, 20);
  const softTop = metrics.softLimitFiles.slice(0, 20);
  const wrappersTop = metrics.wrapperLikeNames.slice(0, 30);

  const lines = [
    "# Entropy Dashboard",
    "",
    `Generated at: ${metrics.generatedAt}`,
    "",
    "## Summary",
    "",
    `- Files scanned: ${metrics.fileCount}`,
    `- AI-TEMP count: ${metrics.aiTempCount}`,
    `- GOV-EXCEPTION count: ${metrics.govExceptionCount}`,
    `- Hard-limit files (>600 lines): ${metrics.hardLimitFiles.length}`,
    `- Soft-limit files (501-600 lines): ${metrics.softLimitFiles.length}`,
    `- Wrapper-like filenames: ${metrics.wrapperLikeNames.length}`,
    "",
    "## Hard-limit Hotspots",
    "",
  ];

  if (hardTop.length === 0) {
    lines.push("- None");
  } else {
    for (const item of hardTop) {
      lines.push(`- ${item.lineCount} lines: ${item.relPath}`);
    }
  }

  lines.push("", "## Soft-limit Hotspots", "");
  if (softTop.length === 0) {
    lines.push("- None");
  } else {
    for (const item of softTop) {
      lines.push(`- ${item.lineCount} lines: ${item.relPath}`);
    }
  }

  lines.push("", "## Wrapper-like Filenames", "");
  if (wrappersTop.length === 0) {
    lines.push("- None");
  } else {
    for (const relPath of wrappersTop) {
      lines.push(`- ${relPath}`);
    }
  }

  lines.push(
    "",
    "## Recommended Actions",
    "",
    "1. Prioritize splitting hard-limit hotspots by ownership boundary.",
    "2. Reduce AI-TEMP entries by converting temporary branches to permanent contracts.",
    "3. Eliminate wrapper-like names unless authority/transform behavior is explicit.",
    "4. Track unresolved exceptions with expiry and closure owner.",
    "",
  );

  return lines.join("\n");
}

/**
 * Writes the entropy dashboard to .ai-tasks.
 */
function writeEntropyDashboard() {
  const metrics = buildEntropyMetrics();
  const dashboard = renderDashboard(metrics);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, dashboard, "utf8");
  fs.writeFileSync(metricsOutputPath, JSON.stringify(metrics, null, 2), "utf8");

  console.log(`[entropy-report] ok -> ${path.relative(repoRoot, outputPath)}`);
  console.log(
    `[entropy-report] metrics -> ${path.relative(repoRoot, metricsOutputPath)}`,
  );
  console.log(
    `[entropy-report] summary: hard=${metrics.hardLimitFiles.length}, soft=${metrics.softLimitFiles.length}, ai-temp=${metrics.aiTempCount}, exceptions=${metrics.govExceptionCount}`,
  );
}

writeEntropyDashboard();
