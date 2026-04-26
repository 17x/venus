#!/usr/bin/env node

import process from "node:process";
import { chromium } from "playwright";

function parseArgs(argv) {
  const args = {
    url: "http://127.0.0.1:4173",
    idleDurationMs: 3000,
    interactionDurationMs: 4000,
    idleMinFps: 45,
    interactionMinFps: 30,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--url") {
      args.url = argv[index + 1] ?? args.url;
      index += 1;
      continue;
    }
    if (token === "--idle-ms") {
      args.idleDurationMs = Number(argv[index + 1] ?? args.idleDurationMs);
      index += 1;
      continue;
    }
    if (token === "--interaction-ms") {
      args.interactionDurationMs = Number(
        argv[index + 1] ?? args.interactionDurationMs,
      );
      index += 1;
      continue;
    }
    if (token === "--idle-min-fps") {
      args.idleMinFps = Number(argv[index + 1] ?? args.idleMinFps);
      index += 1;
      continue;
    }
    if (token === "--interaction-min-fps") {
      args.interactionMinFps = Number(
        argv[index + 1] ?? args.interactionMinFps,
      );
      index += 1;
      continue;
    }
  }

  return args;
}

async function measureFps(page, durationMs) {
  // Sample requestAnimationFrame cadence to estimate effective on-screen frame rate.
  return page.evaluate(async (windowMs) => {
    const deltas = [];
    let last = performance.now();
    const start = last;
    while (performance.now() - start < windowMs) {
      await new Promise((resolve) => {
        requestAnimationFrame((now) => {
          deltas.push(now - last);
          last = now;
          resolve();
        });
      });
    }

    const valid = deltas.filter((delta) => Number.isFinite(delta) && delta > 0);
    if (valid.length === 0) {
      return { fps: 0, sampleCount: 0 };
    }
    const avgDelta =
      valid.reduce((sum, value) => sum + value, 0) / valid.length;
    return {
      fps: 1000 / avgDelta,
      sampleCount: valid.length,
    };
  }, durationMs);
}

async function runInteraction(page, durationMs) {
  // Drive repeated wheel gestures at viewport center to exercise zoom interaction path.
  const viewport = page.viewportSize() ?? { width: 1200, height: 800 };
  const centerX = Math.floor(viewport.width / 2);
  const centerY = Math.floor(viewport.height / 2);
  const endAt = Date.now() + durationMs;

  await page.mouse.move(centerX, centerY);
  while (Date.now() < endAt) {
    await page.mouse.wheel(0, -120);
    await page.waitForTimeout(16);
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(16);
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    await page.goto(args.url, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);

    const idle = await measureFps(page, args.idleDurationMs);
    const interactionMeasure = measureFps(page, args.interactionDurationMs);
    await runInteraction(page, args.interactionDurationMs);
    const interaction = await interactionMeasure;

    const idlePass = idle.fps >= args.idleMinFps;
    const interactionPass = interaction.fps >= args.interactionMinFps;

    console.log("Playwright FPS summary");
    console.log(`URL: ${args.url}`);
    console.log(
      `Idle FPS: ${idle.fps.toFixed(2)} (samples ${idle.sampleCount}, threshold >= ${args.idleMinFps})`,
    );
    console.log(
      `Interaction FPS: ${interaction.fps.toFixed(2)} (samples ${interaction.sampleCount}, threshold >= ${args.interactionMinFps})`,
    );

    if (!idlePass || !interactionPass) {
      console.log("Result: FAIL");
      process.exit(1);
    }

    console.log("Result: PASS");
    process.exit(0);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(
    "playwright-fps-check failed:",
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
});
