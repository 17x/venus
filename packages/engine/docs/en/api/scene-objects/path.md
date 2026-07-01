# `EngineShapeNode` Path API

## Purpose

`shape: 'path'` represents custom point or bezier geometry.

## Type Shape

```ts
interface EngineShapeNode extends EngineNodeBase {
  type: 'shape'
  shape: 'path'
  x: number
  y: number
  width: number
  height: number
  points?: readonly EnginePoint[]
  bezierPoints?: readonly EngineBezierPoint[]
  pointCount?: number
  bezierPointCount?: number
  closed?: boolean
  strokeStartArrowhead?: EngineStrokeArrowhead
  strokeEndArrowhead?: EngineStrokeArrowhead
  fill?: string
  stroke?: string
  strokeWidth?: number
}
```

## Required Properties

| Property | Type | Description |
| --- | --- | --- |
| `id` | `EngineNodeId` | Stable render node id. |
| `type` | `'shape'` | Renderable node family discriminator. |
| `shape` | `'path'` | Shape geometry discriminator. |
| `x` | `number` | Fallback local left coordinate. |
| `y` | `number` | Fallback local top coordinate. |
| `width` | `number` | Fallback bounds width. |
| `height` | `number` | Fallback bounds height. |

## Optional Supported Properties

| Property | Type | Description |
| --- | --- | --- |
| `points` | `readonly EnginePoint[]` | Ordered straight-line points. |
| `bezierPoints` | `readonly EngineBezierPoint[]` | Bezier anchors with optional control points. Preferred when present. |
| `pointCount` | `number` | Optional point-count hint for buffer-backed payloads. |
| `bezierPointCount` | `number` | Optional bezier point-count hint for buffer-backed payloads. |
| `closed` | `boolean` | Whether the path closes back to its start point. |
| `strokeStartArrowhead` | `'none' | 'triangle' | 'diamond' | 'circle' | 'bar'` | Start arrowhead style for open paths. |
| `strokeEndArrowhead` | `'none' | 'triangle' | 'diamond' | 'circle' | 'bar'` | End arrowhead style for open paths. |
| `fill` | `string` | Fill style. |
| `stroke` | `string` | Stroke style. |
| `strokeWidth` | `number` | Stroke width in world units. |
| `opacity` | `number` | Node opacity multiplier. |
| `blendMode` | `string` | Backend blend-mode hint. |
| `transform` | `EngineTransform2D` | Local-to-parent transform. |
| `shadow` | `EngineShadow` | Optional shadow hint. |
| `clip` | `EngineNodeClip` | Optional node clip. |

## Render Behavior

Prefer `bezierPoints` when present. Fall back to `points`. Close the path when
`closed` is true.

## Indexing Behavior

The node is indexed by path geometry bounds or fallback bounds, expanded by
stroke width and transformed into world space.

## Hit-Test Behavior

Hit-testing first uses AABB pruning, then exact path fill/stroke geometry.
Open paths hit only their stroke area. Closed paths may hit fill and stroke
areas. Bezier paths are sampled with tolerance-aware density.

## Patch Behavior

Changing path points, bezier handles, closure, arrowheads, or bounds invalidates
geometry. Changing fill/stroke invalidates style.

## Cache Behavior

Geometry cache keys should include bezier/point geometry, closure, arrowheads,
stroke width, clip, and simplification-related counts.

## Demo

```ts
const pathNode = {
  id: 'path-bezier',
  type: 'shape',
  shape: 'path',
  x: 60,
  y: 160,
  width: 260,
  height: 120,
  bezierPoints: [
    {anchor: {x: 60, y: 260}},
    {anchor: {x: 320, y: 180}, cp1: {x: 140, y: 110}, cp2: {x: 240, y: 330}},
  ],
  stroke: '#7c3aed',
  strokeWidth: 5,
  strokeEndArrowhead: 'diamond',
} satisfies EngineShapeNode

engine.loadScene({revision: 7, width: 640, height: 480, nodes: [pathNode]})
await engine.renderFrame()
```

## Non-Goals

- Pen tool state.
- Segment selection UI.
- Boolean path operations.
