import assert from "node:assert/strict";
import test from "node:test";

import { createEngine, createTestSurface } from "../index";

test("runtime world open-world map normalizes and reads back deterministically", () => {
  const engine = createEngine({
    surface: createTestSurface(320, 180),
    backend: "headless",
  });

  const map = engine.runtime.world.setOpenWorldMap({
    mapSize: -640,
    obstacles: [
      { id: "building-a", x: 20, z: 30, width: -80, depth: 120 },
      { id: "", x: 0, z: 0, width: 10, depth: 10 },
    ],
  });

  assert.equal(map.mapSize, 640);
  assert.equal(map.obstacles.length, 1);
  assert.deepEqual(map.obstacles[0], {
    id: "building-a",
    x: 20,
    z: 30,
    width: 80,
    depth: 120,
  });
  assert.deepEqual(engine.runtime.world.getOpenWorldMap(), map);
  engine.dispose();
});

test("runtime world stepAgents advances agents by kind-specific path", () => {
  const engine = createEngine({
    surface: createTestSurface(320, 180),
    backend: "headless",
  });

  engine.runtime.world.setAgents([
    { id: "npc-car", kind: "car", x: 0, z: 0, yaw: 0, pathIndex: 0, speed: 10 },
    { id: "npc-ped", kind: "pedestrian", x: 10, z: 10, yaw: 0, pathIndex: 0, speed: 2 },
  ]);

  const stepped = engine.runtime.world.stepAgents({
    deltaSeconds: 0.5,
    carPath: [{ x: 0, z: 0 }, { x: 100, z: 0 }],
    pedestrianPath: [{ x: 10, z: 10 }, { x: 10, z: 30 }],
  });

  const car = stepped.find((agent) => agent.id === "npc-car");
  const ped = stepped.find((agent) => agent.id === "npc-ped");
  assert.equal(Boolean(car), true);
  assert.equal(Boolean(ped), true);
  assert.equal((car?.x ?? 0) > 0, true);
  assert.equal((ped?.z ?? 0) > 10, true);
  assert.deepEqual(engine.runtime.world.getAgents(), stepped);
  assert.deepEqual(engine.runtime.navigation.getAgents(), stepped);
  engine.dispose();
});

test("runtime navigation namespace mirrors deterministic agent stepping", () => {
  const engine = createEngine({
    surface: createTestSurface(320, 180),
    backend: "headless",
  });

  engine.runtime.navigation.setAgents([
    { id: "agent-a", kind: "car", x: 0, z: 0, yaw: 0, pathIndex: 0, speed: 4 },
  ]);
  const stepped = engine.runtime.navigation.stepAgents({
    deltaSeconds: 1,
    carPath: [{ x: 0, z: 0 }, { x: 12, z: 0 }],
    pedestrianPath: [{ x: 0, z: 0 }, { x: 0, z: 12 }],
  });

  assert.equal(stepped.length, 1);
  assert.equal(stepped[0]?.x, 4);
  assert.deepEqual(engine.runtime.world.getAgents(), stepped);
  engine.dispose();
});

test("runtime navigation path registry steps bound agents deterministically", () => {
  const engine = createEngine({
    surface: createTestSurface(320, 180),
    backend: "headless",
  });

  const path = engine.runtime.navigation.registerPath({
    id: "path-east",
    loop: true,
    nodes: [{ x: 0, z: 0 }, { x: 20, z: 0 }],
  });
  assert.deepEqual(engine.runtime.navigation.getPaths(), [path]);

  engine.runtime.navigation.setAgents([
    { id: "agent-bound", kind: "car", x: 0, z: 0, yaw: 0, pathIndex: 0, speed: 5 },
  ]);
  const stepped = engine.runtime.navigation.stepPathAgents({
    deltaSeconds: 1,
    pathBindings: [{ agentId: "agent-bound", pathId: "path-east" }],
  });

  assert.equal(stepped[0]?.x, 5);
  assert.equal(stepped[0]?.pathId, "path-east");
  assert.deepEqual(engine.runtime.navigation.unregisterPath("path-east"), {
    removed: true,
    pathCount: 0,
  });
  engine.dispose();
});

test("runtime navigation registered paths honor constraints and non-loop completion", () => {
  const engine = createEngine({
    surface: createTestSurface(320, 180),
    backend: "headless",
  });

  const constrainedPath = engine.runtime.navigation.registerPath({
    id: "path-constrained",
    loop: false,
    nodes: [{ x: 0, z: 0 }, { x: 10, z: 0 }, { x: 20, z: 0 }],
    constraints: {
      arrivalTolerance: 0.5,
      maxStepDistance: 2,
    },
  });
  assert.deepEqual(constrainedPath.constraints, {
    arrivalTolerance: 0.5,
    maxStepDistance: 2,
  });

  engine.runtime.navigation.setAgents([
    { id: "agent-bound", kind: "car", x: 0, z: 0, yaw: 0, pathIndex: 0, speed: 10 },
  ]);
  const clamped = engine.runtime.navigation.stepPathAgents({
    deltaSeconds: 1,
    pathBindings: [{ agentId: "agent-bound", pathId: "path-constrained" }],
  });
  assert.equal(clamped[0]?.x, 2);
  assert.equal(clamped[0]?.pathIndex, 0);

  engine.runtime.navigation.setAgents([
    { id: "agent-bound", kind: "car", x: 9.75, z: 0, yaw: 0, pathIndex: 0, speed: 10 },
  ]);
  const arrived = engine.runtime.navigation.stepPathAgents({
    deltaSeconds: 1,
    pathBindings: [{ agentId: "agent-bound", pathId: "path-constrained" }],
  });
  assert.equal(arrived[0]?.pathIndex, 1);

  engine.runtime.navigation.setAgents([
    { id: "agent-bound", kind: "car", x: 20, z: 0, yaw: 0, pathIndex: 2, speed: 10 },
  ]);
  const completed = engine.runtime.navigation.stepPathAgents({
    deltaSeconds: 1,
    pathBindings: [{ agentId: "agent-bound", pathId: "path-constrained" }],
  });
  assert.equal(completed[0]?.x, 20);
  assert.equal(completed[0]?.pathIndex, 2);
  engine.dispose();
});

