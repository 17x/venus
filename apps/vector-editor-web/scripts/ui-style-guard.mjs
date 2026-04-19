import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const appRoot = process.cwd();
const srcRoot = path.join(appRoot, "src");
const allowedFoundationImporter = path
  .join("src", "ui", "index.ts")
  .split(path.sep)
  .join("/");
const allowedVarDir = path.join("src", "ui").split(path.sep).join("/");
const semanticClassTokenPattern =
  /vector-(?:shell|editor|prop|ui)-[A-Za-z0-9-]+/g;
const targetExtensions = new Set([".ts", ".tsx", ".css"]);

function walk(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }

    if (targetExtensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function relativeUnixPath(filePath) {
  return path.relative(appRoot, filePath).split(path.sep).join("/");
}

function collectLineNumbers(text, matcher) {
  const lines = text.split(/\r?\n/);
  const lineNumbers = [];

  for (let index = 0; index < lines.length; index += 1) {
    if (matcher.test(lines[index])) {
      lineNumbers.push(index + 1);
    }
    matcher.lastIndex = 0;
  }

  return lineNumbers;
}

function collectSemanticClassViolations(source) {
  const lines = source.split(/\r?\n/);
  const lineNumbers = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const matches = line.match(semanticClassTokenPattern);
    if (!matches) {
      continue;
    }

    const hasStyleToken = matches.some((match) => {
      if (match === "vector-ui-root") {
        return false;
      }
      if (match === "vector-editor-web") {
        return false;
      }
      return true;
    });

    if (hasStyleToken) {
      lineNumbers.push(index + 1);
    }
  }

  return lineNumbers;
}

function main() {
  const violations = [];
  const files = walk(srcRoot);

  for (const filePath of files) {
    const relativePath = relativeUnixPath(filePath);
    const source = fs.readFileSync(filePath, "utf8");

    const prefixViolations = collectLineNumbers(source, /venus-/g);
    if (prefixViolations.length > 0) {
      violations.push({
        file: relativePath,
        lines: prefixViolations,
        reason: "Found forbidden `venus-` prefix. Use `vector-` prefix only.",
      });
    }

    const foundationImportViolations = collectLineNumbers(
      source,
      /(?:import|@import)\s+["'][^"']*ui\/foundation\/(?:tokens|semantic)\.css["']/g,
    );

    if (
      foundationImportViolations.length > 0 &&
      relativePath !== allowedFoundationImporter
    ) {
      violations.push({
        file: relativePath,
        lines: foundationImportViolations,
        reason:
          "Do not import foundation token/semantic styles outside src/ui/index.ts.",
      });
    }

    const varUsageViolations = collectLineNumbers(source, /var\(--/g);
    if (
      varUsageViolations.length > 0 &&
      !relativePath.startsWith(`${allowedVarDir}/`)
    ) {
      violations.push({
        file: relativePath,
        lines: varUsageViolations,
        reason: "Use of `var(...)` is only allowed under src/ui.",
      });
    }

    const semanticClassViolations = collectSemanticClassViolations(source);
    if (
      semanticClassViolations.length > 0 &&
      !relativePath.startsWith(`${allowedVarDir}/`)
    ) {
      violations.push({
        file: relativePath,
        lines: semanticClassViolations,
        reason:
          "Do not consume src/ui semantic CSS classes outside src/ui. Use inline Tailwind or UI component APIs instead.",
      });
    }
  }

  if (violations.length === 0) {
    console.log("ui-style-guard: ok");
    return;
  }

  console.error("ui-style-guard: found style boundary violations");
  for (const violation of violations) {
    console.error(
      `- ${violation.file}:${violation.lines.join(",")} -> ${violation.reason}`,
    );
  }

  process.exit(1);
}

main();
