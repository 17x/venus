# CHANGE REQUEST — R5 createEngine runtime facade extraction slice (2026-05-22)

[CHANGE REQUEST]

Target:

- File / Module: packages/engine/src/api/createEngine.ts
- New module:
  - packages/engine/src/api/createEngine.runtime.facade.ts

Goal:

- Problem being solved: Reduce createEngine file-shape pressure by extracting runtime namespace assembly without changing runtime behavior.

Change Type:

- Modify

Impact:

- Affected modules: engine runtime facade assembly path.

Cleanup:

- Old logic to remove: Inline `runtime` object-literal assembly in createEngine.ts.

Tests:

- Validation to run: pnpm --filter @venus/engine exec tsc -p tsconfig.json --noEmit; pnpm governance:file-shape.
