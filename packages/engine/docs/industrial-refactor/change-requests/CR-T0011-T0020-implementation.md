# CR-T0011-T0020 Implementation

Status: Approved for implementation batch
Date: 2026-05-16
Owner: engine/runtime

[CHANGE REQUEST]

Target:

- File / Module:
  - `packages/engine/docs/industrial-refactor/phase-a/T0011-boundary-charter.md`
  - `packages/engine/docs/industrial-refactor/phase-a/T0012-phase-a-acceptance.md`
  - `packages/engine/docs/industrial-refactor/phase-b/T0013-*.md` to `T0020-*.md`
  - `packages/engine/src/settings/**`
  - `packages/engine/src/runtime/policy/**`
  - `packages/engine/src/runtime/budget/**`
  - `packages/engine/src/index/index.ts`
  - `packages/engine/docs/industrial-refactor/dashboard/program-dashboard.json`

Goal:

- Problem being solved:
  - Deliver the next 10 serialized tasks with executable contracts for boundaries, settings, runtime policy, and runtime budget, including validation tests.

Change Type:

- Add / Modify

Impact:

- Affected modules:
  - engine governance docs and task tracking
  - runtime configuration contract surface
  - runtime policy and budget normalization path

Cleanup:

- Old logic to remove:
  - None in this batch. This is first introduction of settings/policy contract modules.

Tests:

- Tests to add/update:
  - settings schema validation tests
  - preset resolver tests
  - runtime policy generation completeness tests
  - runtime budget snapshot tests
