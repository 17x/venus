#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const SCOPE_ARG = process.argv.includes("--scope")
  ? process.argv[process.argv.indexOf("--scope") + 1]
  : "all";

const RUNTIME_ROOT = path.join(repoRoot, "apps/vector-editor-web/src/runtime");
const VECTOR_SRC_ROOT = path.join(repoRoot, "apps/vector-editor-web/src");
const LIB_ROOT = path.join(repoRoot, "packages/lib/src");
const PRIMITIVE_ROOT = path.join(repoRoot, "packages/editor-primitive/src");

const SOFT_FILE_LINE_LIMIT = 500;
const HARD_FILE_LINE_LIMIT = 600;

const ALLOWED_RUNTIME_TOP_LEVEL_DIRS = new Set([
  "__tests__",
  "adapters",
  "chrome",
  "commands",
  "core",
  "cursor",
  "editing-modes",
  "engine-bridge",
  "events",
  "hittest",
  "interaction",
  "model",
  "overlay",
  "presets",
  "preview",
  "primitive",
  "protocol",
  "render-prep",
  "shared-memory",
  "shell",
  "subscriptions",
  "templatePresets",
  "tools",
  "types",
  "viewport",
  "worker",
  "zoom",
]);

const RUNTIME_FOUNDATION_FORBIDDEN_TARGETS = new Set([
  "core",
  "engine-bridge",
  "events",
  "interaction",
  "overlay",
  "preview",
  "protocol",
  "render-prep",
  "shell",
  "tools",
  "cursor",
  "editing-modes",
  "chrome",
]);

// AI-TEMP: model patch planner temporarily imports worker history patch type;
// remove when patch contract moves to runtime types module; ref apps/vector-editor-web/docs/current-work.md
const RUNTIME_EDGE_EXCEPTIONS = new Set([
  "model/document-runtime/normalizedHistoryPatches.ts=>worker/history.ts",
]);

const HARD_LIMIT_EXCEPTIONS = new Set([]);

const VECTOR_SOFT_LIMIT_EXCEPTIONS = new Set([]);

const VECTOR_STEM_FAMILY_EXCEPTIONS = new Set([]);

const ALLOWED_VECTOR_TOP_LEVEL_DIRS = new Set([
  "app",
  "assets",
  "i18n",
  "product",
  "runtime",
  "testing",
  "ui",
  "views",
]);

function toPosix(filePath) {
  return filePath.replace(/\\/g, "/");
}

function walkTsFiles(rootDir) {
  const files = [];
  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "dist" || entry.name === "node_modules") {
          continue;
        }
        stack.push(full);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(entry.name)) {
        continue;
      }
      files.push(full);
    }
  }
  return files;
}

