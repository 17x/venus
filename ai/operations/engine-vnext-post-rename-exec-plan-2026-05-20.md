# Engine vNext Post-Rename Executable Plan (2026-05-20)

Status: Active
Scope: Executable steps after rename-back from `packages/_vnext/engine` to `packages/engine`

## Step 1: Preflight

1. `pnpm governance:check`
2. `pnpm governance:file-shape`
3. `pnpm typecheck`

## Step 2: Rename Sequence

1. Move canonical engine to archive path (outside workspace package globs).
2. Rename `packages/_vnext/engine` to `packages/engine`.
3. Ensure `packages/engine/package.json` keeps canonical name `@venus/engine`.

## Step 3: Metadata and Wiring Validation

1. Run post-rename metadata checker:
   - `node ./scripts/engine-vnext-post-rename-check.mjs`
2. Validate package exports and imports:
   - `pnpm typecheck`
3. Validate governance:
   - `pnpm governance:check`
   - `pnpm governance:file-shape`

## Step 4: Full Gates

1. `pnpm lint`
2. `pnpm test`
3. `pnpm build`
4. `pnpm --filter @venus/engine cr:check`
5. `pnpm --filter @venus/engine debug:guard`

## Step 5: Rollback Trigger

If any step in 3/4 fails:

1. Move failed canonical path to quarantine.
2. Restore archived canonical engine path.
3. Re-run:
   - `pnpm typecheck`
   - `pnpm lint`
   - `pnpm --filter @venus/engine test`

## Automation Hooks

- Rehearsal script: `scripts/engine-vnext-cutover-dry-run.mjs`
- Post-rename check script: `scripts/engine-vnext-post-rename-check.mjs`
