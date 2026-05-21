# Engine vNext Structure Alignment (2026-05-19)

[CHANGE REQUEST]

Target:

- File / Module:
  - `packages/_vnext/engine`
  - `ai/refactor-vnext/engine-refactor-management.md`

Goal:

- Problem being solved:
  - Engine vNext structure was not explicitly aligned to `ai/draft.md` target tree.
  - Start destructive refactor by materializing the target directory skeleton under `_vnext`.

Change Type:

- Add / Modify / Remove
  - Add: vNext engine package skeleton and directory tree.
  - Modify: engine refactor management doc section for authoritative structure alignment.

Impact:

- Affected modules:
  - New staging path `packages/_vnext/engine`.
  - Planning/governance doc alignment in `ai/refactor-vnext`.

Cleanup:

- Old logic to remove:
  - None in this step.
  - `_vnext` naming and staging package will be removed at final rename-back cutover.

Tests:

- Tests to add/update:
  - Not applicable in this structure-only step.
  - Validation for this step is tree existence and whitespace-safe docs.

---

## Completed

- [x] Created `packages/_vnext/engine/package.json`.
- [x] Created `packages/_vnext/engine/tsconfig.json`.
- [x] Created `packages/_vnext/engine/src/index.ts`.
- [x] Created `packages/_vnext/engine/src/STRUCTURE.md`.
- [x] Created full directory skeleton matching `ai/draft.md` target shape.
- [x] Updated `ai/refactor-vnext/engine-refactor-management.md` to treat draft structure as authoritative.

## Next

- [ ] Add vNext public type contracts under `src/api`.
- [ ] Add runtime shell contracts under `src/runtime` and `src/backend`.
- [ ] Add no-op/headless backend tests under `src/testing`.
- [ ] Start E0 parity scenario inventory against current `packages/engine`.
