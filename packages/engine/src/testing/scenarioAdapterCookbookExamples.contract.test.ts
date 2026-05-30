import assert from "node:assert/strict";
import test from "node:test";

import type { EngineGraphInput } from "../orchestration/api/public-types";

type AppOwnedRecord = {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly value: number;
};

/**
 * Example app-side adapter that projects domain-owned records into generic engine graph nodes.
 * @param records App-owned source records.
 */
function projectAppRecordsToEngineGraph(records: readonly AppOwnedRecord[]): EngineGraphInput {
  return {
    revision: 1,
    nodes: records.map((record) => ({
      id: `node-${record.id}`,
      kind: "shape",
      x: record.x,
      y: record.y,
      width: Math.max(1, record.value),
      height: Math.max(1, record.value),
    })),
  };
}

/**
 * Verifies cookbook adapter examples emit product-neutral engine graph payloads.
 */
test("scenario adapter cookbook example emits generic engine graph only", () => {
  const graph = projectAppRecordsToEngineGraph([
    { id: "a", x: 10, y: 20, value: 4 },
    { id: "b", x: 30, y: 40, value: 8 },
  ]);
  const serialized = JSON.stringify(graph).toLowerCase();

  assert.deepEqual(graph.nodes.map((node) => node.id), ["node-a", "node-b"]);
  for (const forbiddenTerm of ["dicom", "ifc", "medical", "bim", "gis", "cad", "video", "game"]) {
    assert.equal(serialized.includes(forbiddenTerm), false, `engine graph leaked domain term: ${forbiddenTerm}`);
  }
});