function readFile(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function extractRelativeImports(content) {
  const imports = [];
  const fromRegex = /from\s+['"]([^'"]+)['"]/g;
  let match = fromRegex.exec(content);
  while (match) {
    imports.push(match[1]);
    match = fromRegex.exec(content);
  }
  const dynamicRegex = /import\(\s*['"]([^'"]+)['"]\s*\)/g;
  match = dynamicRegex.exec(content);
  while (match) {
    imports.push(match[1]);
    match = dynamicRegex.exec(content);
  }
  return imports.filter((specifier) => specifier.startsWith("."));
}

function resolveRuntimeModule(relFilePath) {
  const segments = relFilePath.split("/");
  return segments.length > 1 ? segments[0] : "_root";
}

function resolveVectorTopLevelModule(relFilePath) {
  const segments = relFilePath.split("/");
  return segments.length > 1 ? segments[0] : "_root";
}

function checkVectorFolderGovernance(issues) {
  const entries = fs.readdirSync(VECTOR_SRC_ROOT, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    if (!ALLOWED_VECTOR_TOP_LEVEL_DIRS.has(entry.name)) {
      issues.push(`vector src unknown top-level folder: ${entry.name}`);
    }
  }
}

function resolveRelativeImportTarget(filePath, specifier) {
  const baseResolved = path.resolve(path.dirname(filePath), specifier);
  const candidates = [
    baseResolved,
    `${baseResolved}.ts`,
    `${baseResolved}.tsx`,
    `${baseResolved}.d.ts`,
    path.join(baseResolved, "index.ts"),
    path.join(baseResolved, "index.tsx"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return baseResolved;
}

function checkVectorLayerOneWayGovernance(issues) {
  const files = walkTsFiles(VECTOR_SRC_ROOT);
  for (const file of files) {
    const relFrom = toPosix(path.relative(VECTOR_SRC_ROOT, file));
    const fromTop = resolveVectorTopLevelModule(relFrom);
    const content = readFile(file);
    const imports = extractRelativeImports(content);
    for (const specifier of imports) {
      const resolved = resolveRelativeImportTarget(file, specifier);
      if (!resolved.startsWith(VECTOR_SRC_ROOT)) {
        continue;
      }
      const relTo = toPosix(path.relative(VECTOR_SRC_ROOT, resolved));
      const toTop = resolveVectorTopLevelModule(relTo);
      if (
        fromTop === "runtime" &&
        ["app", "product", "views", "ui", "testing"].includes(toTop)
      ) {
        issues.push(`vector runtime one-way violation: ${relFrom}=>${relTo}`);
      }
      if (
        fromTop === "ui" &&
        ["app", "product", "views", "runtime", "testing"].includes(toTop)
      ) {
        issues.push(`vector ui one-way violation: ${relFrom}=>${relTo}`);
      }
      if (fromTop === "views" && toTop === "app") {
        issues.push(`vector views one-way violation: ${relFrom}=>${relTo}`);
      }
      if (fromTop === "product" && toTop === "app") {
        issues.push(`vector product one-way violation: ${relFrom}=>${relTo}`);
      }
      if (fromTop === "app" && toTop === "product") {
        issues.push(`vector app one-way violation: ${relFrom}=>${relTo}`);
      }
    }
  }
}

function resolveFamilyStem(fileName) {
  return fileName
    .replace(/\.d\.ts$/, "")
    .replace(/\.(test|spec)\.tsx?$/, "")
    .replace(/\.tsx?$/, "");
}

function checkVectorStemFamilyFolderGovernance(issues) {
  const files = walkTsFiles(VECTOR_SRC_ROOT);
  const familyGroups = new Map();
  for (const file of files) {
    const rel = toPosix(path.relative(VECTOR_SRC_ROOT, file));
    const dir = toPosix(
      path.dirname(path.join("apps/vector-editor-web/src", rel)),
    );
    const stem = resolveFamilyStem(path.basename(file));
    const key = `${dir}::${stem}`;
    if (!familyGroups.has(key)) {
      familyGroups.set(key, []);
    }
    familyGroups.get(key).push(rel);
  }

  for (const [key, members] of familyGroups.entries()) {
    if (members.length < 2) {
      continue;
    }
    const [dir, stem] = key.split("::");
    if (stem === "index") {
      continue;
    }
    const dirBaseName = path.basename(dir);
    if (dirBaseName === stem) {
      continue;
    }
    if (VECTOR_STEM_FAMILY_EXCEPTIONS.has(`${dir}::${stem}`)) {
      continue;
    }
    issues.push(`vector stem-family folder violation: ${dir}::${stem}`);
  }
}

function stripLineComments(line) {
  const commentIndex = line.indexOf("//");
  if (commentIndex === -1) {
    return line;
  }
  return line.slice(0, commentIndex);
}

function checkVectorRuntimeClassGovernance(issues) {
  const files = walkTsFiles(RUNTIME_ROOT);
  const classPattern = /\b(?:export\s+)?class\s+[A-Za-z_$][A-Za-z0-9_$]*/;
  for (const file of files) {
    const rel = toPosix(path.relative(VECTOR_SRC_ROOT, file));
    const lines = readFile(file).split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const code = stripLineComments(lines[i]);
      if (!classPattern.test(code)) {
        continue;
      }
      issues.push(`vector runtime class violation: ${rel}:${i + 1}`);
      break;
    }
  }
}

function checkRuntimeFolderGovernance(issues) {
  const entries = fs.readdirSync(RUNTIME_ROOT, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    if (!ALLOWED_RUNTIME_TOP_LEVEL_DIRS.has(entry.name)) {
      issues.push(`runtime unknown top-level folder: ${entry.name}`);
    }
  }
}

function checkRuntimeOneWayGovernance(issues) {
  const files = walkTsFiles(RUNTIME_ROOT);
  const foundationModules = new Set(["model", "types", "shared-memory"]);
  for (const file of files) {
    const relFrom = toPosix(path.relative(RUNTIME_ROOT, file));
    const fromModule = resolveRuntimeModule(relFrom);
    if (!foundationModules.has(fromModule)) {
      continue;
    }
    const content = readFile(file);
    const imports = extractRelativeImports(content);
    for (const specifier of imports) {
      const resolved = path.resolve(path.dirname(file), specifier);
      if (!resolved.startsWith(RUNTIME_ROOT)) {
        continue;
      }
      const relTo = toPosix(path.relative(RUNTIME_ROOT, resolved));
      const toModule = resolveRuntimeModule(relTo);
      if (!RUNTIME_FOUNDATION_FORBIDDEN_TARGETS.has(toModule)) {
        continue;
      }
      const edgeKey = `${relFrom}=>${relTo}`;
      if (RUNTIME_EDGE_EXCEPTIONS.has(edgeKey)) {
        continue;
      }
      issues.push(`runtime one-way violation: ${edgeKey}`);
    }
  }
}

function parsePackageExports(packageJsonPath) {
  const pkg = JSON.parse(readFile(packageJsonPath));
  const exportsField = pkg.exports ?? {};
  const subpaths = new Set(Object.keys(exportsField));
  return subpaths;
}

function checkLibModuleFolderGovernance(issues) {
  const exportSubpaths = parsePackageExports(
    path.join(repoRoot, "packages/lib/package.json"),
  );
  const expectedDirs = new Set(
    [...exportSubpaths]
      .filter((key) => key.startsWith("./"))
      .map((key) => key.slice(2)),
  );
  const actualEntries = fs.readdirSync(LIB_ROOT, { withFileTypes: true });
  for (const entry of actualEntries) {
    if (!entry.isDirectory()) {
      continue;
    }
    if (!expectedDirs.has(entry.name)) {
      issues.push(`lib folder not exported in package contract: ${entry.name}`);
    }
  }
  for (const expected of expectedDirs) {
    const dirPath = path.join(LIB_ROOT, expected);
    if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
      issues.push(`lib export subpath missing folder: ${expected}`);
    }
  }
}

function checkPrimitiveModuleFolderGovernance(issues) {
  const exportSubpaths = parsePackageExports(
    path.join(repoRoot, "packages/editor-primitive/package.json"),
  );
  const expectedDirs = new Set(
    [...exportSubpaths]
      .filter((key) => key.startsWith("./"))
      .map((key) => key.slice(2)),
  );
  const actualEntries = fs.readdirSync(PRIMITIVE_ROOT, { withFileTypes: true });
  for (const entry of actualEntries) {
    if (!entry.isDirectory()) {
      continue;
    }
    if (!expectedDirs.has(entry.name)) {
      issues.push(
        `editor-primitive folder not exported in package contract: ${entry.name}`,
      );
    }
  }
}

function checkLibImportGovernance(issues) {
  const exportSubpaths = parsePackageExports(
    path.join(repoRoot, "packages/lib/package.json"),
  );
  const files = walkTsFiles(path.join(repoRoot, "apps")).concat(
    walkTsFiles(path.join(repoRoot, "packages")),
  );
  const importRegex =
    /from\s+['"](@venus\/lib(?:\/[^'"/]+(?:\/[^'"]+)?)?)['"]/g;
  for (const file of files) {
    const content = readFile(file);
    let match = importRegex.exec(content);
    while (match) {
      const spec = match[1];
      if (spec.includes("/src/")) {
        issues.push(
          `invalid lib deep import: ${toPosix(path.relative(repoRoot, file))} -> ${spec}`,
        );
        match = importRegex.exec(content);
        continue;
      }
      if (spec === "@venus/lib") {
        match = importRegex.exec(content);
        continue;
      }
      const subpath = spec.replace("@venus/lib/", "");
      const exportKey = `./${subpath}`;
      if (!exportSubpaths.has(exportKey)) {
        issues.push(
          `lib subpath not exported: ${toPosix(path.relative(repoRoot, file))} -> ${spec}`,
        );
      }
      match = importRegex.exec(content);
    }
  }
}

