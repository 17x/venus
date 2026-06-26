# `EngineClipShape` API

## Purpose

`EngineClipShape` represents render-facing inline clipping descriptors. Node
clips may reference another render node by id or embed a lightweight clip shape.

## Type Shape

```ts
type EngineClipShape =
  | {kind: 'rect'; rect: EngineRect; radius?: number}
  | {kind: 'path'; points: readonly EnginePoint[]; closed?: boolean}

interface EngineNodeClip {
  clipNodeId?: EngineNodeId
  clipShape?: EngineClipShape
  rule?: 'nonzero' | 'evenodd'
}
```

## Required Properties

Clip is optional. When `clip` is present, at least one of these properties must
be supplied by convention:

| Property | Type | Description |
| --- | --- | --- |
| `clip.clipNodeId` | `EngineNodeId` | Reusable graph clip source id. |
| `clip.clipShape` | `EngineClipShape` | Inline rectangular or path clip geometry. |

## Optional Supported Properties

| Property | Type | Description |
| --- | --- | --- |
| `clip.rule` | `'nonzero' | 'evenodd'` | Fill rule used by path clips. |
| `clipShape.kind` | `'rect' | 'path'` | Inline clip discriminator. |
| `clipShape.rect` | `EngineRect` | Rect clip bounds when `kind` is `'rect'`. |
| `clipShape.radius` | `number` | Rect clip corner radius. |
| `clipShape.points` | `readonly EnginePoint[]` | Path clip point list when `kind` is `'path'`. |
| `clipShape.closed` | `boolean` | Whether the path clip closes back to its start point. |

## Render Behavior

Renderers apply clip before drawing the clipped node. Inline clip shapes are
self-contained; `clipNodeId` allows graph-level reuse.

## Indexing Behavior

Clip fields should participate in geometry/index invalidation when they constrain
visible bounds. Exact clip-aware bounds are an API-first future refinement.

## Hit-Test Behavior

Scene-store hit-testing enforces inline `clipShape` geometry for rectangular and
path clips. `clipNodeId` remains a render-facing reuse descriptor and requires a
future API update before graph-referenced clip hit-testing is exact.

## Patch Behavior

Changing clip source, inline clip geometry, or rule invalidates geometry/style
depending on backend implementation.

## Cache Behavior

Cache keys should include clip id, inline clip geometry, and fill rule.

## Demo

```ts
const clippedImage = {
  id: 'image-clipped',
  type: 'image',
  x: 80,
  y: 80,
  width: 220,
  height: 140,
  assetId: 'hero-image',
  clip: {
    clipShape: {
      kind: 'rect',
      rect: {x: 100, y: 100, width: 180, height: 100},
      radius: 18,
    },
  },
} satisfies EngineImageNode

engine.loadScene({revision: 10, width: 640, height: 480, nodes: [clippedImage]})
await engine.renderFrame()
```

## Non-Goals

- Product mask group creation.
- Mask source lifecycle.
- Layer-panel mask semantics.
