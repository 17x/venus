# Engine 3D Optimization Migration Task Ledger

Status: Active
Owner: Engine runtime and renderer maintainers
Last Updated: 2026-05-16

## Scope Definition

- Target: classify and migrate existing optimization mechanisms from 2D-first assumptions to 3D-ready behavior.
- Constraint: follow docs/AI_HIGHEST_STANDARD.md execution protocol and cleanup-first rule.
- Non-goal: large orchestration rewrites in one batch.

## Type Definition

- Define explicit mechanism taxonomy and disposition contract (`retain`, `upgrade`, `deprecate`).
- Define deterministic decision output that can be tested and consumed by follow-up planning tooling.

## CHANGE REQUEST

[CHANGE REQUEST]

Target:

- File / Module: `src/runtime/policy/optimizationMechanismPolicy/optimizationMechanismPolicy.ts`
- File / Module: `src/runtime/policy/optimizationMechanismPolicy/optimizationMechanismPolicy.test.ts`

Goal:

- Problem being solved: we need one deterministic, testable mechanism classification baseline before touching runtime orchestration.

Change Type:

- Add

Impact:

- Affected modules: runtime policy (analysis-only contract), test suite

Cleanup:

- Old logic to remove: none in this task; no parallel implementation introduced.

Tests:

- Tests to add/update:
  - deterministic mechanism ordering
  - 2D profile decisions
  - 3D profile decisions
  - hybrid profile decisions

## Test Design

- Use table-driven expectations keyed by mechanism id.
- Assert both disposition and rationale tags.
- Keep tests pure and deterministic (no time/state dependency).

## Implementation Steps

1. Add mechanism taxonomy contract and decision engine.
2. Add unit tests for 2D/3D/hybrid scenarios.
3. Run targeted engine tests and type checks.

## Validation

- `pnpm --filter @venus/engine test -- src/runtime/policy/optimizationMechanismPolicy/optimizationMechanismPolicy.test.ts`
- `pnpm --filter @venus/engine exec tsc --noEmit`

## Cleanup Check

- No temporary branch added.
- No compatibility shim required.
- No module boundary violation.

---

## Task-02 (Completed): 3D Visibility Entry Upgrade

[CHANGE REQUEST]

Target:

- File / Module: `src/scene/visibility/contracts.ts`
- File / Module: `src/scene/visibility/visibility.ts`
- File / Module: `src/scene/visibility/visibility.test.ts`
- File / Module: `src/visibility/index.ts`

Goal:

- Problem being solved: add explicit frustum+occlusion entry to avoid treating coarse fallback as the only 3D path.

Change Type:

- Modify

Impact:

- Affected modules: visibility contracts, visibility resolver, visibility domain exports

Cleanup:

- Old logic to remove: none; existing fallback path preserved as compatibility mode only.

Tests:

- Tests to add/update:
  - occlusion callback is applied after frustum candidates
  - policy decision reports fallback/frustum/frustum+occlusion modes

Validation:

- `pnpm --filter @venus/engine test -- src/scene/visibility/visibility.test.ts`
- `pnpm --filter @venus/engine exec tsc --noEmit`

## Task-03 (Completed): 3D Tile Streaming Key Contract

[CHANGE REQUEST]

Target:

- File / Module: `src/renderer/tileManager/tileManager.ts`
- File / Module: `src/renderer/tileManager/tileManager.test.ts`

Goal:

- Problem being solved: keep existing tile key compatibility while adding camera/depth-aware key contract for 3D streaming caches.

Change Type:

- Modify

Impact:

- Affected modules: tile manager helper API, tile manager tests

Cleanup:

- Old logic to remove: none; old key generator retained as compatibility API.

Tests:

- Tests to add/update:
  - default 2D streaming key
  - explicit 3D streaming key with camera pose hash and depth slice

Validation:

- `pnpm --filter @venus/engine test -- src/renderer/tileManager/tileManager.test.ts`
- `pnpm --filter @venus/engine exec tsc --noEmit`

