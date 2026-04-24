#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const SCRIPT_DIR = path.dirname(new URL(import.meta.url).pathname);
const DEFAULT_CONFIG_PATH = path.join(SCRIPT_DIR, "perf-gate.config.json");

function parseArgs(argv) {
  const args = {
    report: null,
    previousReport: null,
    output: null,
    config: DEFAULT_CONFIG_PATH,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--report") {
      args.report = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (token === "--config") {
      args.config = argv[index + 1] ?? DEFAULT_CONFIG_PATH;
      index += 1;
      continue;
    }
    if (token === "--previous-report") {
      args.previousReport = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (token === "--output") {
      args.output = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
  }

  return args;
}

function evaluateMetric(value, rule) {
  if (rule.operator === "<=") {
    return value <= rule.threshold;
  }
  if (rule.operator === ">=") {
    return value >= rule.threshold;
  }
  if (rule.operator === "<") {
    return value < rule.threshold;
  }
  if (rule.operator === ">") {
    return value > rule.threshold;
  }
  if (rule.operator === "==") {
    return value === rule.threshold;
  }
  throw new Error(`Unsupported operator: ${rule.operator}`);
}

function formatRule(rule) {
  return `${rule.operator} ${rule.threshold}`;
}

async function readJson(filePath) {
  const content = await fs.readFile(filePath, "utf8");
  return JSON.parse(content);
}

function evaluateTrendRegression(
  currentValue,
  previousValue,
  direction,
  maxRegressionPercent,
) {
  if (direction === "higher-better") {
    const minimumAllowed = previousValue * (1 - maxRegressionPercent / 100);
    return {
      passed: currentValue >= minimumAllowed,
      thresholdValue: minimumAllowed,
      relation: ">=",
    };
  }

  const maximumAllowed = previousValue * (1 + maxRegressionPercent / 100);
  return {
    passed: currentValue <= maximumAllowed,
    thresholdValue: maximumAllowed,
    relation: "<=",
  };
}

function roundNumber(value) {
  return Math.round(value * 1000) / 1000;
}

async function main() {
  const args = parseArgs(process.argv);

  if (!args.report) {
    console.error(
      "Usage: node ./scripts/perf-gate.mjs --report <report.json> [--config <config.json>] [--previous-report <report.json>] [--output <result.json>]",
    );
    process.exit(1);
  }

  const [config, report, previousReport] = await Promise.all([
    readJson(path.resolve(args.config)),
    readJson(path.resolve(args.report)),
    args.previousReport
      ? readJson(path.resolve(args.previousReport))
      : Promise.resolve(null),
  ]);

  const scenes = Array.isArray(report.scenes) ? report.scenes : [];
  const sceneByName = new Map(scenes.map((scene) => [scene.name, scene]));
  const previousScenes = Array.isArray(previousReport?.scenes)
    ? previousReport.scenes
    : [];
  const previousSceneByName = new Map(
    previousScenes.map((scene) => [scene.name, scene]),
  );
  const failures = [];
  const checks = [];
  const trendChecks = [];
  const trendFailures = [];

  const trendRegressionEnabled = config.trendRegression?.enabled === true;
  const defaultMaxRegressionPercent =
    typeof config.trendRegression?.defaultMaxRegressionPercent === "number"
      ? config.trendRegression.defaultMaxRegressionPercent
      : 5;
  const metricDirections = config.trendRegression?.metricDirections ?? {};

  for (const sceneName of config.requiredScenes ?? []) {
    const scene = sceneByName.get(sceneName);
    if (!scene) {
      failures.push(`${sceneName}: missing scene result`);
      continue;
    }

    const metricRules = {
      ...(config.metrics ?? {}),
      ...(config.sceneOverrides?.[sceneName] ?? {}),
    };

    for (const [metricName, rule] of Object.entries(metricRules)) {
      const value = scene[metricName];
      if (typeof value !== "number" || Number.isNaN(value)) {
        failures.push(`${sceneName}.${metricName}: missing numeric value`);
        continue;
      }

      const passed = evaluateMetric(value, rule);
      checks.push({ sceneName, metricName, value, rule, passed });

      if (!passed) {
        failures.push(
          `${sceneName}.${metricName}: ${value} does not satisfy ${formatRule(rule)}`,
        );
      }

      if (!trendRegressionEnabled || !previousReport) {
        continue;
      }

      const previousScene = previousSceneByName.get(sceneName);
      if (!previousScene) {
        trendFailures.push(`${sceneName}: missing scene in previous report`);
        continue;
      }

      const previousValue = previousScene[metricName];
      if (typeof previousValue !== "number" || Number.isNaN(previousValue)) {
        trendFailures.push(
          `${sceneName}.${metricName}: missing numeric value in previous report`,
        );
        continue;
      }

      const direction = metricDirections[metricName] ?? "lower-better";
      const trendResult = evaluateTrendRegression(
        value,
        previousValue,
        direction,
        defaultMaxRegressionPercent,
      );
      trendChecks.push({
        sceneName,
        metricName,
        previousValue,
        currentValue: value,
        direction,
        maxRegressionPercent: defaultMaxRegressionPercent,
        passed: trendResult.passed,
        thresholdValue: trendResult.thresholdValue,
        relation: trendResult.relation,
      });

      if (!trendResult.passed) {
        trendFailures.push(
          `${sceneName}.${metricName}: current ${value} ${trendResult.relation} ${roundNumber(trendResult.thresholdValue)} failed (previous ${previousValue}, direction ${direction}, max regression ${defaultMaxRegressionPercent}%)`,
        );
      }
    }
  }

  console.log("Mixed-scene performance gate summary");
  console.log(`Report: ${path.resolve(args.report)}`);
  console.log(`Config: ${path.resolve(args.config)}`);
  console.log(`Checks: ${checks.length}`);
  if (previousReport) {
    console.log(`Trend checks: ${trendChecks.length}`);
  }

  const allFailures = [...failures, ...trendFailures];

  if (args.output) {
    const outputPayload = {
      generatedAt: new Date().toISOString(),
      reportPath: path.resolve(args.report),
      previousReportPath: args.previousReport
        ? path.resolve(args.previousReport)
        : null,
      configPath: path.resolve(args.config),
      checks,
      trendChecks,
      failures,
      trendFailures,
      passed: allFailures.length === 0,
    };
    await fs.writeFile(
      path.resolve(args.output),
      JSON.stringify(outputPayload, null, 2),
      "utf8",
    );
    console.log(`Output: ${path.resolve(args.output)}`);
  }

  if (allFailures.length === 0) {
    console.log("Result: PASS");
    process.exit(0);
  }

  console.log("Result: FAIL");
  for (const failure of allFailures) {
    console.log(`- ${failure}`);
  }
  process.exit(1);
}

main().catch((error) => {
  console.error(
    "perf-gate failed:",
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
});
