# Engine API Catalog

This page groups the public and engine-owned API surface by job. Start here
when deciding which API to use before writing implementation code.

## Runtime and Rendering

Use these APIs when embedding the engine into a host canvas.

| API | Page | Demo |
| --- | --- | --- |
| `createEngine` | [`../api-reference.md`](../api-reference.md) | Create a canvas runtime, load a scene, resize, render one frame. |
| `EngineSceneSnapshot` | [`scene-objects/scene-snapshot.md`](./scene-objects/scene-snapshot.md) | Build the render-facing scene payload consumed by `createEngine`. |

```ts
import {createEngine, type EngineSceneSnapshot} from '@venus/engine'

const scene: EngineSceneSnapshot = {
  revision: 1,
  width: 640,
  height: 480,
  nodes: [],
}

const engine = createEngine({
  canvas,
  initialScene: scene,
  render: {backend: 'canvas2d'},
})

engine.resize({
  viewportWidth: canvas.clientWidth,
  viewportHeight: canvas.clientHeight,
  outputWidth: canvas.width,
  outputHeight: canvas.height,
})

await engine.renderFrame()
```

## Scene Object APIs

Use these APIs to describe renderable scene content.

| Category | APIs | Pages |
| --- | --- | --- |
| Structure | `EngineSceneSnapshot`, `EngineGroupNode` | [`scene-snapshot`](./scene-objects/scene-snapshot.md), [`group`](./scene-objects/group.md) |
| Shapes | `rect`, `ellipse`, `line`, `polygon`, `path` | [`rect`](./scene-objects/rect.md), [`ellipse`](./scene-objects/ellipse.md), [`line`](./scene-objects/line.md), [`polygon`](./scene-objects/polygon.md), [`path`](./scene-objects/path.md) |
| Content | `EngineTextNode`, `EngineImageNode` | [`text`](./scene-objects/text.md), [`image`](./scene-objects/image.md) |
| Constraints | `EngineClipShape` | [`clip`](./scene-objects/clip.md) |

```ts
const nodes = [
  {
    id: 'rect-1',
    type: 'shape',
    shape: 'rect',
    x: 40,
    y: 40,
    width: 160,
    height: 96,
    cornerRadius: 16,
    fill: '#dbeafe',
    stroke: '#2563eb',
    strokeWidth: 2,
  },
  {
    id: 'text-1',
    type: 'text',
    x: 40,
    y: 180,
    text: 'Engine API',
    style: {
      fontFamily: 'system-ui',
      fontSize: 24,
      fill: '#111827',
    },
  },
] satisfies EngineSceneSnapshot['nodes']
```

## Hit-Test and Query APIs

Use these APIs to inspect scene content from pointer coordinates.

| API | Owner | Demo |
| --- | --- | --- |
| `hitTest(point, tolerance?)` | Runtime facade | Resolve the primary clicked or hovered node. |
| `queryPointCandidates(point, tolerance?)` | Runtime facade | Show coarse AABB candidates before exact geometry checks. |
| `prepareHitPlan(point, tolerance?)` | Runtime facade | Inspect candidate count, exact-check count, and primary hit. |

```ts
const point = {x: 120, y: 88}
const hover = engine.hitTest(point, 10)
const clicked = engine.hitTest(point, 6)
const candidates = engine.queryPointCandidates(point, 10)
const plan = engine.prepareHitPlan(point, 10)

console.log({
  hover: hover?.nodeId ?? null,
  clicked: clicked?.nodeId ?? null,
  candidates,
  exactCheckCount: plan.exactCheckCount,
})
```

## Camera and Cache APIs

Use these APIs when integrating viewport math or backend-neutral caches.

| Category | APIs | Pages |
| --- | --- | --- |
| Camera | `projectWorldPoint`, `unprojectScreenPoint`, `createRenderCameraProjector` | [`camera`](./scene-objects/camera.md) |
| Cache | `GeometryCache`, `LayeredTileCache`, `toLayeredTileCacheSignature` | [`cache`](./scene-objects/cache.md) |

```ts
const worldPoint = unprojectScreenPoint({x: 200, y: 120}, camera)
const screenPoint = projectWorldPoint(worldPoint, camera)

const cache = new GeometryCache<Path2D>()
cache.set({key: 'node-1:v1', value: path})
```

## Local Demo

Run the package-local HTML demo to inspect rendering and hit-test diagnostics:

```sh
pnpm -C packages/engine demo
```

Open `http://127.0.0.1:5173/demo/`. The demo renders the current object set and
shows render, self-test, hover hit-test, and clicked hit-test panels on the
right side.