## Task-04 (Completed): Interaction Preview 2D/3D Execution Split Entry

[CHANGE REQUEST]

Target:

- File / Module: `src/renderer/webglInteractionPreview/webglInteractionPreview.ts`
- File / Module: `src/renderer/webglInteractionPreview/webglInteractionPreview.test.ts`
- File / Module: `src/renderer/webgl/preview/interaction/webglInteractionPreview.ts`
- File / Module: `src/renderer/webgl/preview/interaction/webglInteractionPreview.test.ts`

Goal:

- Problem being solved: affine snapshot reuse should remain for 2D but should not be treated as valid for 3D perspective camera interaction.

Change Type:

- Modify

Impact:

- Affected modules: interaction preview reuse gate and tests in both compatibility and active module paths

Cleanup:

- Old logic to remove: none; reuse path now gated by execution mode helper.

Tests:

- Tests to add/update:
  - 3D perspective frame resolves to temporal-reprojection-required mode
  - 3D perspective frame bypasses affine reuse with taxonomy-backed miss reason

Validation:

- `pnpm --filter @venus/engine test -- src/renderer/webglInteractionPreview/webglInteractionPreview.test.ts src/renderer/webgl/preview/interaction/webglInteractionPreview.test.ts`
- `pnpm --filter @venus/engine exec tsc --noEmit`

## Task-05 (Completed): Runtime Wiring and Diagnostics Closure

[CHANGE REQUEST]

Target:

- File / Module: `src/runtime/createEngine/diagnosticsSnapshot.ts`
- File / Module: `src/runtime/createEngine/createEngine.ts`
- File / Module: `src/runtime/createEngine.integration.test.ts`
- File / Module: `src/renderer/webgl/capabilities/snapshotCapability.ts`
- File / Module: `src/renderer/webgl/capabilities/tileQueueCapability.ts`
- File / Module: `src/renderer/webgl/tiles/compositor.ts`
- File / Module: `src/renderer/webgl/webgl.ts`
- File / Module: `src/renderer/types/types.ts`
- File / Module: `src/debug/runtimeInspectorV2.ts`
- File / Module: `src/debug/runtimeInspectorV2Contracts.test.ts`

Goal:

- Problem being solved: close runtime wiring so 3D policy and preview execution mode are observable in diagnostics, and apply 3D streaming tile keys at scheduler request points.

Change Type:

- Modify

Impact:

- Affected modules: runtime diagnostics aggregation, WebGL snapshot capability, tile queue/compositor, debug inspector contract, integration tests

Cleanup:

- Old logic to remove: inline getDiagnostics assembly moved into dedicated diagnostics snapshot module.

Tests:

- Tests to add/update:
  - createEngine integration assertion for visibility3dPolicy + previewExecutionMode
  - runtime inspector v2 contract normalization test

Validation:

- `pnpm --filter @venus/engine test -- src/runtime/createEngine.integration.test.ts src/debug/runtimeInspectorV2Contracts.test.ts src/scene/visibility/visibility.test.ts src/renderer/tileManager/tileManager.test.ts src/renderer/webglInteractionPreview/webglInteractionPreview.test.ts src/renderer/webgl/preview/interaction/webglInteractionPreview.test.ts`
- `pnpm --filter @venus/engine exec tsc --noEmit`

## Task-06 (Completed): Baseline and Release-Gate Coverage

[CHANGE REQUEST]

Target:

- File / Module: `src/bench/baselineReport/baselineReport.ts`
- File / Module: `src/bench/baselineReport/baselineReport.test.ts`
- File / Module: `src/runtime/release/threeDimensionalMechanismReadinessV1.ts`
- File / Module: `src/runtime/release/phaseHReleaseContracts.test.ts`
- File / Module: `src/index/index.ts`

Goal:

- Problem being solved: include new 3D mechanism diagnostics in benchmark aggregate outputs and add one release gate contract for mechanism wiring readiness.

Change Type:

