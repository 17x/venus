# Architecture Overview

## Runtime Chain

`apps/*` -> `@venus/runtime` + `@venus/runtime/interaction` ->
`@venus/runtime/worker` + `@venus/runtime/shared-memory` -> `@venus/engine`

## Architecture Principles

- Product behavior and UI orchestration stay in app layers.
- Runtime family owns lifecycle, protocol orchestration, command surfaces, and
  shared interaction policy.
- Engine owns rendering, geometry, hit-testing, spatial indexing, and backend
  mechanism.
- Persisted document semantics stay in `@venus/document-core`.
- Renderer consumes snapshot + viewport, not product policy.

## Package Responsibilities

- `@venus/document-core`: persisted scene/document contracts and geometry primitives.
- `@venus/runtime`: framework-agnostic runtime core and worker bridge.
- `@venus/runtime/interaction`: shared editing interaction algorithms.
- `@venus/runtime/worker`: command execution, history, mutation flow.
- `@venus/runtime/shared-memory`: hot data transport helpers.
- `@venus/engine`: render and hit-test mechanisms.

## Product Surface Roles

- `apps/vector-editor-web`: product-facing vector editor.
- `apps/playground`: runtime/render diagnostics surface.

## Related Documents

- Layer boundary: `./layering.md`
- Runtime details: `./runtime.md`
- Data flow: `./data-flow.md`
- Detailed vector architecture: `../vector-editor-architecture.md`
