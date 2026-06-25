# Engine Cache API

## Purpose

Engine cache APIs define backend-neutral geometry and tile cache contracts.
Renderer backends may store backend-specific payloads in these caches, but the
cache key contracts live under `core/cache`.

## Geometry Cache API

```ts
interface GeometryCacheEntry<TValue> {
  key: string
  value: TValue
}

class GeometryCache<TValue> {
  get(key: string): TValue | null
  set(entry: GeometryCacheEntry<TValue>): void
  delete(key: string): void
  clear(): void
}
```

## Tile Cache API

```ts
interface LayeredTileCacheKey {
  x: number
  y: number
  zoomBucket: number
}

class LayeredTileCache<TValue> {
  get(key: LayeredTileCacheKey): TValue | null
  set(key: LayeredTileCacheKey, value: TValue): void
  delete(key: LayeredTileCacheKey): void
  clear(): void
}
```

## Required Properties

| Property | Type | Description |
| --- | --- | --- |
| `GeometryCacheEntry.key` | `string` | Stable geometry cache key. |
| `GeometryCacheEntry.value` | `TValue` | Cached geometry payload. |
| `LayeredTileCacheKey.x` | `number` | Tile x coordinate. |
| `LayeredTileCacheKey.y` | `number` | Tile y coordinate. |
| `LayeredTileCacheKey.zoomBucket` | `number` | Zoom bucket used for tile reuse. |

## Optional Supported Properties

Cache payload value types are generic and backend-defined. No optional key
properties are currently supported.

## Render Behavior

Renderers may use caches to avoid rebuilding geometry or tile payloads. Cache
contracts do not prescribe backend resource lifetime.

## Indexing Behavior

Cache objects do not directly participate in scene indexing.

## Hit-Test Behavior

Cache APIs do not define hit-test behavior directly. Hit-test can consume cached
geometry only after an explicit API and invalidation rule is documented.

## Patch Behavior

Scene patches should invalidate affected cache entries through dirty node ids,
removed node ids, revision, or backend-specific cache keys.

## Cache Behavior

`toLayeredTileCacheSignature` creates stable tile signatures from tile coords
and zoom bucket.

## Non-Goals

- GPU texture ownership.
- WebGL resource cleanup.
- Product document cache policy.
