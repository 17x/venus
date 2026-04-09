# `@venus/canvas-base`

Shared canvas runtime foundation for editor-style apps in this monorepo.

This package exists to hold the common mechanics of a canvas editor, without
coupling that runtime to any single product such as the web vector editor,
mindmap editor, or streamline-style editor.

## What It Owns

`canvas-base` is responsible for the runtime bridge between:

- a document snapshot
- shared memory (`SharedArrayBuffer`)
- a worker
- runtime subscriptions for UI
- pointer and command forwarding
- history and collaboration summaries returned from the worker

Today it provides:

- [`createCanvasRuntimeController`](./src/runtime/createCanvasRuntimeController.ts)
- [`useCanvasRuntime`](./src/react/useCanvasRuntime.ts)
- [`createCanvasViewerController`](./src/runtime/createCanvasViewerController.ts)
- [`useCanvasViewer`](./src/react/useCanvasViewer.ts)
- [`createCanvasEditorInstance`](./src/runtime/createCanvasEditorInstance.ts)
- [`createCanvasViewerInstance`](./src/runtime/createCanvasViewerInstance.ts)
- element behavior registry (`./src/extensibility/elements.ts`)
- runtime module contracts (`./src/runtime/modules.ts`)
- built-in module presets (`./src/presets/*`)

## What It Does Not Own

`canvas-base` should stay small and stable. It does **not** own:

- product-specific menus
- app-specific tools and panels
- renderer UI shells
- document-specific business logic
- file format definitions
- geometry algorithms
- worker-side command execution details

Those belong in other packages:

- app UI shell or future shared UI layer: menus, panels, shell layout
- `@venus/editor-worker`: worker-side compute and command handling
- `@venus/renderer-*`: rendering adapters
- `@venus/file-format/*`: snapshot protocol and migrations
- `apps/*`: product assembly and app-specific extensions

## Mental Model

Think of `canvas-base` as the transport and lifecycle layer for a canvas app.

It answers:

- How is the worker started?
- How is scene memory created and attached?
- How do pointer events get forwarded?
- How do commands get dispatched?
- How does React subscribe to runtime updates?

It does **not** answer:

- What a node means
- Which tools exist for a given app
- How a document is rendered visually
- Which menu items or shortcuts a product should expose

## Current Data Flow

```text
React app
  -> useCanvasRuntime(...)
  -> createCanvasRuntimeController(...)
  -> create worker + scene memory
  -> send init/document to worker
  -> forward pointer / command / collaboration messages
  -> receive scene updates
  -> expose snapshot for UI rendering
```

More concretely:

1. App creates a document and worker factory.
2. `canvas-base` allocates `SharedArrayBuffer`.
3. `canvas-base` attaches typed-array views via `@venus/shared-memory`.
4. `canvas-base` starts the worker and posts `init`.
5. App forwards pointer and command events through the runtime.
6. Worker updates scene state and returns summaries.
7. `canvas-base` materializes the latest snapshot for React consumers.

## Public API

### `createCanvasRuntimeController`

Imperative runtime controller for non-React or low-level integration.

Use this when:

- you want direct control over lifecycle
- you may embed the runtime outside React
- you want to build another framework adapter later

Core responsibilities:

- `start()`
- `destroy()`
- `postPointer(...)`
- `dispatchCommand(...)`
- `receiveRemoteOperation(...)`
- `subscribe(...)`
- `getSnapshot()`

### `useCanvasRuntime`

React hook wrapper around the controller.

Use this when:

- the app is React-based
- you want a simple subscription-based runtime state surface

Returned state includes:

- `document`
- `shapes`
- `stats`
- `history`
- `collaboration`
- `ready`
- `sabSupported`
- `postPointer(...)`
- `dispatchCommand(...)`
- `receiveRemoteOperation(...)`
- `clearHover()`

### `useCanvasViewer`

Read-only runtime for preview/embed scenarios where worker/SAB/edit commands
are not required.

Use this when:

- you need pan/zoom + rendering, but no editing
- you want optional hover/selection hit-test in read-only mode
- you want lower integration cost for display surfaces

Viewer options:

- `document`
- `enableHitTest?: boolean` (default `true`)
- `selectOnPointerDown?: boolean` (default `false`)

### `createCanvasEditorInstance` / `createCanvasViewerInstance`

Higher-level runtime constructors layered on top of the existing controllers.

They add:

