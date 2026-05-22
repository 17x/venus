# R5 Task-5 Reference Rewrite Runner (2026-05-22)

## Scope

- Add one reusable command for rename-back path rewrite execution.
- Target `_vnext` path references in workspace/package/tsconfig/import/script/doc surfaces.

## Changes

1. Added script: `scripts/cutover-reference-rewrite.mjs`.
2. Added root command: `pnpm governance:cutover-rewrite`.

## Behavior

1. Build replacement rules from current `packages/_vnext/<name>` directories.
2. Scan rewrite-eligible files (root configs, packages/apps sources, scripts, and AI operation docs).
3. Replace literal paths from:
   - `packages/_vnext/<name>` -> `packages/<name>`
4. Default mode is dry-run; pass `--apply` to write files.
5. Report per-file replacement lines and rewrite summary totals.

## Status

- Runner command is implemented and validated in dry-run mode.
- Actual apply rewrite remains pending approved cutover execution window.