function countLines(text) {
  if (text.length === 0) return 0;
  return text.split("\n").length;
}

function checkFileSizeGovernance(issues, warnings) {
  const roots = [LIB_ROOT, PRIMITIVE_ROOT];
  const files = roots.flatMap((root) => walkTsFiles(root));
  for (const file of files) {
    const rel = toPosix(path.relative(repoRoot, file));
    const lines = countLines(readFile(file));
    if (lines > HARD_FILE_LINE_LIMIT && !HARD_LIMIT_EXCEPTIONS.has(rel)) {
      issues.push(`file size hard limit exceeded (${lines}): ${rel}`);
      continue;
    }
    if (lines > SOFT_FILE_LINE_LIMIT) {
      warnings.push(`file size soft limit exceeded (${lines}): ${rel}`);
    }
  }
}

function checkVectorFileSizeGovernance(issues, warnings) {
  const files = walkTsFiles(VECTOR_SRC_ROOT);
  for (const file of files) {
    const rel = toPosix(path.relative(repoRoot, file));
    const lines = countLines(readFile(file));
    if (lines > HARD_FILE_LINE_LIMIT && !HARD_LIMIT_EXCEPTIONS.has(rel)) {
      issues.push(`vector file size hard limit exceeded (${lines}): ${rel}`);
      continue;
    }
    if (lines > SOFT_FILE_LINE_LIMIT && VECTOR_SOFT_LIMIT_EXCEPTIONS.has(rel)) {
      continue;
    }
    if (lines > SOFT_FILE_LINE_LIMIT) {
      warnings.push(`vector file size soft limit exceeded (${lines}): ${rel}`);
    }
  }
}

