# @venus/lib

`@venus/lib` is the shared low-level foundation package for Venus.

## Responsibility

- Own package-agnostic primitives and utility contracts.
- Provide reusable modules for math, geometry, ids, events, lifecycle, scheduler,
  patch helpers, collections, logger, worker base contracts, serialization, and
  assertions.
- Stay independent from product semantics and rendering implementations.

## Modules

- `@venus/lib/math`: matrix and point primitives.
- `@venus/lib/geometry`: normalized bounds and rectangle helpers.
- `@venus/lib/ids`: short non-cryptographic id helpers.
- `@venus/lib/events`: lightweight event emitter primitives.
- `@venus/lib/lifecycle`: disposable resource contracts.
- `@venus/lib/scheduler`: single-flight frame scheduler primitives.
- `@venus/lib/patch`: patch classification and batch apply helpers.
- `@venus/lib/collections`: map/set helper utilities.
- `@venus/lib/logger`: level-filtered logger primitives.
- `@venus/lib/worker`: worker capability and rpc envelope helpers.
- `@venus/lib/serialization`: safe JSON parse/stringify helpers.
- `@venus/lib/assert`: invariant and exhaustive-guard assertions.
- `@venus/lib/viewport`: shared viewport, pan, and zoom interaction primitives.

## API Usage

### `@venus/lib/math`

```ts
import {
  applyAffineMatrixToPoint,
  createAffineMatrixAroundPoint,
  invertAffineMatrix,
  multiplyAffineMatrices,
  type AffineMatrix,
  type Mat3,
} from '@venus/lib/math'

const legacyMatrix: Mat3 = [1, 0, 12, 0, 1, 24, 0, 0, 1]
const matrix: AffineMatrix = createAffineMatrixAroundPoint(
  {x: 100, y: 60},
  {rotationDegrees: 30, scaleX: 1, scaleY: -1},
)
const inverse = invertAffineMatrix(matrix)
const stable = multiplyAffineMatrices(matrix, inverse)
const point = applyAffineMatrixToPoint(matrix, {x: 10, y: 20})
```

### `@venus/lib/geometry`

```ts
import {
  getNormalizedBoundsFromBox,
  intersectNormalizedBounds,
  isPointInsideRotatedBounds,
} from '@venus/lib/geometry'

const a = getNormalizedBoundsFromBox(10, 10, -40, 20)
const hit = intersectNormalizedBounds(a, {minX: -20, minY: 0, maxX: 20, maxY: 20})
const inside = isPointInsideRotatedBounds(
  {x: 0, y: 10},
  {minX: -20, minY: 0, maxX: 20, maxY: 20},
  45,
)
```

### `@venus/lib/ids`

```ts
import {createNid} from '@venus/lib/ids'

const nodeId = createNid(8)
```

### `@venus/lib/events`

```ts
import {createEventEmitter} from '@venus/lib/events'

const emitter = createEventEmitter<{id: string}>()
const dispose = emitter.on((payload) => console.log(payload.id))
emitter.emit({id: 'n1'})
dispose()
```

### `@venus/lib/lifecycle`

```ts
import {DisposableStore} from '@venus/lib/lifecycle'

const store = new DisposableStore()
store.add({dispose: () => console.log('cleaned')})
store.dispose()
```

### `@venus/lib/scheduler`

```ts
import {createSingleFlightScheduler} from '@venus/lib/scheduler'

const scheduler = createSingleFlightScheduler({
  run: async () => {
    // render once
  },
  interactiveIntervalMs: 16,
})

scheduler.request('interactive')
```

### `@venus/lib/patch`

```ts
import {applyPatchBatch} from '@venus/lib/patch'

const updateKind = applyPatchBatch(
  patches,
  (patch) => patch.type === 'set-selected-index',
  (batch) => applyHistory(batch),
)
```

### `@venus/lib/collections`

```ts
import {ensureMapValue, setMembership} from '@venus/lib/collections'

const grouped = ensureMapValue(map, 'group-a', () => [])
setMembership(activeIds, 'node-1', true)
```

### `@venus/lib/logger`

```ts
import {createLogger} from '@venus/lib/logger'

const logger = createLogger({level: 'warn'})
logger.warn('render degraded', {reason: 'gpu-pressure'})
```

### `@venus/lib/worker`

```ts
import {detectWorkerCapabilities, resolveWorkerMode} from '@venus/lib/worker'

const capabilities = detectWorkerCapabilities()
const resolution = resolveWorkerMode({capabilities, preferSharedMemory: true})
```

### `@venus/lib/serialization`

```ts
import {parseJsonSafely, stringifyJsonSafely} from '@venus/lib/serialization'

const text = stringifyJsonSafely({version: 1})
const payload = text ? parseJsonSafely<{version: number}>(text) : null
```

### `@venus/lib/assert`

```ts
import {assertNever, invariant} from '@venus/lib/assert'

invariant(config != null, 'config is required')

const exhaustive = (value: 'a' | 'b') => {
  if (value === 'a') return
  if (value === 'b') return
  assertNever(value)
}
```

### `@venus/lib/viewport`

```ts
import {
  DEFAULT_VIEWPORT,
  handleZoomWheel,
  panViewportState,
  resolveViewportState,
} from '@venus/lib/viewport'

const measured = resolveViewportState({...DEFAULT_VIEWPORT, viewportWidth: 1200, viewportHeight: 800})
const panned = panViewportState(measured, 12, -8)
const zoom = handleZoomWheel({active: false, factor: 1, anchor: null, lastEventAt: 0, source: null}, wheel)
```

## Extraction Notes

- `packages/engine/src/math/matrix.ts` now re-exports from `@venus/lib/math`.
- `packages/engine/src/worker/capabilities.ts` now re-exports from `@venus/lib/worker`.
- `packages/engine/src/runtime/renderScheduler.ts` now delegates scheduling core to `@venus/lib/scheduler`.
- `packages/engine/src/interaction/viewport.ts` now re-exports from `@venus/lib/viewport`.
- `packages/engine/src/interaction/viewportPan.ts` now re-exports from `@venus/lib/viewport`.
- `packages/engine/src/interaction/zoom.ts` now re-exports from `@venus/lib/viewport`.
- `apps/vector-editor-web/src/model/nid.ts` now re-exports from `@venus/lib/ids`.
- `apps/vector-editor-web/src/editor/runtime-local/worker/scope/patchBatch.ts` now reuses `@venus/lib/patch`.
- `packages/engine/src/interaction/shapeTransform.ts` now delegates affine and rotated-bounds base operations to `@venus/lib/math` and `@venus/lib/geometry`.

## Boundary

- Can be used by all packages and apps.
- Must not depend on higher-level packages.
- Must not own engine/webgl, product document semantics, history policy, or UI behavior.