test("runtime world resolveCollision resolves penetration and damps velocity", () => {
  const engine = createEngine({
    surface: createTestSurface(320, 180),
    backend: "headless",
  });

  engine.runtime.world.setOpenWorldMap({
    mapSize: 400,
    obstacles: [{ id: "blocker", x: 0, z: 0, width: 40, depth: 40 }],
  });

  const resolved = engine.runtime.world.resolveCollision({
    x: 1,
    z: 1,
    radius: 5,
    velocityX: 10,
    velocityZ: -4,
  });
  assert.equal(resolved.collided, true);
  assert.equal(Math.hypot(resolved.velocityX, resolved.velocityZ) < Math.hypot(10, -4), true);

  const passthrough = engine.runtime.world.resolveCollision({
    x: 100,
    z: 100,
    radius: 3,
    velocityX: 1,
    velocityZ: 1,
  });
  assert.equal(passthrough.collided, false);
  assert.equal(passthrough.x, 100);
  assert.equal(passthrough.z, 100);
  engine.dispose();
});

test("runtime collision namespace stores obstacles and resolves collisions", () => {
  const engine = createEngine({
    surface: createTestSurface(320, 180),
    backend: "headless",
  });

  const obstacles = engine.runtime.collision.setObstacles([
    { id: "collision-blocker", x: 0, z: 0, width: 20, depth: 20 },
  ]);
  assert.equal(obstacles.length, 1);
  assert.deepEqual(engine.runtime.collision.getObstacles(), obstacles);
  assert.deepEqual(engine.runtime.world.getOpenWorldMap().obstacles, obstacles);

  const resolved = engine.runtime.collision.resolve({
    x: 0,
    z: 0,
    radius: 3,
    velocityX: 2,
    velocityZ: 0,
  });
  assert.equal(resolved.collided, true);
  assert.equal(resolved.velocityX, 0.7);
  engine.dispose();
});

test("runtime collision registry supports register, broadphase query, and unregister", () => {
  const engine = createEngine({
    surface: createTestSurface(320, 180),
    backend: "headless",
  });

  const first = engine.runtime.collision.registerCollider({
    id: "registry-a",
    x: 0,
    z: 0,
    width: 20,
    depth: 20,
  });
  const second = engine.runtime.collision.registerCollider({
    id: "registry-b",
    x: 80,
    z: 0,
    width: 20,
    depth: 20,
  });

  assert.deepEqual(engine.runtime.collision.getObstacles(), [first, second]);

  const query = engine.runtime.collision.queryAabb({
    x: 5,
    z: 0,
    width: 24,
    depth: 24,
  });
  assert.deepEqual(query.colliderIds, ["registry-a"]);
  assert.deepEqual(query.colliders, [first]);

  const removed = engine.runtime.collision.unregisterCollider("registry-a");
  assert.deepEqual(removed, { removed: true, colliderCount: 1 });
  assert.deepEqual(engine.runtime.collision.getObstacles(), [second]);
  engine.dispose();
});

test("runtime collision trigger evaluation emits deterministic enter stay exit events", () => {
  const engine = createEngine({
    surface: createTestSurface(320, 180),
    backend: "headless",
  });
  const delivered: unknown[] = [];
  engine.events.on("engine.collision.trigger", (payload) => {
    delivered.push(payload);
  });

  engine.runtime.collision.registerCollider({
    id: "trigger-a",
    x: 0,
    z: 0,
    width: 20,
    depth: 20,
  });

  const enter = engine.runtime.collision.evaluateTriggers({
    subjectId: "subject-a",
    x: 0,
    z: 0,
    radius: 2,
  });
  assert.deepEqual(enter.events, [
    { type: "enter", subjectId: "subject-a", colliderId: "trigger-a" },
  ]);

  const stay = engine.runtime.collision.evaluateTriggers({
    subjectId: "subject-a",
    x: 1,
    z: 0,
    radius: 2,
  });
  assert.deepEqual(stay.events, [
    { type: "stay", subjectId: "subject-a", colliderId: "trigger-a" },
  ]);

  const exit = engine.runtime.collision.evaluateTriggers({
    subjectId: "subject-a",
    x: 100,
    z: 0,
    radius: 2,
  });
  assert.deepEqual(exit.events, [
    { type: "exit", subjectId: "subject-a", colliderId: "trigger-a" },
  ]);
  assert.equal(delivered.length, 3);
  engine.dispose();
});
