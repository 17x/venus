# CR-T0021-T0030 Implementation

Status: Approved for implementation batch
Date: 2026-05-16
Owner: engine/runtime

[CHANGE REQUEST]

Target:

- File / Module:
  - `packages/engine/docs/industrial-refactor/phase-b/T0021-*.md` to `T0030-*.md`
  - `packages/engine/src/runtime/budget/pressureMonitor.ts`
  - `packages/engine/src/runtime/policy/autoQualityScaler.ts`
  - `packages/engine/src/settings/migrator/settingsMigrator.ts`
  - `packages/engine/src/runtime/createEngine/createEngine.ts`
  - `packages/engine/scripts/policy-replay.mjs`
  - `packages/engine/scripts/check-debug-settings-release.mjs`
  - `packages/engine/docs/industrial-refactor/dashboard/program-dashboard.json`

Goal:

- Problem being solved:
  - Deliver T0021-T0030 executable contracts, including pressure monitor, auto quality scaler, settings migrator, policy wiring, replay tooling, and phase-B closure artifacts.

Change Type:

- Add / Modify

Impact:

- Affected modules:
  - runtime policy and budget decision path
  - engine configuration migration path
  - governance scripts and acceptance workflow

Cleanup:

- Old logic to remove:
  - None in this batch; this introduces first policy replay and migrator baseline.

Tests:

- Tests to add/update:
  - pressure hysteresis anti-flap tests
  - auto-scaler cooldown and step tests
  - settings migrator compatibility tests
  - policy snapshot integration smoke assertions
