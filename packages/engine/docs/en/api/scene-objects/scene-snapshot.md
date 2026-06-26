# `EngineSceneSnapshot` API

## Purpose

`EngineSceneSnapshot` is the render-facing scene payload accepted by the engine.
It is a compact scene graph for rendering, indexing, hit-testing, planning, and
cache invalidation. It is not a product document format.

## Type Shape

```ts
interface EngineSceneSnapshot {
  revision: string | number
  width: number
  height: number
  nodes: readonly EngineRenderableNode[]
  metadata?: EngineSceneSnapshotMetadata
}

interface EngineSceneSnapshotMetadata {
  planVersion?: number
  bufferVersion?: number
  dirtyNodeIds?: readonly EngineNodeId[]
  removedNodeIds?: readonly EngineNodeId[]
  bufferLayout?: EngineSceneBufferLayout
}
```

## Required Properties

| Property | Type | Description |
| --- | --- | --- |
| `revision` | `string | number` | Render-content revision. Change it whenever render-relevant content changes. |
| `width` | `number` | Scene width in world units. |
| `height` | `number` | Scene height in world units. |
| `nodes` | `readonly EngineRenderableNode[]` | Ordered top-level renderable nodes. Later nodes are visually higher unless a backend plan changes layering. |

## Optional Supported Properties

| Property | Type | Description |
| --- | --- | --- |
| `metadata.planVersion` | `number` | Planning version used to invalidate frame/hit plans. |
| `metadata.bufferVersion` | `number` | Scene buffer layout version. |
| `metadata.dirtyNodeIds` | `readonly EngineNodeId[]` | Render-relevant dirty nodes. |
| `metadata.removedNodeIds` | `readonly EngineNodeId[]` | Render nodes removed since the prior revision. |
| `metadata.bufferLayout` | `EngineSceneBufferLayout` | Engine-owned typed-buffer layout metadata. |

## Render Behavior

Renderers consume `nodes` in order. A renderer may internally build plans,
batches, or tiles, but the snapshot remains the public scene input.

## Indexing Behavior

The scene store indexes every top-level renderable node and nested group child.
Group bounds are derived from child union bounds.

## Hit-Test Behavior

Scene-level hit-test operates on engine render nodes. Product selection policy,
locked-state filtering, and editing-mode behavior belong outside engine.

## Patch Behavior

Use `loadScene` for full replacement and `applyScenePatchBatch` or
`transaction` for incremental updates.

## Cache Behavior

`revision`, `planVersion`, `bufferVersion`, `dirtyNodeIds`, and
`removedNodeIds` are cache invalidation inputs.

## Demo

```ts
import {createEngine, type EngineSceneSnapshot} from '@venus/engine'

const scene: EngineSceneSnapshot = {
  revision: 1,
  width: 640,
  height: 480,
  nodes: [
    {
      id: 'rect-1',
      type: 'shape',
      shape: 'rect',
      x: 40,
      y: 40,
      width: 160,
      height: 96,
      fill: '#dbeafe',
    },
  ],
}

const engine = createEngine({
  canvas,
  initialScene: scene,
  render: {backend: 'canvas2d'},
})

await engine.renderFrame()
```

## Non-Goals

- Product file format.
- Undo/redo history.
- Collaboration protocol.
- Tool state or editor UI state.
