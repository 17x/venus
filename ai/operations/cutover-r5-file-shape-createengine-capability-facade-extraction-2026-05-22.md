# CHANGE REQUEST — R5 createEngine capability facade extraction slice (2026-05-22)

[CHANGE REQUEST]

Target:

- File / Module: packages/engine/src/api/createEngine.ts
- New module:
  - packages/engine/src/api/createEngine.capability.facade.ts

Goal:

- Problem being solved: Continue reducing createEngine file-shape pressure by extracting capability namespace assembly with no behavior change.

Change Type:

- Modify

Impact:

- Affected modules: engine capability facade assembly only.

Cleanup:

- Old logic to remove: Inline `capability` object-literal assembly in createEngine.ts.

Tests:

- Validation to run: pnpm --filter @venus/engine exec tsc -p tsconfig.json --noEmit; pnpm governance:file-shape.
