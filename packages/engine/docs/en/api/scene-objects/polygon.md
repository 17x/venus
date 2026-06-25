# `EngineShapeNode` Polygon API

## Purpose

`shape: 'polygon'` represents closed point-list geometry.

## Type Shape

```ts
interface EngineShapeNode extends EngineNodeBase {
  type: 'shape'
  shape: 'polygon'
  x: number
  y: number
  width: number
  height: number
  points?: readonly EnginePoint[]
  closed?: boolean
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
| `shape` | `'polygon'` | Shape geometry discriminator. |
| `x` | `number` | Fallback local left coordinate. |
| `y` | `number` | Fallback local top coordinate. |
| `width` | `number` | Fallback bounds width. |
| `height` | `number` | Fallback bounds height. |

## Optional Supported Properties

| Property | Type | Description |
| --- | --- | --- |
| `points` | `readonly EnginePoint[]` | Ordered polygon points. |
| `closed` | `boolean` | Closure hint. Polygon renderers should treat polygons as closed even when omitted. |
| `fill` | `string` | Fill style. |
| `stroke` | `string` | Stroke style. |
| `strokeWidth` | `number` | Stroke width in world units. |
| `opacity` | `number` | Node opacity multiplier. |
| `blendMode` | `string` | Backend blend-mode hint. |
| `transform` | `EngineTransform2D` | Local-to-parent transform. |
| `shadow` | `EngineShadow` | Optional shadow hint. |
| `clip` | `EngineNodeClip` | Optional node clip. |

## Render Behavior

Render ordered points as a closed polygon. Fill and stroke apply when present.
Fallback bounds may be used when point data is unavailable.

## Indexing Behavior

The node is indexed by point bounds or fallback bounds, expanded by stroke width
and transformed into world space.

## Hit-Test Behavior

Currently hit-tested through bounds. Exact polygon fill/stroke hit-testing is a
future API-first refinement.

## Patch Behavior

Changing points, closure, or bounds invalidates geometry. Changing fill/stroke
invalidates style.

## Cache Behavior

Geometry cache keys should include point list, closed state, stroke width, clip,
and transform-affecting context.

## Non-Goals

- Product polygon generator settings.
- Boolean operation semantics.
