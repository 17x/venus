# Venus Base and Modules

`@venus/engine/base` exposes the small Venus runtime entry and the module
contract used by optional capabilities. Use it when the application wants a
clear boundary between static rendering and opt-in interaction, camera,
animation, debug, scale, effects, history, or export capability.
The interaction module also exposes style-free overlay geometry APIs such as
`venus.getSelectionOverlay()` and `venus.getHoverOverlay(...)`; host apps own
overlay color, visibility, handles, and product styling.

## Start from Base

```ts
import {createVenus} from '@venus/engine/base'

const venus = createVenus()

venus.mount(canvas)
venus.add({
  type: 'rect',
  x: 72,
  y: 56,
  width: 160,
  height: 96,
  fill: '#dbeafe',
})

await venus.render()
```

## Parameters

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `modules` | `readonly VenusModule[]` | `[]` | Capability modules installed once during construction. |
| `culling` | `boolean` | `false` | Enables base culling compatibility behavior. Future public performance capability should use `scale`. |
| `lod` | `boolean` | `false` | Enables current LOD compatibility behavior. Future public performance capability should use `scale`. |
| `render.backend` | `canvas2d \| webgl \| auto` | `auto` | Tries WebGL first and falls back to Canvas2D when WebGL initialization fails. |
| `render.antialias` | `boolean` | `true` | WebGL antialias preference. |
| `render.quality` | `interactive \| full` | `full` | Initial render quality mode. |

## Module Names

Reserved user-facing capability names:

```ts
render
camera
hitTest
select
snap
animate
debug
scale
effects
history
export
```

Do not expose long public names such as `largeScenePerformance`. Internals can
still use specific implementation names like tile cache, LOD, culling, or
snapshot.

## Define a Module

```ts
import {createVenus, defineVenusModule} from '@venus/engine/base'

const debugNames = defineVenusModule({
  name: 'debug',
  requires: ['document'],
  install({venus, services}) {
    const document = services.require('document')

    venus.on('render:after', () => {
      console.log({
        modules: venus.modules(),
        bounds: document.bounds(),
      })
    })
  },
})

const venus = createVenus({
  modules: [debugNames],
})
```

## Properties

- `VENUS_MODULE_NAMES` lists reserved public capability names.
- `VENUS_INTERNAL_SERVICE_NAMES` lists internal foundation service names.
- `venus.inspect().backendFallback` reports the last automatic WebGL-to-Canvas2D fallback.
- `venus.inspect().modules` reports installed modules and the last module installation error.

## Events

```ts
venus.on('backend:fallback', (event) => {
  console.log(event.from, event.to, event.reason)
})
```

`backend:fallback` fires only in `render.backend: 'auto'` mode when WebGL
initialization fails and Venus successfully switches to Canvas2D.

Engine documentation demos show the active backend and fallback status below
each canvas so renderer selection is visible during API exploration.

## Methods

### `createVenus(parameters?)`

Creates a Venus runtime with optional modules.

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `parameters` | `VenusParameters` | `{}` | Runtime parameters and optional modules. |

### `defineVenusModule(module)`

Defines one module and validates that it uses a reserved short name.

| Name | Type | Description |
| --- | --- | --- |
| `module` | `VenusModule` | Module object with `name`, optional `dependsOn`, optional `requires`, and `install(context)`. |

### `venus.modules()`

Returns the module names installed on the current instance.

```ts
const installed = venus.modules()
```

### Tree Structure Operations

The base module owns parent/child order and treats the ordered document tree as
the source of truth. `venus.remove(id)` removes a root or nested subtree from
its current parent-local child list. `venus.group(ids, options)` first drops
selected descendants when their ancestor is also selected, then groups only
same-parent siblings in document order. `venus.ungroup(id)` lifts children into
the former group's parent and discards the removed group wrapper's own
properties.

Use `venus.reparent(id, parentId, index?)` for explicit single-node moves
between root, frame, group, clip, and mask child lists. It rejects moving a node
into itself or its descendant, clamps insertion indexes, preserves the current
authored geometry model, records history when the history module is installed,
and emits `document:structure-changed` with `reason: 'reparent'`.

### Hit-Test Clip Policy

`venus.hitTest(point, options?)` and `venus.hitTestAll(point, options?)`
respect inline clip geometry by default. This includes clip containers that
normalize to engine groups with `clip.clipShape`; children outside the clip are
removed from hit results.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `phase` | `hover \| click` | `click` | Selects default tolerance. |
| `tolerance` | `number` | `0` for click, `6` for hover | Screen-pixel hit tolerance. |
| `includeLocked` | `boolean` | `false` | Includes locked nodes when enabled. |
| `respectClip` | `boolean` | `true` | Keeps clipped-out children from being hit; set to `false` only for debug or parity checks. |

### Image Resource Diagnostics

`venus.inspectImageResources()` traverses current image nodes and asks the host
resource loader whether each `assetId` resolves. The engine preserves
`assetUrl` for import/export mapping, but rendering still depends on
`resource.loader.resolveImage(assetId)`.

Returned statuses:

| Status | Meaning |
| --- | --- |
| `resolved` | Loader returned a renderable image source. |
| `missing-loader` | No host resource loader is configured. |
| `missing-resource` | Loader returned no source for the image asset id. |
| `loader-error` | Loader threw while resolving the asset id. |

## Internal Services

Modules receive a read-only service registry:

```ts
install({services}) {
  const viewport = services.require('viewport')
  const document = services.get('document')
  const invalidation = services.require('invalidation')
}
```

`services.get('document')`, `services.get('viewport')`, and
`services.get('invalidation')` are typed. Reserved names that are not registered
yet still return `unknown | null` unless the caller supplies its own generic.
Use `services.require(...)` when the module cannot operate without a service;
it returns the typed service or throws with a clear missing-service error.
Returned service objects are stable shallow-frozen facades. They expose methods
without letting modules mutate the registry shape.

Modules can declare required services up front:

```ts
const cameraModule = defineVenusModule({
  name: 'camera',
  requires: ['viewport'],
  install({services}) {
    const viewport = services.require('viewport')
  },
})
```

Venus validates `requires` before `install(...)` runs, so a module fails before
it mutates runtime state when a service is unavailable.

Modules can also declare user-module dependencies:

```ts
const selectModule = defineVenusModule({
  name: 'select',
  dependsOn: ['hitTest'],
  install({venus}) {
    console.log(venus.modules())
  },
})
```

`dependsOn` is intentionally order-aware. Venus does not auto-sort modules; the
host should pass modules in the order it wants capability installed.

Internal names are reserved for boundary planning. A name can exist in
`VENUS_INTERNAL_SERVICE_NAMES` before its runtime implementation is registered.
Modules must tolerate `null` from `services.get(...)`.

Currently registered services:

| Service | Methods |
| --- | --- |
| `document` | `snapshot()`, `children()`, `bounds()` |
| `viewport` | `project(point)`, `unproject(point)` |
| `invalidation` | `classify(changedProperties)` |

## Boundary Rules

- Install modules per instance with `new Venus({modules})` or `createVenus({modules})`.
- Do not use a global `Venus.use(...)` registry.
- Use `render.backend: 'webgl'` only when WebGL initialization failures should stay visible.
- Use `render.backend: 'canvas2d'` for documentation, tests, and deterministic fidelity demos.
- Internal foundations must not import the user-facing base or Venus module layer.
- User modules may consume internal services through `VenusModuleContext`; they should not import private files directly.
