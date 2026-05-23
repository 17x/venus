# Engine Testing System

## Scope

This document defines the engine-internal testing system baseline.

Policy:

- Engine test gates must not depend on external application environment checks.
- `@venus/vector-editor-web` typecheck is not an engine test guard.
- Engine test orchestration is driven by `packages/engine/ai/engine-test-system-manifest-2026-05-23.json`.

## Required Test Types

1. Unit Test
2. Regression Test
3. Rendering Snapshot Test
4. Performance Benchmark
5. Interaction Test
6. Stress Test
7. Visual Regression Test
8. E2E Test
9. Fuzz Test
10. Deterministic Test

## Scenario Coverage Baseline

Scenario ids S1-S13 are mapped in the manifest and each scenario must include one or more required test types.

## Validation

Run:

- `pnpm --filter @venus/engine typecheck`
- `pnpm --filter @venus/engine test`
- `pnpm --filter @venus/engine run cr:check`

Engine-internal guard test:

- `node --import tsx --test src/testing/engineTestSystemCoverage.contract.test.mjs`
