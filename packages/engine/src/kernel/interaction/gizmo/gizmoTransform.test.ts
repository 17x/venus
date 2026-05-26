import assert from "node:assert/strict";
import test from "node:test";

import { createEngineGizmoTransformPipeline } from "./gizmoTransform";

/** Verifies default gizmo mode is translate. */
test("default gizmo mode is translate", () => {
  const gizmo = createEngineGizmoTransformPipeline();
  assert.equal(gizmo.getMode(), "translate");
});

/** Verifies setMode changes the active gizmo mode. */
test("setMode changes gizmo mode", () => {
  const gizmo = createEngineGizmoTransformPipeline();
  gizmo.setMode("rotate");
  assert.equal(gizmo.getMode(), "rotate");
  gizmo.setMode("scale");
  assert.equal(gizmo.getMode(), "scale");
});

/** Verifies default space is world and toggleSpace switches to local. */
test("toggleSpace switches between world and local", () => {
  const gizmo = createEngineGizmoTransformPipeline();
  assert.equal(gizmo.getSpace(), "world");
  gizmo.toggleSpace();
  assert.equal(gizmo.getSpace(), "local");
  gizmo.toggleSpace();
  assert.equal(gizmo.getSpace(), "world");
});

/** Verifies pointer near gizmo origin on x-axis resolves to x constraint. */
test("pointer near origin on x-axis resolves to x axis", () => {
  const gizmo = createEngineGizmoTransformPipeline();
  // Pointer slightly to the right of gizmo origin in normalized coords.
  const axis = gizmo.resolveGizmoAxis(0.03, 0, 0, 0, 0, 800, 600);
  assert.equal(axis, "x");
});

/** Verifies pointer far from gizmo origin resolves to free. */
test("pointer far from gizmo origin resolves to free", () => {
  const gizmo = createEngineGizmoTransformPipeline();
  const axis = gizmo.resolveGizmoAxis(0.5, 0.5, 0, 0, 0, 800, 600);
  assert.equal(axis, "free");
});

/** Verifies drag state accumulates translation delta. */
test("drag state accumulates translation delta", () => {
  const gizmo = createEngineGizmoTransformPipeline();

  gizmo.startDrag(0, 0, "x", 0, 0, 0);
  const state = gizmo.updateDrag(0.1, 0.05);

  assert.equal(state.mode, "translate");
  assert.equal(state.axis, "x");
  assert.ok(state.deltaX > 0, "deltaX should be positive for rightward drag");
  assert.equal(Math.abs(state.deltaY), 0, "deltaY should be zero when constrained to X axis");
});

/** Verifies not dragging returns false before startDrag. */
test("isDragging returns false before drag starts", () => {
  const gizmo = createEngineGizmoTransformPipeline();
  assert.equal(gizmo.isDragging(), false);
  assert.equal(gizmo.getDragState(), null);
});

/** Verifies endDrag clears drag state and returns final values. */
test("endDrag clears drag state and returns final values", () => {
  const gizmo = createEngineGizmoTransformPipeline();

  gizmo.startDrag(0, 0, "y", 0, 0, 0);
  gizmo.updateDrag(0, 0.2);
  const finalState = gizmo.endDrag();

  assert.ok(finalState.deltaY < 0, "deltaY should be negative for upward drag");
  assert.equal(gizmo.isDragging(), false);
});

/** Verifies scale mode accumulates scale factor. */
test("scale mode accumulates scale factor", () => {
  const gizmo = createEngineGizmoTransformPipeline();
  gizmo.setMode("scale");

  gizmo.startDrag(0, 0, "x", 0, 0, 0);
  const state = gizmo.updateDrag(0.1, 0);

  assert.equal(state.mode, "scale");
  assert.ok(state.deltaScale > 1, "scale factor should exceed 1 for rightward drag");
});
