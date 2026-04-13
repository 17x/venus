# Matrix Migration Checklist

Use this as the execution checklist for migrating Venus runtime internals toward
shared affine-matrix-based transform behavior while preserving existing
decomposed runtime node fields.

## Scope

- Runtime chain:
  `apps/*` -> `@venus/runtime` + `@venus/runtime/interaction` +
  app-local runtime bridge -> `@venus/runtime/worker` ->
  renderer + shared-memory packages
- Source of shared transform truth: `@venus/document-core`
- Current storage compatibility: keep `x/y/width/height/rotation/flipX/flipY`
  until an explicit runtime model switch is approved

## Phase 1: Shared Helper Baseline

- [x] Add shared affine helpers in `document-core` geometry layer
- [x] Add shared transform compatibility contracts (`resolveNodeTransform`,
      normalized bounds, transform records)
- [x] Route shared hit-testing to inverse-affine local-space projection
- [x] Route Canvas2D renderer transform application through shared contracts
- [x] Export shared transform batch command/item typing from `document-core`

Exit criteria:

- New transform-sensitive code no longer introduces package-local rotate/flip
  helper variants in app/worker/renderer layers

## Phase 2: Package Boundary Contract Unification

- [x] shared runtime interaction payloads use shared transform
      records
- [x] `runtime-interaction` exposes `createTransformBatchCommand` for app commit paths
- [x] Vector app transform commit paths use shared transform batch builder
- [x] Playground transform commit paths use shared transform builder
- [x] Worker protocol accepts shared `ShapeTransformBatchCommand` typing
- [x] Worker transform batch patch derivation centralized for local +
      collaboration paths

Exit criteria:

- `shape.transform.batch` payload shape is authored from one shared contract
  across app -> runtime stack -> worker boundaries

## Phase 3: Interaction/Overlay Matrix Consolidation

- [x] Shared selection overlay rotates handles via shared affine helpers
- [x] Vector selection overlay rotates handles/polygons via shared helpers
- [x] Selection-box interior checks use shared rotated-bounds helper
- [x] Viewport point projection uses shared `applyMatrixToPoint` helper in
      vector + playground active paths
- [x] Playground removes local trig-based selection rotation helpers

Exit criteria:

- No remaining duplicated active-path selection/viewport transform formulas
  outside shared helper modules

## Phase 4: Remaining Migration Work (Current)

- [x] Centralize clip-bound transform preview propagation in shared
      runtime-interaction preview helpers (remove app-local vector-only extension)
- [x] Move remaining transform-sensitive bounds/indexing paths to shared
      normalized-box helpers where drift risk remains
- [x] Audit group/parent-child transform edge paths for hidden decomposed math
      duplication
- [x] Expand targeted regression scenarios for:
  - rotated single resize
  - multi/group signed-scale crossover flips
  - rotated selection interior clear behavior
  - path fill + hit-test consistency under transform operations
- [x] Add one-command matrix regression gate (`pnpm matrix:check`) for repeated
      migration verification
- [x] Document matrix compatibility invariants per package (`document-core`,
      `runtime`, `runtime-interaction`, `runtime/worker`, Canvas2D renderer path,
      `shared-memory`)

Exit criteria:

- Active runtime interaction and command execution paths rely on shared
  transform helpers, and known regression scenarios pass reliably

## Phase 5: Optional Runtime Model Switch (Not Started)

- [x] Propose matrix-first runtime node contract RFC (if needed)
- [x] Define compatibility adapters to file-format `node + feature` model
- [x] Plan migration of persisted/runtime API boundaries and fallback behavior

Exit criteria:

- Explicit architecture decision accepted; workstream only starts after
  alignment and risk review

## Validation Checklist Per Slice

- [x] Targeted `tsc -b` for changed packages/apps
- [ ] Targeted lint for changed files (acknowledge known pre-existing issues)
- [x] Update package-scoped knowledge notes
- [x] Update `current-work.md` when priorities/status change
