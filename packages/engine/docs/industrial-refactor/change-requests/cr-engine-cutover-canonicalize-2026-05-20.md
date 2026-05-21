# CR: Engine Cutover Canonicalize (2026-05-20)

[CHANGE REQUEST]

Target:

- File / Module:
  - `packages/engine/package.json`
  - `packages/engine/scripts/check-change-request.mjs`
  - `packages/engine/scripts/check-debug-settings-release.mjs`
  - `packages/engine/scripts/policy-replay.mjs`
  - `packages/engine/scripts/update-program-dashboard.mjs`

Goal:

- Problem being solved:
  - Canonicalize package metadata and script gates after `_vnext` rename-back cutover.
  - Keep engine CR/debug governance gates runnable on the new canonical engine path.

Change Type:

- Add / Modify
  - Modify: package metadata and scripts map.
  - Add: canonical engine scripts and cutover CR artifact.

Impact:

- Affected modules:
  - Engine package governance and operations commands.
  - No runtime rendering behavior changes.

Cleanup:

- Old logic to remove:
  - AI-TEMP placeholders in dashboard/policy scripts must be removed after canonical tooling migration.

Tests:

- Tests to add/update:
  - Validate `pnpm --filter @venus/engine cr:check`.
  - Validate `pnpm --filter @venus/engine debug:guard`.
  - Validate repo gates (`typecheck`, `lint`, `test`, `build`).
