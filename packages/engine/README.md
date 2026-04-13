# `@venus/engine`

Framework-agnostic render engine layer for Venus.

## Owns

- renderer adapter contracts (`canvas2d`, `webgl`)
- engine frame scheduling and diagnostics contracts
- text/image/clip render node contracts
- frame-time and animation primitives

## Does Not Own

- persisted file-format semantics
- editor command/history protocols
- framework UI adapters

Use this package as the rendering engine foundation, while `@venus/runtime`
remains the editor runtime bridge.

## API Families

- `renderer`: backend-agnostic renderer contracts and diagnostics
- `scene`: renderable node model for text, text runs, image, clipping, and
  generic shape nodes (`rect` / `ellipse` / `line`)
- `time`: frame-clock contract and system clock
- `animation`: lightweight animation controller with pluggable easing
- `worker-mode`: capability detection and fallback policy selection

## Public API Policy

- Root export (`@venus/engine`) is the stable app/runtime-facing API surface.
- Root export keeps canonical `Engine*` mechanism names.
- Legacy non-prefixed aliases are available only via
  `@venus/engine/compat` as a migration bridge.
- Low-level worker bridge/protocol implementation stays internal to the package
  for now so consumer API remains small.
- Runtime/app layers should use `resolveEngineWorkerMode(...)` instead of
  re-implementing SAB/worker capability checks.

## Included Runtime Pieces

- `createEngine`: high-level facade (`scene + renderer + viewport + loop`)
-  default-first, with optional grouped config (`performance` / `render` /
  `resource` / `debug`)
-  batch-first writes through `applyScenePatchBatch(...)` and `transaction(...)`
-  clarity-first defaults: high-DPI pixel-ratio backing store for Canvas2D and
  WebGL antialias context request by default
- `createCanvas2DEngineRenderer`: built-in canvas2d renderer for standalone usage
- `createWebGLEngineRenderer`: built-in webgl renderer entry (shared plan/instance
  pipeline + minimal clear commit skeleton)
- `createEngineLoop`: minimal frame loop controller (`start/stop/renderOnce`)
- `resolveEngineWorkerMode`: unified fallback policy
  (`main-thread` / `worker-postmessage` / `worker-shared-memory`)

## Scene Mutation Direction

- Prefer batched scene writes over many small per-node updates
- Use `applyEngineScenePatchBatch(...)` when mutating mutable engine scene state
- Use `createEngineWorkerBridge(...).transaction(...)` or
  `applyScenePatchBatch(...)` when crossing the worker boundary
- Treat single `applyScenePatch(...)` calls as a compatibility path, not the
  long-term high-frequency editing API
- Use `createEngineSceneStore(...)` when runtime needs an engine-owned scene
  store that can initialize from a full scene snapshot and then evolve through
  batch patches/transactions
- Scene store keeps both:
  - a stable render snapshot with metadata versions for plan invalidation
  - a first-pass buffer layout skeleton for future Canvas2D/WebGL consumption
- Non-structural scene patches now try to update that buffer layout
  incrementally through dirty-node ids before falling back to a full rewrite.
- Render-plan preparation now prefers scene-store buffer layout data and only
  falls back to object traversal when layout/snapshot mismatch is detected.
- `prepareEngineRenderInstanceView(...)` now provides a typed-array instance
  surface (indices/transforms/bounds + batches) for upcoming WebGL backends.
- Canvas2D clip-by-node-id now resolves against prepared world-bounds ids
  directly, avoiding per-frame scene node-id index rebuild in the hot path.

## Typical Integration Steps

1. Build engine scene snapshot (`EngineSceneSnapshot`)
2. Create renderer (`createCanvas2DEngineRenderer`)
3. Create clock (`createSystemEngineClock`)
4. Drive rendering with `createEngineLoop`
5. (Optional) use `resolveEngineWorkerMode` to pick worker path/fallback

## Minimal Example

```ts
import {
  createEngine,
} from '@venus/engine'

const canvas = document.querySelector('canvas') as HTMLCanvasElement
const engine = createEngine({
  canvas,
  backend: 'canvas2d',
  render: {
    quality: 'full',
    canvasClearColor: '#ffffff',
    dpr: 'auto',
    pixelRatio: 'auto',
    maxPixelRatio: 2,
    imageSmoothing: true,
    imageSmoothingQuality: 'high',
  },
  performance: {
    culling: true,
  },
})

engine.loadScene({
  revision: 1,
  width: 800,
  height: 600,
  nodes: [
    {
      id: 'title',
      type: 'text',
      x: 80,
      y: 100,
      style: { fontFamily: 'sans-serif', fontSize: 28, fill: '#111' },
      text: 'Engine Ready',
    },
  ],
})

engine.start()
```

## Runtime DPR Control

```ts
// Clamp to max 2 and resolve by device pixel ratio
engine.setDpr('auto', {maxDpr: 2})

// Force lower DPR during heavy interaction for throughput
engine.setDpr(1)
```

## Advanced Example (Image + Clip + Batch Patch)

```ts
engine.applyScenePatchBatch({
  patches: [{
    revision: 2,
    upsertNodes: [
      {
        id: 'hero-image',
        type: 'image',
        x: 120,
        y: 160,
        width: 320,
        height: 200,
        assetId: 'asset:hero',
        sourceRect: {x: 0, y: 0, width: 640, height: 400},
        clip: {
          clipShape: {
            kind: 'rect',
            rect: {x: 140, y: 180, width: 260, height: 140},
            radius: 12,
          },
        },
      },
    ],
  }),
})

engine.renderFrame()
```
