# CHANGE REQUEST — R5 createEngine base facade extraction slice (2026-05-22)

[CHANGE REQUEST]

Target:

- File / Module: packages/engine/src/api/createEngine.ts
- New module:
  - packages/engine/src/api/createEngine.base.facade.ts

Goal:

- Problem being solved: Further reduce createEngine file-shape pressure by extracting the non-namespace base EngineHandle method assembly while preserving behavior.

Change Type:

- Modify

Impact:

- Affected modules: engine API facade assembly only.

Cleanup:

- Old logic to remove: Inline base method object-literal section in createEngine.ts.

Tests:

- Validation to run: pnpm --filter @venus/engine exec tsc -p tsconfig.json --noEmit; pnpm governance:file-shape.
