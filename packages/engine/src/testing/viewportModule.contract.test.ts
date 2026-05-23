import assert from "node:assert/strict";
import test from "node:test";

import { createEngineViewModule } from "../kernel/core/view/viewport-module";
import { createViewportFacade } from "../kernel/view/viewportFacade";

/**
 * Verifies core view module keeps canonical viewport facade behavior deterministic.
 */
test("view module viewport facade parity", () => {
  const viewModule = createEngineViewModule();
  let moduleState = {
    width: 640,
    height: 480,
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  };
  let canonicalState = {
    width: 640,
    height: 480,
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  };

  const fromModule = viewModule.createViewportFacade({
    getViewportState: () => moduleState,
    setViewportState: (next) => {
      moduleState = next;
    },
  });
  const fromCanonical = createViewportFacade({
    getViewportState: () => canonicalState,
    setViewportState: (next) => {
      canonicalState = next;
    },
  });

  assert.deepEqual(fromModule.setViewport({ scale: 2 }), fromCanonical.setViewport({ scale: 2 }));
  assert.deepEqual(fromModule.panBy(12, -8), fromCanonical.panBy(12, -8));
  assert.deepEqual(fromModule.zoomTo(1.5, { x: 100, y: 50 }), fromCanonical.zoomTo(1.5, { x: 100, y: 50 }));
  assert.deepEqual(fromModule.resize(800, 600), fromCanonical.resize(800, 600));
  assert.deepEqual(fromModule.getViewport(), fromCanonical.getViewport());
});
