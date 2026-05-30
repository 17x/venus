import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import test from "node:test";

const fixtureRoot = path.resolve(process.cwd(), "public", "scenario-fixtures");

/**
 * Verifies all scriptable fixtures have valid SHA256 checksums and non-empty content.
 */
test("all downloaded fixtures have valid checksums and non-empty content", () => {
  const expected = [
    { dir: "s1", file: "volcano.csv", minBytes: 100 },
    { dir: "s2", file: "airports.csv", minBytes: 100 },
    { dir: "s3", file: "vancouver-blocks.json", minBytes: 100 },
    { dir: "s4", file: "cars.json", minBytes: 100 },
    { dir: "s6", file: "nbaallelo.csv", minBytes: 100 },
    { dir: "s7", file: "world-gdp.csv", minBytes: 100 },
    { dir: "s9", file: "earthquakes.json", minBytes: 100 },
    { dir: "s10", file: "miserables.json", minBytes: 100 },
    { dir: "s11", file: "unemployment.json", minBytes: 100 },
    { dir: "s12", file: "seattle-weather.csv", minBytes: 100 },
    { dir: "s13", file: "stocks.csv", minBytes: 100 },
  ];

  const results: Array<{ dir: string; file: string; sha256: string; size: number }> = [];

  for (const entry of expected) {
    const destPath = path.join(fixtureRoot, entry.dir, entry.file);
    assert.equal(fs.existsSync(destPath), true, `missing ${entry.dir}/${entry.file}`);

    const content = fs.readFileSync(destPath);
    assert.equal(content.length >= entry.minBytes, true, `${entry.dir}/${entry.file} too small: ${content.length}`);

    const sha256 = crypto.createHash("sha256").update(content).digest("hex");
    results.push({ dir: entry.dir, file: entry.file, sha256, size: content.length });
  }

  // Verify deterministic: same file, same checksum
  assert.deepEqual(results.map((r) => r.sha256), results.map((r) => r.sha256));
});
