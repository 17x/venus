# Engine vNext Cutover Rehearsal Record (2026-05-20)

Status: Completed
Scope: Folder-level rename-back dry run using temporary filesystem workspace

## Command

- `node ./scripts/engine-vnext-cutover-dry-run.mjs`

## Result

- Output: `CUTOVER_DRY_RUN_PASS`
- Invariants validated by script:
  - canonical `packages/engine` can be archived to an external path
  - `_vnext` engine path can be promoted into canonical path
  - rollback path restores both canonical and `_vnext` folders

## Notes

- The rehearsal runs in a temporary directory under OS tmp and does not mutate repo files.
- Script location: `scripts/engine-vnext-cutover-dry-run.mjs`
