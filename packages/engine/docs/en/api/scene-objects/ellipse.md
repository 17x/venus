# `EngineShapeNode` Ellipse API

## Purpose

`shape: 'ellipse'` represents ellipses, circles, and arc sectors.

## Type Shape

```ts
interface EngineShapeNode extends EngineNodeBase {
  type: 'shape'
  shape: 'ellipse'
  x: number
  y: number
  width: number
  height: number
  ellipseStartAngle?: number
  ellipseEndAngle?: number
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
| `shape` | `'ellipse'` | Shape geometry discriminator. |
| `x` | `number` | Local left coordinate of the ellipse bounds. |
| `y` | `number` | Local top coordinate of the ellipse bounds. |
| `width` | `number` | Bounds width. |
| `height` | `number` | Bounds height. |

## Optional Supported Properties

| Property | Type | Description |
| --- | --- | --- |
| `ellipseStartAngle` | `number` | Arc start angle in degrees. |
| `ellipseEndAngle` | `number` | Arc end angle in degrees. |
| `fill` | `string` | Fill style. |
| `stroke` | `string` | Stroke style. |
| `strokeWidth` | `number` | Stroke width in world units. |
| `opacity` | `number` | Node opacity multiplier. |
| `blendMode` | `string` | Backend blend-mode hint. |
| `transform` | `EngineTransform2D` | Local-to-parent transform. |
| `shadow` | `EngineShadow` | Optional shadow hint. |
| `clip` | `EngineNodeClip` | Optional node clip. |

## Render Behavior

Render a full ellipse when arc angles are omitted. Render a partial arc/sector
when arc fields are supplied by the caller and supported by the backend.

## Indexing Behavior

The node is indexed by world bounds derived from its bounds, stroke expansion,
and transform.

## Hit-Test Behavior

Currently hit-tested through local/world bounds with tolerance. Exact ellipse and
arc hit-testing should be added through API-first tests before implementation.

## Patch Behavior

Changing bounds or arc angles invalidates geometry. Changing fill/stroke
invalidates style.

## Cache Behavior

Geometry cache keys should include bounds, arc angles, stroke width, clip, and
transform-affecting context.

## Non-Goals

- Product arc editing UI.
- Parametric circle constraints.
