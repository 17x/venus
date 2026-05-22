# CHANGE REQUEST — R5 createEngine cache-policy-security extraction slice (2026-05-22)

[CHANGE REQUEST]

Target:

- File / Module: packages/engine/src/api/createEngine.ts
- New module:
  - packages/engine/src/api/createEngine.cache-policy-security.facade.ts

Goal:

- Problem being solved: Continue reducing createEngine hard-limit file-shape pressure by extracting cache/policy/security facade assembly while preserving runtime behavior and API contract.

Change Type:

- Modify

Impact:

- Affected modules: engine API facade assembly only.

Cleanup:

- Old logic to remove: Inline cache/policy/security object-literal implementations replaced by extracted facade function.

Tests:

- Validation to run: pnpm --filter @venus/engine exec tsc -p tsconfig.json --noEmit; pnpm governance:file-shape.
