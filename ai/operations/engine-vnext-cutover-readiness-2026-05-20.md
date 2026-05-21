# Engine vNext Cutover Readiness Snapshot (2026-05-20)

Status: Ready (R3 Validation Complete)
Scope: canonical `packages/engine` cutover validation and stabilization

## Gate Summary

- [x] `pnpm governance:check`
- [x] `pnpm governance:file-shape`
- [x] `pnpm typecheck`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm build`
- [x] `pnpm --filter @venus/engine cr:check`
- [x] `pnpm --filter @venus/engine debug:guard`
- [x] `packages/_vnext/engine` local typecheck + targeted vNext tests
- [x] canonical-vs-vNext parity smoke suite
- [x] folder-level rename-back rehearsal
- [x] post-rename executable validation/check plan

## Remaining Blockers Before Full Cutover

- [x] Parity suite implemented: `packages/_vnext/engine/src/testing/canonicalVnext.parity-smoke.test.mjs`.
- [x] Cutover rehearsal executed: `node ./scripts/engine-vnext-cutover-dry-run.mjs`.
- [x] Post-rename executable checks documented and runnable:
  - `scripts/engine-vnext-post-rename-check.mjs`
  - `ai/operations/engine-vnext-post-rename-exec-plan-2026-05-20.md`
- [x] Canonical export parity with app/runtime consumers closed via legacy compatibility bridge.
- [x] Real cutover validation passed in R3 state without rollback trigger.
- [x] Workspace/project compatibility for canonicalized vNext package validated.

## Latest Real Attempt

- R3 cutover validation (2026-05-20) passed all required gates:
  - `node ./scripts/engine-vnext-post-rename-check.mjs`
  - `pnpm --filter @venus/engine cr:check`
  - `pnpm --filter @venus/engine debug:guard`
  - `pnpm governance:check`
  - `pnpm governance:file-shape`
  - `pnpm typecheck`
  - `pnpm lint` (warnings only)
  - `pnpm test`
  - `pnpm build`
- Attempt history (including earlier rollbacks): `ai/operations/engine-vnext-cutover-attempt-rollback-2026-05-20.md`.

## Recommended Next Execution Steps

1. Start rollback-window observation for compatibility bridge behavior in app integration paths.
2. Plan staged removal of `AI-TEMP` compatibility exports once native vNext equivalents land.
3. Decide archival lifecycle for `_vnext` staging copy and document final disposal sequence.

## Notification Rule

Ready declaration criteria are now satisfied for the current R3 state. Required artifacts currently available:

- `ai/operations/engine-vnext-cutover-rehearsal-2026-05-20.md`
- `ai/operations/engine-vnext-post-rename-exec-plan-2026-05-20.md`
- `ai/operations/engine-vnext-cutover-attempt-rollback-2026-05-20.md`
