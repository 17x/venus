import assert from "node:assert/strict";
import test from "node:test";

import {
  createEngine,
  createTestSurface,
  resolveEngineConstraintSet,
  type EngineConstraintSet,
} from "../index";

test("constraint kernel projects 3D candidates onto line, plane, segment, and circle", () => {
  const cases: readonly {
    set: EngineConstraintSet;
    candidate: { x: number; y: number; z: number };
    expected: { x: number; y: number; z: number };
  }[] = [
    {
      set: {
        id: "line",
        rules: [{ constraint: {
          id: "line-x",
          kind: "line",
          origin: { x: 0, y: 2, z: 0 },
          direction: { x: 1, y: 0, z: 0 },
        } }],
      },
      candidate: { x: 4, y: 8, z: 3 },
      expected: { x: 4, y: 2, z: 0 },
    },
    {
      set: {
        id: "plane",
        rules: [{ constraint: {
          id: "ground",
          kind: "plane",
          origin: { x: 0, y: 0, z: 0 },
          normal: { x: 0, y: 1, z: 0 },
        } }],
      },
      candidate: { x: 4, y: 8, z: 3 },
      expected: { x: 4, y: 0, z: 3 },
    },
    {
      set: {
        id: "segment",
        rules: [{ constraint: {
          id: "finite-x",
          kind: "segment",
          start: { x: 0, y: 0, z: 0 },
          end: { x: 5, y: 0, z: 0 },
        } }],
      },
      candidate: { x: 9, y: 4, z: 0 },
      expected: { x: 5, y: 0, z: 0 },
    },
    {
      set: {
        id: "circle",
        rules: [{ constraint: {
          id: "ring",
          kind: "circle",
          center: { x: 1, y: 2, z: 3 },
          normal: { x: 0, y: 0, z: 1 },
          radius: 4,
        } }],
      },
      candidate: { x: 9, y: 2, z: 8 },
      expected: { x: 5, y: 2, z: 3 },
    },
    {
      set: {
        id: "polyline",
        rules: [{ constraint: {
          id: "route",
          kind: "polyline",
          points: [
            { x: 0, y: 0, z: 0 },
            { x: 10, y: 0, z: 0 },
            { x: 10, y: 0, z: 10 },
          ],
        } }],
      },
      candidate: { x: 8, y: 4, z: 3 },
      expected: { x: 10, y: 0, z: 3 },
    },
  ];

  for (const item of cases) {
    const result = resolveEngineConstraintSet(item.set, { position: item.candidate });
    assert.equal(result.status, "corrected");
    assert.deepEqual(result.pose.position, item.expected);
  }
});

test("constraint kernel resolves scalar ranges and preserves stable priority order", () => {
  const set: EngineConstraintSet = {
    id: "ordered",
    rules: [
      {
        priority: 0,
        constraint: {
          id: "plane-y",
          kind: "plane",
          origin: { x: 0, y: 3, z: 0 },
          normal: { x: 0, y: 1, z: 0 },
        },
      },
      {
        priority: 10,
        constraint: {
          id: "line-x",
          kind: "line",
          origin: { x: 0, y: 0, z: 0 },
          direction: { x: 1, y: 0, z: 0 },
        },
      },
      {
        constraint: {
          id: "radius-range",
          kind: "scalar-range",
          min: 0,
          max: 12,
        },
      },
    ],
  };

  const first = resolveEngineConstraintSet(set, { position: { x: 5, y: 8, z: 9 } }, 18);
  const second = resolveEngineConstraintSet(set, { position: { x: 5, y: 8, z: 9 } }, 18);

  assert.deepEqual(first, second);
  assert.deepEqual(first.pose.position, { x: 5, y: 3, z: 0 });
  assert.equal(first.scalar, 12);
  assert.deepEqual(first.activeConstraintIds, ["line-x", "plane-y", "radius-range"]);
  assert.equal(first.iterations, 3);
});

test("angle-range uses radians and resolves wrapped intervals without seam jumps", () => {
  const set: EngineConstraintSet = {
    id: "wrapped-angle",
    rules: [{
      constraint: {
        id: "limited-arc",
        kind: "angle-range",
        min: Math.PI * 0.75,
        max: -Math.PI * 0.75,
      },
    }],
  };

  const inside = resolveEngineConstraintSet(set, { position: { x: 0, y: 0, z: 0 } }, Math.PI);
  const outside = resolveEngineConstraintSet(set, { position: { x: 0, y: 0, z: 0 } }, 0);

  assert.equal(inside.status, "satisfied");
  assert.ok(Math.abs((inside.scalar ?? 0) + Math.PI) < 1e-12);
  assert.equal(outside.status, "corrected");
  assert.ok(Math.abs((outside.scalar ?? 0) - Math.PI * 0.75) < 1e-12);
});

test("runtime constraints registry resolves transient candidates and reports invalid requests", () => {
  const engine = createEngine({
    surface: createTestSurface(320, 180),
    backend: "headless",
  });

  engine.runtime.constraints.register({
    id: " ellipse-angle ",
    rules: [{
      constraint: {
        id: "ellipse-ring",
        kind: "circle",
        center: { x: 10, y: 10, z: 0 },
        normal: { x: 0, y: 0, z: 1 },
        radius: 5,
      },
    }],
  });

  assert.equal(engine.runtime.constraints.getAll().length, 1);
  assert.equal(engine.runtime.constraints.get("ellipse-angle")?.id, "ellipse-angle");
  assert.deepEqual(
    engine.runtime.constraints.resolve({
      constraintSetId: "ellipse-angle",
      candidate: { position: { x: 30, y: 10, z: 7 } },
    }).pose.position,
    { x: 15, y: 10, z: 0 },
  );

  const missing = engine.runtime.constraints.resolve({
    constraintSetId: "missing",
    candidate: { position: { x: 1, y: 2, z: 3 } },
  });
  assert.equal(missing.status, "unsatisfied");
  assert.equal(missing.violations[0]?.code, "missing-constraint-set");

  engine.runtime.constraints.register({
    id: "degenerate",
    rules: [{
      constraint: {
        id: "bad-line",
        kind: "line",
        origin: { x: 0, y: 0, z: 0 },
        direction: { x: 0, y: 0, z: 0 },
      },
    }],
  });
  assert.equal(engine.runtime.constraints.resolve({
    constraintSetId: "degenerate",
    candidate: { position: { x: 1, y: 2, z: 3 } },
  }).status, "unsatisfied");

  assert.deepEqual(engine.runtime.constraints.unregister("ellipse-angle"), {
    removed: true,
    constraintSetCount: 1,
  });
  engine.dispose();
});
