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

Hit-testing first uses AABB pruning, then exact polygon fill and edge/stroke
geometry. Polygon point order defines the closed contour.

## Patch Behavior

Changing points, closure, or bounds invalidates geometry. Changing fill/stroke
invalidates style.

## Cache Behavior

Geometry cache keys should include point list, closed state, stroke width, clip,
and transform-affecting context.

## Demo

```ts
const polygonNode = {
  id: 'polygon-1',
  type: 'shape',
  shape: 'polygon',
  x: 80,
  y: 60,
  width: 160,
  height: 140,
  points: [
    {x: 160, y: 60},
    {x: 240, y: 130},
    {x: 205, y: 200},
    {x: 95, y: 190},
    {x: 80, y: 95},
  ],
  fill: '#dcfce7',
  stroke: '#16a34a',
  strokeWidth: 3,
  closed: true,
} satisfies EngineShapeNode

engine.loadScene({revision: 6, width: 640, height: 480, nodes: [polygonNode]})
await engine.renderFrame()
```

## Non-Goals

- Product polygon generator settings.
- Boolean operation semantics.
