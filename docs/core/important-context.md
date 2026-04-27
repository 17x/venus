# Important Context

## Runtime Chain

- `apps/*` -> `@venus/runtime` + `@venus/runtime/interaction` -> `@venus/runtime/worker` + `@venus/runtime/shared-memory` -> `@venus/engine`.

## Model Truth

- Persisted scene/document semantics are app-owned (vector uses `@vector/model`).
- Runtime adapter model in vector: `@vector/model` (`DocumentNode`).
- Prefer JSON runtime scene `node + feature` semantics for compatibility reasoning.

## Layer Boundaries

- App layer: product UI and orchestration.
- Worker/runtime layer: command execution, history, protocol flow, and engine mechanism orchestration.
- Engine layer: hit-testing and render-optimization mechanisms.
- Renderer layer: consume snapshot + viewport only.

## Renderer Direction

- WebGL is the only primary engine backend for active renderer work.
- Canvas2D in `@venus/engine` is auxiliary/offscreen/composite support, not a
  peer backend target.

## Shared Memory Note

- SharedArrayBuffer is runtime transport, not persistence format.
- Save/export document state through the owning app model adapters
  (vector: `@vector/model`), not SAB memory.
