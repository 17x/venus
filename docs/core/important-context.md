# Important Context

## Runtime Chain

- `apps/*` -> `@venus/runtime` + `@venus/runtime/interaction` + `@venus/runtime/react` -> `@venus/runtime/worker` + `@venus/shared-memory` -> `@venus/engine`.

## Model Truth

- Persisted scene/document semantics: `packages/file-format`.
- Runtime adapter model: `@venus/document-core` (`DocumentNode`).
- Prefer `node + feature` semantics for compatibility reasoning.

## Layer Boundaries

- App layer: product UI and orchestration.
- Worker/runtime layer: command execution, hit-testing, history, protocol flow.
- Renderer layer: consume snapshot + viewport only.

## Renderer Direction

- Canvas2D is the current default/stable path for active app work.
- Runtime apps consume Canvas2D through app-layer renderer wiring over `@venus/engine`.

## Shared Memory Note

- SharedArrayBuffer is runtime transport, not persistence format.
- Save/export document state through adapters/file-format, not SAB memory.
