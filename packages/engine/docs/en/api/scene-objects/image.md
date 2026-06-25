# `EngineImageNode` API

## Purpose

`EngineImageNode` represents asset-backed raster rendering, crop source data,
smoothing hints, image bounds, clips, and hit bounds.

## Type Shape

```ts
interface EngineImageNode extends EngineNodeBase {
  type: 'image'
  x: number
  y: number
  width: number
  height: number
  assetId: string
  sourceRect?: EngineRect
  naturalSize?: {width: number; height: number}
  imageSmoothing?: boolean
}
```

## Required Properties

| Property | Type | Description |
| --- | --- | --- |
| `id` | `EngineNodeId` | Stable render node id. |
| `type` | `'image'` | Renderable node family discriminator. |
| `x` | `number` | Local left coordinate. |
| `y` | `number` | Local top coordinate. |
| `width` | `number` | Rendered width. |
| `height` | `number` | Rendered height. |
| `assetId` | `string` | Asset/resource id resolved by caller-provided resource mechanisms. |

## Optional Supported Properties

| Property | Type | Description |
| --- | --- | --- |
| `sourceRect.x` | `number` | Source crop left coordinate. |
| `sourceRect.y` | `number` | Source crop top coordinate. |
| `sourceRect.width` | `number` | Source crop width. |
| `sourceRect.height` | `number` | Source crop height. |
| `naturalSize.width` | `number` | Intrinsic asset width. |
| `naturalSize.height` | `number` | Intrinsic asset height. |
| `imageSmoothing` | `boolean` | Backend image smoothing hint. |
| `opacity` | `number` | Node opacity multiplier. |
| `blendMode` | `string` | Backend blend-mode hint. |
| `transform` | `EngineTransform2D` | Local-to-parent transform. |
| `shadow` | `EngineShadow` | Optional shadow hint. |
| `clip` | `EngineNodeClip` | Optional node clip. |

## Render Behavior

Resolve `assetId` through caller-provided engine resource mechanisms. Draw
`sourceRect` when present; otherwise draw the whole resolved image.

## Indexing Behavior

The node is indexed by image bounds expanded by transform and clip context when
applicable.

## Hit-Test Behavior

Hit-tested through image bounds with tolerance.

## Patch Behavior

Changing bounds or `sourceRect` invalidates geometry. Changing `assetId`,
`naturalSize`, smoothing, or clip invalidates resource/render state.

## Cache Behavior

Cache keys should include `assetId`, `sourceRect`, `naturalSize`,
`imageSmoothing`, clip, and transform-affecting context.

## Non-Goals

- Asset persistence.
- Upload UI.
- Product media library.
