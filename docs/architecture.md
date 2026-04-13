# Venus Editor Architecture

## Overview

Venus uses a layered architecture to keep boundaries clear and performance stable:

`apps/*` -> `@venus/runtime` + `@venus/runtime/interaction` -> `@venus/runtime/worker` + `@venus/shared-memory` -> `@venus/engine` (Canvas2D via app-local runtime bridges)

Detailed boundary contract for execution ownership:
`docs/runtime-engine-responsibility-split.md`

## Principles

- Keep product UI and orchestration in app layers.
- Keep command execution and protocol/history orchestration in worker/runtime layers.
- Keep hit-testing and render-optimization mechanisms in `@venus/engine`.
- Use SharedArrayBuffer for hot runtime data transport.
- Keep renderer focused on snapshot + viewport consumption.
- Treat file format and runtime model as decoupled layers.

## Package Responsibilities

### `@venus/document-core`

- Shared document/runtime adapter types and geometry primitives.
- Persisted JSON scene contracts and runtime-scene parsing adapters.

### `@venus/runtime`

- Runtime lifecycle, worker bridge, viewport state, matrix helpers, gesture plumbing.

### `@venus/engine`

- Renderer contracts and backend capability surface.
- Render node contracts for text, text runs, image, and clipping.
- Frame clock and lightweight animation mechanism shared by renderer/runtime integrations.
- Hit-testing mechanisms and render hot-path optimization primitives.

### `@venus/runtime/interaction`

- Shared interaction algorithms: marquee, snapping, selection handles, transform sessions.

### App-Local React Bridges

- Active apps keep React-specific glue in app-local bridge files.
- Shared runtime package stays framework-agnostic.

### `@venus/runtime/worker`

- Worker protocol, command execution, history, collaboration state, and engine mechanism dispatch.

### `@venus/shared-memory`

- SharedArrayBuffer layout and snapshot read/write helpers.

### Renderer Integration

- Active app surfaces consume Canvas2D through app-layer runtime bridges.
- The renderer mechanism contract and backend primitives live in `@venus/engine`.

## App Roles

### `apps/vector-editor-web`

- Product-facing editor UI and action orchestration.

### `apps/playground`

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
3. Worker/runtime route pointer context to engine-owned hit-test mechanisms.
4. Snapshot flags update and render refreshes.

### Viewport Flow

1. Wheel/gesture input updates viewport state.
2. Runtime recalculates matrix/inverse matrix.
3. Renderer draws using updated viewport.