- optional element behavior registry for custom element `render`/`hitTest`
- optional runtime modules for policy hooks and optional capabilities
- consistent instance surface across editor-mode and viewer-mode runtimes

Use these when:

- new app teams want one bootstrap API instead of wiring each part manually
- products need renderer-only mode with optional policy modules
- products need custom selection/snapping behavior without forking core

## Example

```ts
import { useMemo } from 'react'
import { useCanvasRuntime } from '@venus/canvas-base'
import { createStarterDocument } from '../../apps/vector-editor-web/src/fixtures/createStarterDocument.ts'

const SCENE_CAPACITY = 256

export function useEditorRuntime() {
  const document = useMemo(() => createStarterDocument(), [])

  const runtimeOptions = useMemo(
    () => ({
      capacity: SCENE_CAPACITY,
      createWorker: () =>
        new Worker(new URL('../editor.worker.ts', import.meta.url), {
          type: 'module',
        }),
      document,
    }),
    [document],
  )

  return useCanvasRuntime(runtimeOptions)
}
```

## Integration Rules

When another app builds on `canvas-base`, prefer this split:

- `canvas-base`: runtime lifecycle and event bridge
- app package or app root: document creation, worker entry, extensions
- app UI package: menus, panels, shell layout

A good rule:

- If it is about **running a canvas editor**, it may belong here.
- If it is about **what this specific editor does**, it probably does not.

## Extension Direction

This package is intentionally small right now. Likely future additions:

- command registry plumbing
- tool registry plumbing
- keyboard/gesture adapters
- viewport controller abstraction
- renderer adapter contract
- extension registration surface for app-specific modules

These should be added only if they are shared across multiple apps.

## Extensibility Scaffold

`canvas-base` now ships a first-pass extension scaffold with three layers:

1. element behavior registry
2. runtime module lifecycle hooks
3. editor/viewer instance factories

### Element Registry

`createCanvasElementRegistry(...)` stores behavior contracts keyed by `type`.
Custom element providers can define:

- `render(context, node, runtime)`
- `hitTest(point, node, runtime)`
- optional `getBounds(node, document)`
- optional `getSnapSources(node, document)`

### Runtime Modules

`createCanvasModuleRunner(...)` and `CanvasRuntimeModule` expose optional hooks:

- `setup` + teardown
- `onStart` / `onDestroy`
- `beforePointer` / `afterPointer`
- `beforeCommand` / `afterCommand`

Built-in preset contracts:

- `createSelectionModule(...)`
- `createSnapModule(...)`
- `createDefaultEditorModules(...)`

### Snapping Data vs Hint UI

Snapping contracts intentionally separate semantic snap data from rendering:

- `SnapMatch[]` and `SnapComputationResult` carry math/decision data
- product UIs can render their own hint style from that data
- `SnapHintDescriptor` is optional and can be ignored by hosts

## Import Style

```ts
import {
  createCanvasEditorInstance,
  createCanvasViewerInstance,
  createDefaultEditorModules,
  createSelectionModule,
  createSnapModule,
} from '@venus/canvas-base'
```

## Instance Style

```ts
const editor = createCanvasEditorInstance({
  capacity: 1024,
  createWorker: () => new Worker(new URL('../editor.worker.ts', import.meta.url), {type: 'module'}),
  document,
  modules: createDefaultEditorModules({
    snappingPreset: 'bounds',
  }),
})
```

```ts
const viewer = createCanvasViewerInstance({
  document,
  modules: [
    createSelectionModule({
      config: {
        marquee: {
          enabled: true,
          defaultMatchMode: 'contain',
        },
      },
    }),
  ],
})
```

## Design Constraints

To keep `canvas-base` maintainable over time:

- prefer composition over product-specific conditionals
- keep the API explicit and small
- avoid importing app code into this package
- keep worker protocol assumptions narrow
- treat this as infrastructure, not UI

## Relationship To Other Packages

- `@venus/shared-memory`
  Owns the binary scene layout and typed-array helpers.
- `@venus/editor-worker`
  Owns worker-side message handling and command execution.
- `@venus/document-core`
  Owns the current document model used by the starter editor.
- app UI shell
  Owns product-specific React editor composition unless a shared UI layer emerges later.

## Current Limitation

Right now `canvas-base` is typed against the current `EditorDocument` from
`@venus/document-core`.

That is a practical first step, not the final abstraction boundary.

If multiple editor products later need different document protocols, we can
introduce a narrower shared document contract or runtime adapter layer without
changing the role of `canvas-base`.
