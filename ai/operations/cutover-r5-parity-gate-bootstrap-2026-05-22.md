# R5 Task-2 Cutover Parity Gate Bootstrap (2026-05-22)

## Scope

- Add one repo-level cutover parity gate command that validates both canonical engine parity suites and legacy parity suites.
- Keep the gate fail-fast and deterministic for CI/automation usage.

## Changes

1. Added script: `scripts/cutover-parity-gate.mjs`.
2. Added root command: `pnpm governance:cutover-parity` in `package.json`.
3. Added legacy parity tests: `packages/engine-legacy/src/runtime/release/runtimeRelease.parity.test.ts`.

## Gate Steps

1. Canonical parity tests:
   - `pnpm --filter @venus/engine exec node --import tsx --test src/testing/*.parity.test.ts src/testing/canonicalVnext.parity-smoke.test.mjs`
2. Legacy parity tests:
   - `pnpm --filter @venus/engine-legacy exec node --import tsx --test src/runtime/release/runtimeRelease.parity.test.ts`

## Acceptance Mapping

- Repo refactor plan `R5 task-2` requires parity coverage across old and vNext/canonical paths.
- This gate introduces one reproducible command covering both paths and exits non-zero on any parity failure.
