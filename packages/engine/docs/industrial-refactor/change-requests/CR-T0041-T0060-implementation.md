# CR-T0041-T0060 Implementation

Status: Approved for implementation batch
Date: 2026-05-16
Owner: engine/runtime

[CHANGE REQUEST]

Target:

- File / Module:
  - `packages/engine/docs/industrial-refactor/phase-c/T0041-*.md` to `T0050-*.md`
  - `packages/engine/docs/industrial-refactor/phase-d/T0051-*.md` to `T0060-*.md`
  - `packages/engine/src/runtime/strategy/**`
  - `packages/engine/src/runtime/budget/**`
  - `packages/engine/src/renderer/pipeline/**`
  - `packages/engine/src/renderer/cache/**`
  - `packages/engine/src/index/index.ts`
  - `packages/engine/docs/industrial-refactor/dashboard/program-dashboard.json`

Goal:

- Problem being solved:
  - Deliver phase-C follow-up (T0041-T0050) and phase-D kickoff (T0051-T0060) with executable strategy/profile contracts, pipeline/cache/broker contracts, and deterministic diagnostics coverage.

Change Type:

- Add / Modify

Impact:

- Affected modules:
  - runtime qos/profile decision path
  - runtime diagnostics and replay contracts
  - renderer pipeline/cache industrial contract layer
  - upload/worker budget arbitration layer
  - governance dashboard tracking

Cleanup:

- Old logic to remove:
  - eliminate duplicated profile-specific budget branching by centralizing profile pack decisions.

Tests:

- Tests to add/update:
  - profile-policy and hybrid switching tests
  - qos diagnostics/replay determinism tests
  - pipeline/packet/cache/tile/progressive contract tests
  - upload/worker broker arbitration tests
  - createEngine integration assertions for qos panel fields
