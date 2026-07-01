# `EngineShapeNode` Rect API

## Purpose

`shape: 'rect'` represents rectangles and rounded rectangles.

## Type Shape

```ts
interface EngineShapeNode extends EngineNodeBase {
  type: 'shape'
  shape: 'rect'
  x: number
  y: number
  width: number
  height: number
  cornerRadius?: number
  cornerRadii?: EngineRectangleCornerRadii
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
| `shape` | `'rect'` | Shape geometry discriminator. |
| `x` | `number` | Local left coordinate. |
| `y` | `number` | Local top coordinate. |
| `width` | `number` | Local width. |
| `height` | `number` | Local height. |

## Optional Supported Properties

| Property | Type | Description |
| --- | --- | --- |
| `cornerRadius` | `number` | Uniform corner radius. |
| `cornerRadii.topLeft` | `number` | Top-left corner radius. |
| `cornerRadii.topRight` | `number` | Top-right corner radius. |
| `cornerRadii.bottomRight` | `number` | Bottom-right corner radius. |
| `cornerRadii.bottomLeft` | `number` | Bottom-left corner radius. |
| `fill` | `string` | Fill style. |
| `stroke` | `string` | Stroke style. |
| `strokeWidth` | `number` | Stroke width in world units. |
| `opacity` | `number` | Node opacity multiplier. |
| `blendMode` | `string` | Backend blend-mode hint. |
| `transform` | `EngineTransform2D` | Local-to-parent transform. |
| `shadow` | `EngineShadow` | Optional shadow hint. |
| `clip` | `EngineNodeClip` | Optional node clip. |

## Render Behavior

Render as a rectangle path. `cornerRadii` takes precedence over
`cornerRadius` when both are present.

## Indexing Behavior

The node is indexed by world bounds derived from `x`, `y`, `width`,
`height`, stroke expansion, and transform.

## Hit-Test Behavior

Hit-testing first uses AABB pruning, then exact rectangle or rounded-rectangle
fill/stroke geometry. Rounded corner cutouts should not hit when the pointer is
outside the rounded shape.

## Patch Behavior

Changing bounds or corner fields invalidates geometry. Changing fill/stroke
invalidates style.

## Cache Behavior

Geometry cache keys should include bounds, corner data, stroke width, clip, and
transform-affecting context.

## Demo

```ts
const rectNode = {
  id: 'rect-rounded',
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
} satisfies EngineShapeNode

engine.loadScene({revision: 3, width: 640, height: 480, nodes: [rectNode]})
await engine.renderFrame()
```

## Non-Goals

- Product rectangle creation tool state.
- Constraint or layout behavior.
