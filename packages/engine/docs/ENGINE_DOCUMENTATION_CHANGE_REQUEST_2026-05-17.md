# Engine Documentation Change Request (2026-05-17)

[CHANGE REQUEST]

Target:

- File / Module:
  - `packages/engine/docs/index.md`
  - `packages/engine/docs/en/*`
  - `packages/engine/docs/cn/*`
  - `packages/engine/docs/outline.md`

Goal:

- Problem being solved:
  - Existing engine module docs were fragmented and mostly single-language.
  - Missing entry index and layered module walkthrough caused high onboarding/debugging cost.
  - Need a full-module logic map with features, limits, governance, and cross-module relationships.

Change Type:

- Add / Modify

Impact:

- Affected modules:
  - Documentation only for engine architecture, boundaries, runtime-render flow, and validation checklist.

Cleanup:

- Old logic to remove:
  - Replace the old outline-only entry workflow with a bilingual index-first navigation model.

Tests:

- Tests to add/update:
  - No runtime behavior change. Validation is doc link and structure consistency check.
