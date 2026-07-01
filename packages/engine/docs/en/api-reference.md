# Engine API Reference

This reference covers the public `@venus/engine` entrypoint. The package is a
rendering and hit-test mechanism layer. It does not replace a product document
model, command system, or editor UI framework.

## Imports

```ts
import {
  createEngine,
  ENGINE_RENDERABLE_NODE_TYPES,
  ENGINE_SHAPE_TYPES,
  type EngineSceneSnapshot,
} from '@venus/engine'
```

## Scene Registries

### `ENGINE_RENDERABLE_NODE_TYPES`

Renderable node families accepted by `EngineSceneSnapshot`:

```ts
['group', 'shape', 'text', 'image']
```

### `ENGINE_SHAPE_TYPES`

Shape geometry kinds accepted by `EngineShapeNode`:

```ts
['rect', 'ellipse', 'line', 'polygon', 'path']
```

## `EngineSceneSnapshot`

```ts
const scene: EngineSceneSnapshot = {
  revision: 1,
  width: 800,
  height: 600,
  nodes: [],
}
```

Core fields:

- `revision`: render-relevant revision.
- `width`, `height`: scene dimensions.
- `nodes`: ordered renderable node tree.
- `metadata`: optional engine plan/buffer metadata.

## `createEngine(options)`

Creates an engine runtime bound to a canvas.

```ts
const engine = createEngine({
  canvas,
  initialScene: scene,
  render: {
    backend: 'canvas2d',
    quality: 'full',
    dpr: 'auto',
    maxPixelRatio: 2,
  },
})
```

Important options:

- `canvas`: `HTMLCanvasElement` or `OffscreenCanvas`.
- `initialScene`: optional first `EngineSceneSnapshot`.
- `viewport`: initial camera state.
- `performance`: culling, tiles, LOD, and overscan options.
- `render.backend`: `'webgl'` by default, or `'canvas2d'` for deterministic
  local demos and fallback rendering.
- `render`: quality, DPR, WebGL, initial render, tile, and preview options.
- `resource.loader.resolveImage`: image asset resolver.
- `debug.onStats`: render stats callback.

## Scene Methods

### `loadScene(scene)`

Replaces render-facing scene content.

```ts
engine.loadScene(scene)
```

### `applyScenePatchBatch(batch)`

Applies render-facing incremental scene updates.

```ts
engine.applyScenePatchBatch({
  patches: [
    {
      revision: 2,
      upsertNodes: [nextNode],
    },
  ],
})
```

### `transaction(run, options?)`

Builds a deterministic scene patch batch from high-level insert/update/remove
operations.

```ts
engine.transaction((tx) => {
  tx.updateNodes([nextNode])
}, {revision: 3})
```

## Camera and Render Methods

```ts
engine.resize({
  viewportWidth: 800,
  viewportHeight: 600,
  outputWidth: 800 * devicePixelRatio,
  outputHeight: 600 * devicePixelRatio,
})
engine.setViewport({offsetX: 0, offsetY: 0, scale: 1})
await engine.renderFrame()
```

Common methods:

- `resize(size)`
- `setViewport(viewport)`
- `panBy(deltaX, deltaY)`
- `zoomTo(scale, anchor?)`
- `renderFrame()`
- `markDirtyBounds(bounds, zoomLevel?)`

## Query and Hit-Test Methods

```ts
const candidates = engine.query({x: 0, y: 0, width: 200, height: 200})
const pointCandidates = engine.queryPointCandidates({x: 40, y: 40}, 4)
const hit = engine.hitTest({x: 40, y: 40}, 4)
```

Common methods:

- `query(bounds)`
- `queryViewportCandidates(padding?)`
- `queryPointCandidates(point, tolerance?)`
- `hitTest(point, tolerance?)`
- `prepareFramePlan(padding?)`
- `prepareHitPlan(point, tolerance?)`

## Local Rendering Demo

Run the package-local demo to inspect the current Canvas2D rendering capability:

```sh
pnpm -C packages/engine demo
```

Then open `http://127.0.0.1:5173/demo/`.

## Diagnostics

```ts
const diagnostics = engine.getDiagnostics()
```

Diagnostics include render stats, pixel ratio, scene store status, frame plan,
hit plan, shortlist state, viewport, camera animation, and strategy state.

## Boundaries

- Use app/runtime adapters to map product objects into `EngineSceneSnapshot`.
- Do not persist `EngineSceneSnapshot` as the product file format.
- Apply product policies such as locked/hidden, isolation, selection mode, and
  command history outside engine.
