# Important Context

## Runtime Chain

- `apps/*` -> `@venus/runtime` + `@venus/runtime-interaction` + `@venus/runtime-react` -> `@venus/editor-worker` + `@venus/shared-memory` -> renderer packages.

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
- Skia remains available but is not the default iteration path.

## Shared Memory Note

- SharedArrayBuffer is runtime transport, not persistence format.
- Save/export document state through adapters/file-format, not SAB memory.
