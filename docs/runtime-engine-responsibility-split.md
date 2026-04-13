# Runtime-Engine Responsibility Split

## Purpose

This document defines the execution boundary between `@venus/engine`,
`@venus/runtime*`, and app layers (`vector-editor-web`, `playground`) so we can
ship new editor capabilities without ownership drift.

Current target chain:

`apps/*` -> `@venus/runtime` + `@venus/runtime/interaction` -> `@venus/runtime/worker` + `@venus/runtime/shared-memory` -> `@venus/engine`

## Layer Responsibilities

### `@venus/engine` (mechanism owner)

- Own render mechanism and backend capability (`canvas2d`, `webgl` request path).
- Own geometry/math mechanism, matrix helpers, bounds, and spatial index.
- Own hit-test mechanism and hit-test config contracts.
- Own render scheduling primitives and scene patch apply mechanism.
- Expose pure mechanism APIs to runtime layers.
- Must not own product interaction policy, app UI state, or framework glue.
- Must not own network/protocol transport policy outside engine-internal contracts.

### `@venus/runtime` (framework-agnostic orchestrator)

- Own runtime lifecycle and worker bridge.
- Own viewport state transitions (`pan`, `zoom`, `fit`, `resize`) as runtime state
  policy over engine primitives.
- Own command/event dispatch surfaces for app consumption.
- Own snapshot aggregation from worker/shared-memory into app-readable runtime
  state.
- Delegate rendering/hit-test mechanism to `@venus/engine` instead of duplicating
  logic.

### `@venus/runtime/interaction` (shared interaction policy)

- Own gesture collection adapters and pointer/wheel interaction policy.
- Own drag/select/marquee/snapping/transform-session policy modules.
- Convert screen input to runtime/world parameters and invoke runtime APIs.
- Reuse engine-owned mechanism helpers where available.
- Keep product-specific tool behavior in app layers.

### `@venus/runtime/worker`

- Own worker-side command execution, history, collaboration orchestration, and
  scene mutation flow.
- Keep hit-test calls routed through engine helpers.
- Emit structured scene updates (`full`, `flags`, future partial kinds) to
  runtime bridge.

### App layer (`apps/vector-editor-web`, `apps/playground`)

- Own product UI orchestration and feature composition.
- Own app-local React runtime bridge glue.
- Consume runtime surfaces, do not bypass runtime to mutate worker/engine internals.
- `playground` is diagnostics and stress verification bench.
- `vector-editor-web` is product behavior target surface.

## Ownership Rules

- Mechanism in engine, policy in runtime/interaction, product behavior in apps.
- Runtime remains framework-agnostic. Framework adapters stay in app-local bridge files.
- Persisted document truth stays in `@venus/document-core` runtime scene contracts (`node + feature`).
- Runtime document structures are adapters for execution and rendering, not
  persistence source-of-truth.

## API Boundary Rules

- App -> runtime: command/interaction APIs only.
- Runtime -> worker: typed protocol messages only.
- Worker/runtime -> engine: mechanism APIs only (render/hit-test/math/index).
- External network/collaboration transport belongs in runtime/worker integration
  layers, not in engine render mechanism.

## Batch Update And Performance Direction

- Use one explicit batch mutation entry (`applyScenePatchBatch` /
  transaction-like flow).
- Support update-kind contracts so render invalidation scope stays controlled.
- Keep input-priority render scheduling and request coalescing as default.
- Preserve stable app/runtime API while optimizing internals (SAB, worker replay,
  offscreen paths).

## Anti-Patterns To Avoid

- Re-implementing hit-test math in runtime/app layers.
- Moving worker/runtime ownership into React component local state.
- App-layer direct writes into scene memory or engine internals.
- Binding engine APIs to product-specific interaction semantics.

## Work Start Plan

1. Use this document as the review baseline for new runtime/engine changes.
2. For each new feature, confirm ownership before coding:
   app vs runtime policy vs engine mechanism.
3. Route new batch updates through shared patch/transaction paths first.
4. Validate behavior in both `vector-editor-web` and `playground`.
