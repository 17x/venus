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

Currently hit-tested through bounds. Exact path fill/stroke hit-testing should
be specified with path fixtures before implementation.

## Patch Behavior

Changing path points, bezier handles, closure, arrowheads, or bounds invalidates
geometry. Changing fill/stroke invalidates style.

## Cache Behavior

Geometry cache keys should include bezier/point geometry, closure, arrowheads,
stroke width, clip, and simplification-related counts.

## Non-Goals

- Pen tool state.
- Segment selection UI.
- Boolean path operations.
