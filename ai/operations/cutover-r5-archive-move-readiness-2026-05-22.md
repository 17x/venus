# R5 Task-3 Archive Move Readiness (2026-05-22)

## Scope

- Prepare a safe, repeatable command for moving old folders into a non-workspace archive path during cutover.
- Keep default execution non-destructive (dry-run) and require explicit `--apply` for mutation.

## Changes

1. Added script: `scripts/cutover-archive-finalize.mjs`.
2. Added root command: `pnpm governance:cutover-archive`.
3. Script reads targets from `ai/refactor-vnext/cutover-freeze-roots.json` and plans moves to:
   - `archive/refactor-cutover-YYYY-MM-DD/<target>`

## Safety Rules

1. Default mode is dry-run and prints planned move operations.
2. Apply mode requires explicit `--apply`.
3. Apply mode checks source existence and destination non-existence.
4. Apply mode requires clean worktree unless `--allow-dirty` is provided.

## Current Status

- Command-level readiness is complete.
- Actual folder move remains pending execution in approved cutover window.