- Add + Modify

Impact:

- Affected modules: benchmark baseline report, release contract gates, top-level exports

Cleanup:

- Old logic to remove: none; additive contract extension only.

Tests:

- Tests to add/update:
  - baseline report aggregate counts include preview and 3D visibility execution modes
  - phase H release contracts include mechanism readiness gate

Validation:

- `pnpm --filter @venus/engine test -- src/bench/baselineReport/baselineReport.test.ts src/runtime/release/phaseHReleaseContracts.test.ts`
- `pnpm --filter @venus/engine exec tsc --noEmit`

## Task-07 (Completed): Baseline Summary to Mechanism-Gate Composition

[CHANGE REQUEST]

Target:

- File / Module: `src/runtime/release/threeDimensionalMechanismReadinessV1.ts`
- File / Module: `src/runtime/release/phaseHReleaseContracts.test.ts`
- File / Module: `src/index/index.ts`

Goal:

- Problem being solved: consume baseline summary execution-mode counters in release contracts by composing mechanism readiness input from telemetry signals.

Change Type:

- Modify

Impact:

- Affected modules: 3D mechanism readiness contract, phase-H release contract tests, index exports

Cleanup:

- Old logic to remove: none; existing gate preserved while input composition path is added.

Tests:

- Tests to add/update:
  - phase-H release contracts include telemetry-derived mechanism readiness assertion

Validation:

- `pnpm --filter @venus/engine test -- src/runtime/release/phaseHReleaseContracts.test.ts src/bench/baselineReport/baselineReport.test.ts`
- `pnpm --filter @venus/engine exec tsc --noEmit`

## Task-08 (Completed): Unified Phase E/F/G/H Bundle Gate

[CHANGE REQUEST]

Target:

- File / Module: `src/runtime/release/phaseReleaseBundleV1.ts`
- File / Module: `src/runtime/release/phaseFReleaseContracts.test.ts`
- File / Module: `src/runtime/release/phaseHReleaseContracts.test.ts`
- File / Module: `src/index/index.ts`

Goal:

- Problem being solved: unify phase-E/F/G/H acceptance into one sequential gate contract to provide a single release-ready verdict.

Change Type:

- Add + Modify

Impact:

- Affected modules: phase release contracts and tests, top-level index exports

Cleanup:

- Old logic to remove: none; existing phase contracts remain as source gates while bundle gate composes them.

Tests:

- Tests to add/update:
  - phase-F release contracts test covers bundle happy-path and sequential blocking
  - phase-H release contracts test covers final releaseReady verdict

Validation:

- `pnpm --filter @venus/engine test -- src/runtime/release/phaseFReleaseContracts.test.ts src/runtime/release/phaseGReleaseContracts.test.ts src/runtime/release/phaseHReleaseContracts.test.ts`
- `pnpm --filter @venus/engine exec tsc --noEmit`

## Task-09 (Completed): Single-Entry Final Release Verdict API

[CHANGE REQUEST]

Target:

- File / Module: `src/runtime/release/phaseReleaseFinalVerdictV1.ts`
- File / Module: `src/runtime/release/phaseHReleaseContracts.test.ts`
- File / Module: `src/index/index.ts`

Goal:

- Problem being solved: provide one final release verdict API that composes E/F/G/H bundle gating with phase-H blocker controls.

Change Type:

- Add + Modify

Impact:

- Affected modules: phase release contracts, phase-H tests, top-level exports

Cleanup:

- Old logic to remove: none; composition API is additive and reuses existing contracts.

Tests:

- Tests to add/update:
  - phase-H release contracts include single-entry final verdict assertions for blocker-free and blocker-present paths

Validation:

- `pnpm --filter @venus/engine test -- src/runtime/release/phaseFReleaseContracts.test.ts src/runtime/release/phaseGReleaseContracts.test.ts src/runtime/release/phaseHReleaseContracts.test.ts`
- `pnpm --filter @venus/engine exec tsc --noEmit`
