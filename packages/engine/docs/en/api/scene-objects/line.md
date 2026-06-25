# `EngineShapeNode` Line API

## Purpose

`shape: 'line'` represents open line segments with optional arrowheads.

## Type Shape

```ts
interface EngineShapeNode extends EngineNodeBase {
  type: 'shape'
  shape: 'line'
  x: number
  y: number
  width: number
  height: number
  points?: readonly EnginePoint[]
  strokeStartArrowhead?: EngineStrokeArrowhead
  strokeEndArrowhead?: EngineStrokeArrowhead
  stroke?: string
  strokeWidth?: number
}
```

## Required Properties

| Property | Type | Description |
| --- | --- | --- |
| `id` | `EngineNodeId` | Stable render node id. |
| `type` | `'shape'` | Renderable node family discriminator. |
| `shape` | `'line'` | Shape geometry discriminator. |
| `x` | `number` | Fallback local left coordinate. |
| `y` | `number` | Fallback local top coordinate. |
| `width` | `number` | Fallback width used for diagonal endpoint generation. |
| `height` | `number` | Fallback height used for diagonal endpoint generation. |

## Optional Supported Properties

| Property | Type | Description |
| --- | --- | --- |
| `points` | `readonly EnginePoint[]` | Explicit line points. First and last points define endpoints today. |
| `strokeStartArrowhead` | `'none' | 'triangle' | 'diamond' | 'circle' | 'bar'` | Start arrowhead style. |
| `strokeEndArrowhead` | `'none' | 'triangle' | 'diamond' | 'circle' | 'bar'` | End arrowhead style. |
| `stroke` | `string` | Stroke style. |
| `strokeWidth` | `number` | Stroke width in world units. |
| `opacity` | `number` | Node opacity multiplier. |
| `blendMode` | `string` | Backend blend-mode hint. |
| `transform` | `EngineTransform2D` | Local-to-parent transform. |
| `shadow` | `EngineShadow` | Optional shadow hint. |
| `clip` | `EngineNodeClip` | Optional node clip. |

## Render Behavior

When `points` has at least two entries, render from the first point to the last
point. Otherwise render the diagonal from `x/y` to `x + width/y + height`.

## Indexing Behavior

The node is indexed by endpoint bounds expanded by stroke width and transformed
into world space.

## Hit-Test Behavior

Currently hit-tested through bounds with tolerance. Stroke-distance exact
hit-testing should be specified before implementation.

## Patch Behavior

Changing points, bounds, or arrowheads invalidates geometry. Changing stroke
style invalidates style.

## Cache Behavior

Geometry cache keys should include endpoints, arrowheads, stroke width, clip, and
transform-affecting context.

## Non-Goals

- Connector routing semantics.
- Anchoring to product objects.
