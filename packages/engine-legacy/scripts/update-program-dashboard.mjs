#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const DEFAULT_DASHBOARD_CANDIDATE_PATHS = [
  "docs/industrial-refactor/dashboard/program-dashboard.json",
  "packages/engine/docs/industrial-refactor/dashboard/program-dashboard.json",
];

/**
 * Intent: load and parse JSON from disk with explicit failure messages.
 * @param filePath Absolute or workspace-relative path to JSON file.
 * @returns Parsed JSON object.
 */
function readJson(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

/**
 * Intent: resolve CLI argument from --name=value flags.
 * @param name Argument name without -- prefix.
 * @returns Flag value or undefined when omitted.
 */
function resolveFlag(name) {
  const prefix = `--${name}=`;
  const match = process.argv.find((argument) => argument.startsWith(prefix));
  return match ? match.slice(prefix.length) : undefined;
}

/**
 * Intent: resolve first existing dashboard path from default candidate list.
 * @returns Existing dashboard path candidate.
 */
function resolveDefaultDashboardPath() {
  for (const candidate of DEFAULT_DASHBOARD_CANDIDATE_PATHS) {
    const absolutePath = path.resolve(candidate);
    if (fs.existsSync(absolutePath)) {
      return candidate;
    }
  }

  return DEFAULT_DASHBOARD_CANDIDATE_PATHS[0];
}

/**
 * Intent: resolve dashboard trend entry from one baseline report payload.
 * @param report Baseline report JSON object.
 * @returns Normalized trend entry for dashboard metrics.
 */
function createTrendEntry(report) {
  return {
    timestampIso: report.run.timestampIso,
    scenario: report.run.scenario,
    backend: report.run.backend,
    commit: report.run.gitCommit ?? null,
    frameCount: report.summary.frameCount,
    avgFrameMs: report.summary.avgFrameMs,
    p95FrameMs: report.summary.p95FrameMs,
    p99FrameMs: report.summary.p99FrameMs,
    interactiveFrameCount: report.summary.interactiveFrameCount,
    staticFrameCount: report.summary.staticFrameCount,
    cameraFrameCount: report.summary.cameraFrameCount,
    fallbackReasonCounts: report.summary.fallbackReasonCounts,
  };
}

/**
 * Intent: mutate dashboard JSON by appending one trend entry and SLO quick-view.
 * @param dashboard Dashboard JSON object.
 * @param trendEntry Normalized trend entry.
 * @returns Updated dashboard JSON object.
 */
function applyTrendUpdate(dashboard, trendEntry) {
  const nextDashboard = {
    ...dashboard,
    updatedAt: trendEntry.timestampIso.slice(0, 10),
    metrics: {
      ...dashboard.metrics,
      trend: [...(dashboard.metrics?.trend ?? []), trendEntry],
      slo: {
        ...(dashboard.metrics?.slo ?? {}),
        interactiveFpsP95:
          trendEntry.p95FrameMs > 0 ? 1000 / trendEntry.p95FrameMs : null,
      },
    },
  };

  return nextDashboard;
}

/**
 * Intent: run dashboard trend ingestion for one baseline report artifact.
 */
function main() {
  const reportPath = resolveFlag("report");
  const dashboardPath =
    resolveFlag("dashboard") ?? resolveDefaultDashboardPath();

  if (!reportPath) {
    console.error("[dashboard:update] FAIL: missing --report=<path> argument.");
    process.exit(1);
  }

  const absoluteReportPath = path.resolve(reportPath);
  const absoluteDashboardPath = path.resolve(dashboardPath);

  if (!fs.existsSync(absoluteReportPath)) {
    console.error(
      `[dashboard:update] FAIL: report file not found: ${absoluteReportPath}`,
    );
    process.exit(1);
  }

  if (!fs.existsSync(absoluteDashboardPath)) {
    console.error(
      `[dashboard:update] FAIL: dashboard file not found: ${absoluteDashboardPath}`,
    );
    process.exit(1);
  }

  const report = readJson(absoluteReportPath);
  const dashboard = readJson(absoluteDashboardPath);
  const trendEntry = createTrendEntry(report);
  const nextDashboard = applyTrendUpdate(dashboard, trendEntry);

  fs.writeFileSync(
    absoluteDashboardPath,
    `${JSON.stringify(nextDashboard, null, 2)}\n`,
    "utf8",
  );
  console.log("[dashboard:update] PASS: appended baseline trend entry.");
}

main();
