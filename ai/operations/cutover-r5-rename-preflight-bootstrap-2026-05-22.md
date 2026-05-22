# R5 Task-4 Rename Preflight Bootstrap (2026-05-22)

## Scope

- Add one non-destructive command to preflight rename-back from `packages/_vnext/*` to canonical `packages/*`.
- Keep default behavior dry-run to avoid accidental cutover mutation.

## Changes

1. Added script: `scripts/cutover-rename-preflight.mjs`.
2. Added root command: `pnpm governance:cutover-rename`.

## Preflight Behavior

1. Enumerate staged package directories under `packages/_vnext`.
2. Build rename plan from `packages/_vnext/<name>` to `packages/<name>`.
3. Dry-run (default): print planned rename operations.
4. Apply mode (`--apply`):
   - requires source paths to exist;
   - requires target paths to not exist;
   - requires clean worktree unless `--allow-dirty` is provided.

## Status

- Rename preflight command is ready and validated in dry-run mode.
- Actual rename execution remains pending approved cutover window.
