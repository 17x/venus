#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DEFAULT_OUTPUT_PATH =
  "./docs/product-requirements/m1-performance-baseline.json";

/**
 * Parses CLI arguments for baseline aggregation command.
 * @param {string[]} argv Process argv tokens.
 */
function parseArgs(argv) {
  const args = {
    reports: [],
    output: DEFAULT_OUTPUT_PATH,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--report") {
      const reportPath = argv[index + 1] ?? null;
      if (reportPath) {
        args.reports.push(reportPath);
      }
      index += 1;
      continue;
    }
    if (token === "--output") {
      args.output = argv[index + 1] ?? DEFAULT_OUTPUT_PATH;
      index += 1;
      continue;
    }
  }

  return args;
}

/**
 * Reads one JSON file.
 * @param {string} filePath File path to read.
 */
async function readJson(filePath) {
  const content = await fs.readFile(filePath, "utf8");
  return JSON.parse(content);
}

/**
 * Computes one percentile value from numeric samples.
 * @param {number[]} values Numeric sample list.
 * @param {number} percentile Percentile in [0, 1].
 */
function computePercentile(values, percentile) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const rawIndex = (sorted.length - 1) * percentile;
  const lower = Math.floor(rawIndex);
  const upper = Math.ceil(rawIndex);
  if (lower === upper) {
    return sorted[lower];
  }

  const lowerWeight = upper - rawIndex;
  const upperWeight = rawIndex - lower;
  return sorted[lower] * lowerWeight + sorted[upper] * upperWeight;
}

/**
 * Rounds one numeric metric to three decimals for stable baseline files.
 * @param {number} value Raw metric value.
 */
function roundMetric(value) {
  return Math.round(value * 1000) / 1000;
}

/**
 * Resolves one coarse scene-size bucket for baseline summary tables.
 * @param {string} sceneName Scene name from perf report.
 */
function resolveSceneScale(sceneName) {
  if (sceneName === "10k") {
    return "small";
  }
  if (sceneName === "50k") {
    return "medium";
  }
  if (sceneName === "100k") {
    return "large";
  }
  return "mixed";
}

/**
 * Aggregates repeated perf-gate style reports into one P50/P95 baseline payload.
 * @param {Array<{scenes?: Array<Record<string, unknown>>}>} reports Parsed report JSON objects.
 */
function buildBaselineReport(reports) {
  const sceneMetricSamples = new Map();

  for (const report of reports) {
    for (const scene of report.scenes ?? []) {
      const sceneName = typeof scene.name === "string" ? scene.name : null;
      if (!sceneName) {
        continue;
      }

      const existing = sceneMetricSamples.get(sceneName) ?? {
        frameTimeMsP95: [],
        hitTestMsP95: [],
        cacheHitRate: [],
        visibleCandidateCount: [],
      };

      if (typeof scene.frameTimeMsP95 === "number") {
        existing.frameTimeMsP95.push(scene.frameTimeMsP95);
      }
      if (typeof scene.hitTestMsP95 === "number") {
        existing.hitTestMsP95.push(scene.hitTestMsP95);
      }
      if (typeof scene.cacheHitRate === "number") {
        existing.cacheHitRate.push(scene.cacheHitRate);
      }
      if (typeof scene.visibleCandidateCount === "number") {
        existing.visibleCandidateCount.push(scene.visibleCandidateCount);
      }

      sceneMetricSamples.set(sceneName, existing);
    }
  }

  const scenes = Array.from(sceneMetricSamples.entries())
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([name, samples]) => {
      const frameP50 = roundMetric(
        computePercentile(samples.frameTimeMsP95, 0.5),
      );
      const frameP95 = roundMetric(
        computePercentile(samples.frameTimeMsP95, 0.95),
      );
      const hitP50 = roundMetric(computePercentile(samples.hitTestMsP95, 0.5));
      const hitP95 = roundMetric(computePercentile(samples.hitTestMsP95, 0.95));
      const cacheP50 = roundMetric(
        computePercentile(samples.cacheHitRate, 0.5),
      );
      const cacheP95 = roundMetric(
        computePercentile(samples.cacheHitRate, 0.95),
      );
      const candidateP50 = roundMetric(
        computePercentile(samples.visibleCandidateCount, 0.5),
      );
      const candidateP95 = roundMetric(
        computePercentile(samples.visibleCandidateCount, 0.95),
      );

      return {
        name,
        scale: resolveSceneScale(name),
        runSampleCount: samples.frameTimeMsP95.length,
        frameTimeMsP50: frameP50,
        frameTimeMsP95: frameP95,
        hitTestMsP50: hitP50,
        hitTestMsP95: hitP95,
        cacheHitRateP50: cacheP50,
        cacheHitRateP95: cacheP95,
        visibleCandidateCountP50: candidateP50,
        visibleCandidateCountP95: candidateP95,
        // Keep perf-gate compatibility fields so the same artifact can feed gate checks.
        cacheHitRate: cacheP95,
        visibleCandidateCount: candidateP95,
      };
    });

  return {
    generatedAt: new Date().toISOString(),
    reportRunCount: reports.length,
    percentileWindow: {
      p50: 0.5,
      p95: 0.95,
    },
    scenes,
  };
}

async function main() {
  const args = parseArgs(process.argv);

  if (args.reports.length === 0) {
    console.error(
      "Usage: node ./scripts/perf-baseline.mjs --report <report.json> [--report <report2.json> ...] [--output <output.json>]",
    );
    process.exit(1);
  }

  const parsedReports = await Promise.all(
    args.reports.map((reportPath) => readJson(path.resolve(reportPath))),
  );
  const baseline = buildBaselineReport(parsedReports);

  const outputPath = path.resolve(args.output);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(
    outputPath,
    `${JSON.stringify(baseline, null, 2)}\n`,
    "utf8",
  );

  console.log("Performance baseline report generated");
  console.log(`Reports: ${args.reports.length}`);
  console.log(`Output: ${outputPath}`);
}

main().catch((error) => {
  console.error(
    "perf-baseline failed:",
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
});
