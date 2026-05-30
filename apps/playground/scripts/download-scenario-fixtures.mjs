#!/usr/bin/env node

/**
 * Downloads public datasets for playground scenario fixtures.
 * Run: node scripts/download-scenario-fixtures.mjs
 * Or: pnpm --filter @venus/playground exec node scripts/download-scenario-fixtures.mjs
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtureRoot = path.join(root, "public", "scenario-fixtures");

const DOWNLOADS = [
  {
    id: "s1",
    url: "https://raw.githubusercontent.com/plotly/datasets/master/volcano.csv",
    dest: "s1/volcano.csv",
  },
  {
    id: "s2",
    url: "https://raw.githubusercontent.com/vega/vega-datasets/main/data/airports.csv",
    dest: "s2/airports.csv",
  },
  {
    id: "s3",
    url: "https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/geojson/vancouver-blocks.json",
    dest: "s3/vancouver-blocks.json",
  },
  {
    id: "s4",
    url: "https://raw.githubusercontent.com/vega/vega-datasets/main/data/cars.json",
    dest: "s4/cars.json",
  },
  {
    id: "s6",
    url: "https://raw.githubusercontent.com/fivethirtyeight/data/master/nba-elo/nbaallelo.csv",
    dest: "s6/nbaallelo.csv",
  },
  {
    id: "s7",
    url: "https://raw.githubusercontent.com/plotly/datasets/master/2014_world_gdp_with_codes.csv",
    dest: "s7/world-gdp.csv",
  },
  {
    id: "s9",
    url: "https://raw.githubusercontent.com/vega/vega-datasets/main/data/earthquakes.json",
    dest: "s9/earthquakes.json",
  },
  {
    id: "s10",
    url: "https://raw.githubusercontent.com/vega/vega-datasets/main/data/miserables.json",
    dest: "s10/miserables.json",
  },
  {
    id: "s11",
    url: "https://raw.githubusercontent.com/vega/vega-datasets/main/data/unemployment-across-industries.json",
    dest: "s11/unemployment.json",
  },
  {
    id: "s12",
    url: "https://raw.githubusercontent.com/vega/vega-datasets/main/data/seattle-weather.csv",
    dest: "s12/seattle-weather.csv",
  },
  {
    id: "s13",
    url: "https://raw.githubusercontent.com/vega/vega-datasets/main/data/stocks.csv",
    dest: "s13/stocks.csv",
  },
];

const checksums = {};

for (const entry of DOWNLOADS) {
  const destDir = path.join(fixtureRoot, path.dirname(entry.dest));
  fs.mkdirSync(destDir, { recursive: true });
  const destPath = path.join(fixtureRoot, entry.dest);

  if (fs.existsSync(destPath)) {
    console.log(`[skip] ${entry.id}: already exists at ${entry.dest}`);
    const content = fs.readFileSync(destPath);
    checksums[entry.id] = crypto
      .createHash("sha256")
      .update(content)
      .digest("hex");
    continue;
  }

  console.log(`[download] ${entry.id}: ${entry.url} -> ${entry.dest}`);
  try {
    const result = execSync(`curl -sL "${entry.url}" -o "${destPath}"`, {
      encoding: "utf8",
      timeout: 30000,
    });
    const content = fs.readFileSync(destPath);
    checksums[entry.id] = crypto
      .createHash("sha256")
      .update(content)
      .digest("hex");
    console.log(`  sha256: ${checksums[entry.id]}`);
    console.log(`  size: ${content.length} bytes`);
  } catch (err) {
    console.error(`[fail] ${entry.id}: ${err.message}`);
  }
}

console.log("\n=== Checksums ===");
for (const [id, hash] of Object.entries(checksums)) {
  console.log(`${id}: ${hash}`);
}
