#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const machineRulesPath = path.join(
  repoRoot,
  ".ai/GOVERNANCE_MACHINE_RULES.yaml",
);

/**
 * Resolves whether a YAML-like key exists at line start.
 * @param {string} content File content.
 * @param {string} key Top-level or nested key token including trailing colon.
 */
function hasYamlKey(content, key) {
  const keyPattern = new RegExp(
    `^\\s*${key.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}`,
    "m",
  );
  return keyPattern.test(content);
}

/**
 * Resolves whether all required list values are present under a section label.
 * @param {string} content File content.
 * @param {string} section Section header text including trailing colon.
 * @param {string[]} requiredValues Required list scalar values.
 */
function hasRequiredListValues(content, section, requiredValues) {
  const sectionMatch = content.match(
    new RegExp(`^\\s*${section}\\s*$([\\s\\S]*?)(?:^\\S|\\Z)`, "m"),
  );
  if (!sectionMatch) {
    return false;
  }
  const sectionBlock = sectionMatch[1];
  return requiredValues.every((value) =>
    new RegExp(`-\\s+${value}(?:\\s|$)`).test(sectionBlock),
  );
}

/**
 * Validates that machine-readable governance baseline exists and contains required anchors.
 * @returns {{ok: boolean, issues: string[]}}
 */
function runGovernanceMachineCheck() {
  const issues = [];

  if (!fs.existsSync(machineRulesPath)) {
    issues.push(
      `missing machine rules file: ${path.relative(repoRoot, machineRulesPath)}`,
    );
    return { ok: false, issues };
  }

  const content = fs.readFileSync(machineRulesPath, "utf8");

  const requiredAnchors = [
    "version:",
    "status:",
    "precedence:",
    "agent:",
    "execution:",
    "validation:",
    "temporary_logic:",
    "exceptions:",
    "security:",
    "concurrency:",
    "entropy:",
  ];

  // Validate structural anchors with lightweight checks to keep runtime dependency-free.
  for (const anchor of requiredAnchors) {
    if (!content.includes(anchor)) {
      issues.push(`machine rules missing anchor: ${anchor}`);
    }
  }

  // Enforce semantic minimums beyond anchor presence.
  if (!hasYamlKey(content, "allowed_tiers:")) {
    issues.push("machine rules missing allowed_tiers");
  }
  if (!/allowed_tiers:\s*\[\s*A\s*,\s*B\s*,\s*C\s*\]/.test(content)) {
    issues.push("machine rules allowed_tiers must be [A, B, C]");
  }

  if (
    !hasRequiredListValues(content, "minimum_gates:", [
      "typecheck",
      "lint",
      "relevant_tests",
    ])
  ) {
    issues.push(
      "machine rules minimum_gates must include typecheck/lint/relevant_tests",
    );
  }

  if (!/required_format:\s*"\[GOV-EXCEPTION\].*<expiry>"/.test(content)) {
    issues.push(
      "machine rules exceptions.required_format must include <expiry>",
    );
  }

  if (!hasYamlKey(content, "require_cleanup_first:")) {
    issues.push(
      "machine rules must define require_cleanup_first at execution/entropy level",
    );
  }

  return { ok: issues.length === 0, issues };
}

const result = runGovernanceMachineCheck();
if (!result.ok) {
  for (const issue of result.issues) {
    console.error(`[governance-machine:error] ${issue}`);
  }
  process.exit(1);
}

console.log("[governance-machine] ok");
