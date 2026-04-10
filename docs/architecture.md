# Venus Editor Architecture

## Overview

Venus uses a layered architecture to keep boundaries clear and performance stable:

`apps/*` -> `@venus/runtime` + `@venus/runtime-interaction` + `@venus/runtime-react` -> `@venus/editor-worker` + `@venus/shared-memory` -> renderer packages

## Principles

- Keep product UI and orchestration in app layers.
- Keep command execution, hit-testing, history, and indexing in worker/runtime layers.
- Use SharedArrayBuffer for hot runtime data transport.
- Keep renderer focused on snapshot + viewport consumption.
- Treat file format and runtime model as decoupled layers.

## Package Responsibilities

### `@venus/document-core`

- Shared document/runtime adapter types and geometry primitives.

### `@venus/runtime`

- Runtime lifecycle, worker bridge, viewport state, matrix helpers, gesture plumbing.

### `@venus/runtime-interaction`

- Shared interaction algorithms: marquee, snapping, selection handles, transform sessions.

### `@venus/runtime-react`

- React adapters (`useCanvasRuntime`, `useCanvasViewer`, `CanvasViewport`) and renderer contracts.

### `@venus/editor-worker`

- Worker protocol, command execution, hit-testing integration, history, collaboration state.

### `@venus/shared-memory`

- SharedArrayBuffer layout and snapshot read/write helpers.

### `@venus/file-format`

- Persisted schema, migrations, runtime-scene parsing adapters.

### Renderers

- `@venus/renderer-canvas`: active default path for app iteration.
- `@venus/renderer-skia`: available for advanced rendering strategies.

## App Roles

### `apps/vector-editor-web`

- Product-facing editor UI and action orchestration.

### `apps/runtime-playground`

- Runtime and rendering diagnostics surface.

## Data Flows

### Command Flow

1. App triggers command intent.
2. Runtime dispatches command to worker.
3. Worker mutates document + shared memory.
4. Runtime receives updates and refreshes snapshot.
5. Renderer draws latest snapshot.

### Pointer Flow

1. `CanvasViewport` captures pointer input.
2. Runtime forwards pointer to worker.
3. Worker resolves hover/selection hit results.
4. Snapshot flags update and render refreshes.

### Viewport Flow

1. Wheel/gesture input updates viewport state.
2. Runtime recalculates matrix/inverse matrix.
3. Renderer draws using updated viewport.
