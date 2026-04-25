# Vector Editor Architecture

This is the canonical home for vector-editor-specific architecture and
integration notes. Keep product-only behavior, editor-shell composition, and
vector adoption guidance here instead of under `docs/`.

## Product Boundary

- App ownership stays in `apps/vector-editor-web`.
- Runtime ownership stays in `@venus/runtime` and `@venus/runtime/interaction`.
- Engine ownership stays in `@venus/engine`.
- Persisted document semantics stay in `@vector/model`.

Current runtime chain:

`apps/vector-editor-web` -> `@venus/runtime` + `@venus/runtime/interaction` -> `@venus/runtime/worker` + `@venus/runtime/shared-memory` -> `@venus/engine`

## What Belongs Here

- Product overlay behavior and editor-shell composition.
- Vector-specific runtime bridge wiring and adoption notes.
- Tool orchestration, panel composition, and editor-only workflow detail.
- App-local documentation governance for this product surface.

## What Does Not Belong Here

- Global architecture rules that apply to the whole monorepo.
- Engine mechanism documentation.
- Root governance or changelog material.

## Current App Shape

- The app is the product shell: toolbar, header, panels, canvas frame, and
  status surfaces.
- High-frequency scene mutation runs through runtime and worker paths, not in
  React component state.
- Canvas and gesture wiring stay app-local, but shared interaction policy must
  stay in runtime layers.

## Important Surfaces

- App entry: `src/App.tsx`
- Editor frame and shell composition: `src/components/*`
- Runtime bridge and editor orchestration: `src/editor/*`
- App-local UI kit and compatibility layer: `src/ui/*`
- Product feature modules: `src/features/*`

## UI System Policy

- Reuse existing app UI exports before creating new primitives.
- Keep reusable app-local primitives under `src/ui/kit`.
- Keep product-composed panels and shell components under `src/components`.
- Update `src/ui/README.md` when the vector app UI kit structure changes.

## Documentation Routing

- Keep vector-only architecture notes in this app directory.
- Keep runtime integration notes in `./runtime/*` in this app docs directory.
- Keep cross-cutting monorepo architecture in `docs/architecture/*`.
- Keep engine-specific capability and integration notes in
  `packages/engine/README.md`.