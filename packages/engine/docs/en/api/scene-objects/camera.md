# Engine Camera API

## Purpose

Engine camera helpers provide backend-neutral project/unproject mechanics for
world-space and screen-space conversion.

## Type Shape

```ts
interface EngineRenderCamera {
  viewportWidth: number
  viewportHeight: number
  scale: number
  offsetX: number
  offsetY: number
  matrix: Mat3
  inverseMatrix: Mat3
}
```

## Required Properties

| Property | Type | Description |
| --- | --- | --- |
| `viewportWidth` | `number` | Viewport width in screen units. |
| `viewportHeight` | `number` | Viewport height in screen units. |
| `scale` | `number` | World-to-screen scale. |
| `offsetX` | `number` | World-space or camera offset x used by the camera matrix. |
| `offsetY` | `number` | World-space or camera offset y used by the camera matrix. |
| `matrix` | `Mat3` | World-to-screen matrix. |
| `inverseMatrix` | `Mat3` | Screen-to-world inverse matrix. |

## Optional Supported Properties

No optional camera properties are currently part of the public engine contract.
New camera properties require this API page, type tests, and projection tests to
be updated first.

## API

```ts
projectWorldPoint(point, camera)
unprojectScreenPoint(point, camera)
createRenderCameraProjector(camera)
```

## Render Behavior

Render backends consume projected coordinates or matrices derived from the
camera, but camera math lives under `core/camera`.

## Indexing Behavior

Camera changes do not change scene indexes; they affect viewport-dependent query
windows and render planning.

## Hit-Test Behavior

Pointer coordinates should be converted into scene/world coordinates before
scene-store hit-testing.

## Patch Behavior

Camera changes do not patch scene content. They invalidate frame planning and
render scheduling state.

## Cache Behavior

Camera changes may invalidate viewport-dependent cache entries but should not
invalidate scene content by themselves.

## Non-Goals

- App viewport UI ownership.
- Scroll/gesture policy.
- Product zoom controls.
