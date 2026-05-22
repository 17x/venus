# CHANGE REQUEST — R5 createEngine facade extraction slice (2026-05-22)

[CHANGE REQUEST]

Target:

- File / Module: packages/engine/src/api/createEngine.ts
- New modules:
  - packages/engine/src/api/createEngine.foundation.ts
  - packages/engine/src/api/createEngine.events-hooks.facade.ts
  - packages/engine/src/api/createEngine.extension-scheduler.facade.ts

Goal:

- Problem being solved: Reduce createEngine hard-limit file-shape pressure through responsibility-based extraction without API behavior changes.

Change Type:

- Modify

Impact:

- Affected modules: engine public API assembly path only.

Cleanup:

- Old logic to remove: Inline helper and namespace assembly code replaced by extracted facade/foundation modules.

Tests:

- Tests to add/update: No behavior tests added.
- Validation executed: `pnpm --filter @venus/engine exec tsc -p tsconfig.json --noEmit`, `pnpm governance:file-shape`.

Outcome:

- Typecheck: pass.
- File-shape: still blocked only by `packages/engine/src/api/createEngine.ts`.
- createEngine line count reduced from `4141` to `3724` in this extraction batch.