export function runGovernanceChecks(scope = "all") {
  const issues = [];
  const warnings = [];

  const runVector = scope === "all" || scope === "vector";
  const runLib = scope === "all" || scope === "lib";
  const runPrimitive = scope === "all" || scope === "primitive";

  if (runVector) {
    checkVectorFolderGovernance(issues);
    checkVectorLayerOneWayGovernance(issues);
    checkVectorRuntimeClassGovernance(issues);
    checkVectorStemFamilyFolderGovernance(issues);
    checkVectorFileSizeGovernance(issues, warnings);
    checkRuntimeFolderGovernance(issues);
    checkRuntimeOneWayGovernance(issues);
  }

  if (runLib) {
    checkLibModuleFolderGovernance(issues);
    checkLibImportGovernance(issues);
  }

  if (runPrimitive) {
    checkPrimitiveModuleFolderGovernance(issues);
  }

  if (scope === "all") {
    checkFileSizeGovernance(issues, warnings);
  }

  return { issues, warnings };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { issues, warnings } = runGovernanceChecks(SCOPE_ARG);
  for (const warning of warnings) {
    console.warn(`[governance:warn] ${warning}`);
  }
  if (issues.length > 0) {
    for (const issue of issues) {
      console.error(`[governance:error] ${issue}`);
    }
    process.exit(1);
  }
  console.log(`[governance] ok (scope=${SCOPE_ARG})`);
}
