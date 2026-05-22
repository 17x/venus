# R5 Task-5 Rename Impact Precheck (2026-05-22)

## Scope

- Add one precheck report command for R5 task-5 readiness.
- Cover workspace entries, package metadata, tsconfig references, and source import/path references related to rename-back.

## Changes

1. Added script: `scripts/cutover-rename-impact-report.mjs`.
2. Added root command: `pnpm governance:cutover-impact`.

## Report Coverage

1. Build rename plan from `packages/_vnext/<name>` to `packages/<name>` and detect target collisions.
2. Verify workspace invariant: `pnpm-workspace.yaml` contains `packages/*`.
3. Scan key config/source scopes for:
   - `packages/_vnext/` path references.
   - `@venus/engine-legacy` import references.
4. Emit summarized counts and sample lines (first 30 entries per category).

## Blocking Policy

- The command fails on hard blockers:
  - missing `packages/*` workspace glob;
  - empty `_vnext` rename plan;
  - canonical target path already exists.

## Status

- Precheck command is implemented and validated in current workspace.
- Task-5 execution (actual reference rewrites and metadata updates) remains pending staged cutover window.
