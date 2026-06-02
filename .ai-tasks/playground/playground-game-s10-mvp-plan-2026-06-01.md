# Playground S10 Game MVP Plan (2026-06-01)

## 0. Scope

Focus on S10 (`game editor/runtime preview`) as the current playground priority scenario.

Boundary constraints:

- Playground can keep game-specific semantics.
- Engine remains API/events-only, 3D-first, domain-neutral.
- Adapter owns game-domain to generic-engine projection.

## 1. S10 MVP Outcome

Deliver one stable page that demonstrates:

- authoring graph to runtime graph preview loop,
- deterministic preview step/replay behavior,
- interaction controls and observable diagnostics.

## 2. Domain Model For S10

Minimum local fixture model (game-domain side):

- `level`: id, name, revision, bounds.
- `entities[]`: id, prefabId, transform, enabled.
- `components[]`: kind, data payload, deterministic order.
- `prefabs[]`: reusable templates with override rules.
- `assets[]`: geometry/material/texture handles.
- `previewState`: playMode, tick, seed, selectedEntityId.

Adapter output (engine side):

- generic graph nodes/edges/resources only,
- no game/product names in engine API payload,
- deterministic ordering and stable ids.

## 3. Interaction Harness (MVP)

Required controls:

- select entity
- transform entity (translate/rotate)
- enter preview (play)
- step preview (fixed tick)
- stop and reset

Required telemetry:

- node count
- draw count
- active tick
- selected entity id
- adapter/engine warnings

## 4. Data And Fixture Plan

- Add S10 local fixture folder convention:
  - `apps/playground/public/scenario-fixtures/s10/`
- Add at least:
  - `s10-level-mvp.json`
  - `s10-expected-signature.json`
- Keep remote graph dataset as fallback only.

## 5. Validation Gates

- Route smoke: `/game-editor-runtime-preview` loads nonblank canvas.
- Determinism: same fixture + same seed => same snapshot signature.
- Interaction: play/step/stop updates telemetry and keeps stable revision chain.
- Boundary: no engine private import usage from playground game adapter.

## 6. Task Breakdown

- `PG-S10-001` [P0] local fixture and manifest.
- `PG-S10-002` [P0] adapter projection and deterministic id ordering.
- `PG-S10-003` [P1] interaction controls wired to preview state.
- `PG-S10-004` [P1] deterministic smoke and snapshot tests.
- `PG-S10-005` [P1] UX pass for scenario readability.

## 7. Done Definition

S10 can be used as an MVP scenario validation page for engine DEX-016 progress, while preserving the engine's 3D-first and product-neutral API constraints.

## 8. Progress Update (2026-06-01)

- Implemented in `apps/playground`:
  - Added real S10 interaction runtime logic:
    - `play preview`
    - `runtime preview step`
    - `stop preview`
    - `pick node`
  - Interaction now mutates scene snapshot and re-submits graph to engine for render, instead of status-only toggles.
  - Status telemetry now includes `previewStep`, `selected`, and `mode`.
- Added deterministic contract tests:
  - `src/testing/s10GameRuntimeInteractions.contract.test.ts`
  - Validates deterministic step mutation and deterministic node highlight behavior.
- Updated scenario metadata:
  - `scenarioInteractionHarnesses.ts` now includes S10 play/step/stop/pick controls.
  - `scenarioModelSpecs.ts` aligns S10 interaction contract with implementation.
