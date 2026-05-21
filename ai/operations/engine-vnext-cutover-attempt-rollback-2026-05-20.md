# Engine vNext Real Cutover Attempt and Rollback (2026-05-20)

Status: Completed (Rolled Back)
Scope: Real rename-back attempt from `packages/_vnext/engine` to `packages/engine`

## Attempt Summary

1. Executed real rename-back sequence:
   - `packages/engine` -> `archive/engine-pre-cutover-2026-05-20`
   - `packages/_vnext/engine` -> `packages/engine`
2. Ran full validation stack.
3. Detected blocking failures and executed rollback trigger.

## Blocking Failures Observed

- `pnpm typecheck` failed during cutover attempt:
  - TS config/project mismatch and downstream reference failures.
- `pnpm --filter @venus/engine test` failed:
  - parity smoke module resolution issue in canonical path.
- `pnpm build` failed:
  - app expects canonical `@venus/engine` exports that are not yet provided by vNext package.

## Rollback Actions Executed

1. `packages/engine` moved to `archive/engine-cutover-failed-2026-05-20`.
2. `archive/engine-pre-cutover-2026-05-20` restored to `packages/engine`.
3. Failed cutover package restored to staging path:
   - `archive/engine-cutover-failed-2026-05-20` -> `packages/_vnext/engine`.

## Post-Rollback Validation

- `pnpm typecheck`: pass
- `pnpm lint`: pass
- `pnpm --filter @venus/engine test`: pass

## Conclusion

The real cutover attempt was correctly rolled back and canonical stability was restored. Full cutover remains blocked until canonical export parity and workspace/project compatibility are closed.

---

## Attempt #2 (2026-05-20)

Status: Completed (Rolled Back)

### Attempt Summary

1. Executed real rename-back sequence (R2):
   - `packages/engine` -> `archive/engine-pre-cutover-2026-05-20-r2`
   - `packages/_vnext/engine` -> `packages/engine`
2. Passed early preflight gates and metadata checks.
3. Failed at full validation and executed rollback trigger.

### Blocking Failures Observed

- `pnpm typecheck` failed:
  - project reference contract mismatch (`composite`/emit settings) while canonicalized package was using staging tsconfig shape.
- `pnpm typecheck` failed again after config patch:
  - compatibility bridge referenced legacy engine source path not available under canonical cutover layout.
- `pnpm build` failed in attempted state:
  - canonical export parity gaps remained for app-side `@venus/engine` consumers.

### Rollback Actions Executed

1. `packages/engine` -> `archive/engine-cutover-failed-2026-05-20-r2`.
2. `archive/engine-pre-cutover-2026-05-20-r2` restored to `packages/engine`.
3. Failed cutover package restored to staging path:
   - `archive/engine-cutover-failed-2026-05-20-r2` -> `packages/_vnext/engine`.

### Post-Rollback Validation

- `pnpm typecheck`: pass
- `pnpm lint`: pass
- `pnpm --filter @venus/engine test`: pass

---

## Attempt #3 (R3, 2026-05-20)

Status: Completed (Validation Passed, No Rollback)

### Attempt Summary

1. Canonical package state validated with legacy bridge strategy (`@venus/engine-legacy`).
2. Closed root typecheck blocker by removing cross-package source imports from compat layer.
3. Executed full gate stack in R3 state.

### Validation Results

- `node ./scripts/engine-vnext-post-rename-check.mjs`: pass
- `pnpm --filter @venus/engine cr:check`: pass
- `pnpm --filter @venus/engine debug:guard`: pass
- `pnpm governance:check`: pass
- `pnpm governance:file-shape`: pass
- `pnpm typecheck`: pass
- `pnpm lint`: pass (warnings only)
- `pnpm test`: pass
- `pnpm build`: pass

### Conclusion

R3 reached full validation green state without triggering rollback. Earlier rollback attempts remain documented for audit trail and regression context.
