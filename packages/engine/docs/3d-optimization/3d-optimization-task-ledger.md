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
