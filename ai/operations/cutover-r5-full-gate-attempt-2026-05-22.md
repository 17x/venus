# R5 Task-6 Full Validation Gate Attempt (2026-05-22)

## Scope

- Execute the full repository validation gate sequence required by R5 task-6.
- Record pass/fail outcomes and blockers with exact failing step.

## Commands Executed

1. `pnpm governance:check`
2. `pnpm governance:file-shape:all`
3. `pnpm typecheck`
4. `pnpm lint`
5. `pnpm test`
6. `pnpm build`

## Result

- Gate execution stopped at step 1 (`pnpm governance:check`) due to existing repository governance blockers.
- Downstream steps were not executed in this full-gate run because the sequence is fail-fast.

## Failing Signals (step 1)

1. `vector stem-family folder violation`: `apps/vector-editor-web/src/runtime/presets/engineSceneAdapter::engineSceneAdapter.text`
2. `vector file size hard limit exceeded (636)`: `apps/vector-editor-web/src/runtime/engine-bridge/engine.ts`
3. `lib subpath not exported`: `packages/engine-legacy/src/worker/capabilities/capabilities.ts -> @venus/lib/worker`
4. `lib subpath not exported`: `packages/engine-legacy/src/runtime/renderScheduler/renderScheduler.ts -> @venus/lib/scheduler`
5. `lib subpath not exported`: `packages/engine-legacy/src/interaction/zoom/zoom.ts -> @venus/lib/viewport`

## Status

- R5 task-6 remains pending until governance baseline blockers are resolved or formally waived.
- This task should be retried after blocker remediation.

## Follow-up Validation (same date)

## Commands Executed

1. `pnpm governance:file-shape`
2. `pnpm --filter @venus/engine exec node --import tsx --test src/testing/createEngine.hard-cut.test.ts src/testing/createEngine.hard-cut.runtime-foundation.test.ts`
3. `pnpm typecheck`
4. `pnpm lint -- --format json --output-file lint_output.json`
5. `./node_modules/.bin/eslint packages/engine/src/api/createEngine.ts --format json --output-file lint_output.createEngine.json`
6. `wc -l packages/engine/src/api/createEngine.ts packages/engine/src/api/public-types.ts`

## Follow-up Result

- `pnpm governance:file-shape`: fail (remaining hard-limit blockers in `packages/engine/src/api/createEngine.ts` and `packages/engine/src/api/public-types.ts`).
- Engine hard-cut split tests: pass (`2` tests passed).
- `pnpm typecheck`: pass.
- `createEngine.ts` `jsdoc/require-param`: pass (remaining count `0` in targeted lint output).
- Hard-limit line counts: `packages/engine/src/api/createEngine.ts` (`4139`) and `packages/engine/src/api/public-types.ts` (`2370`).

## Follow-up Interpretation

- Earlier governance baseline blockers recorded in step-1 are now remediated.
- Task-6 is still blocked by file-shape hard-limit pressure in oversized engine API files.

## Follow-up Validation (public-types split)

## Commands Executed

1. `pnpm --filter @venus/engine exec tsc -p tsconfig.json --noEmit`
2. `pnpm governance:file-shape`
3. `pnpm typecheck`
4. `wc -l packages/engine/src/api/createEngine.ts packages/engine/src/api/public-types.ts packages/engine/src/api/public-types/*.ts`

## Follow-up Result

- `pnpm --filter @venus/engine exec tsc -p tsconfig.json --noEmit`: pass.
- `pnpm typecheck`: pass.
- `pnpm governance:file-shape`: fail only on `packages/engine/src/api/createEngine.ts`.
- Public types split line counts: `packages/engine/src/api/public-types.ts` (`6`) and split modules (`469`, `412`, `575`, `545`, `259`, `279`), all below hard limit.
- Current remaining hard-limit line count: `packages/engine/src/api/createEngine.ts` (`4141`).

## Follow-up Validation (createEngine extraction slice)

## Commands Executed

1. `pnpm --filter @venus/engine exec tsc -p tsconfig.json --noEmit`
2. `pnpm governance:file-shape`
3. `wc -l packages/engine/src/api/createEngine.ts packages/engine/src/api/createEngine.foundation.ts packages/engine/src/api/createEngine.events-hooks.facade.ts packages/engine/src/api/createEngine.extension-scheduler.facade.ts`

## Follow-up Result

- `pnpm --filter @venus/engine exec tsc -p tsconfig.json --noEmit`: pass.
- `pnpm governance:file-shape`: fail only on `packages/engine/src/api/createEngine.ts`.
- `packages/engine/src/api/createEngine.ts`: reduced from `4141` to `3724`.
- Extracted module line counts: `createEngine.foundation.ts` (`224`), `createEngine.events-hooks.facade.ts` (`171`), `createEngine.extension-scheduler.facade.ts` (`148`).

## Follow-up Interpretation

- File-shape pressure on `createEngine.ts` is reduced but still above hard limit.
- R5 task-6 remains blocked solely by `packages/engine/src/api/createEngine.ts` hard-limit.

## Follow-up Validation (createEngine cache/policy/security + capability + runtime extraction slices)

## Commands Executed

1. `pnpm --filter @venus/engine exec tsc -p tsconfig.json --noEmit`
2. `pnpm governance:file-shape`
3. `wc -l packages/engine/src/api/createEngine.ts packages/engine/src/api/createEngine.cache-policy-security.facade.ts packages/engine/src/api/createEngine.capability.facade.ts packages/engine/src/api/createEngine.runtime.facade.ts`

## Follow-up Result

- `pnpm --filter @venus/engine exec tsc -p tsconfig.json --noEmit`: pass.
- `pnpm governance:file-shape`: fail only on `packages/engine/src/api/createEngine.ts` hard limit.
- `packages/engine/src/api/createEngine.ts`: reduced to `3532`.
- Extracted module line counts: `createEngine.cache-policy-security.facade.ts` (`219`), `createEngine.capability.facade.ts` (`73`), `createEngine.runtime.facade.ts` (`297`).

## Follow-up Interpretation

- Additional namespace extractions are validated and behavior-preserving at compile level.
- R5 task-6 remains blocked solely by `packages/engine/src/api/createEngine.ts` hard-limit.

## Follow-up Interpretation

- File-shape pressure from `packages/engine/src/api/public-types.ts` is resolved.
- R5 task-6 remains blocked solely by `packages/engine/src/api/createEngine.ts` hard-limit.
