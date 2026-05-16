# CR-T0031-T0040 Implementation

Status: Approved for implementation batch
Date: 2026-05-16
Owner: engine/runtime

[CHANGE REQUEST]

Target:

- File / Module:
  - `packages/engine/docs/industrial-refactor/phase-c/T0031-*.md` to `T0040-*.md`
  - `packages/engine/src/runtime/strategy/**`
  - `packages/engine/src/runtime/createEngine/createEngine.ts`
  - `packages/engine/src/index/index.ts`
  - `packages/engine/docs/industrial-refactor/dashboard/program-dashboard.json`

Goal:

- Problem being solved:
  - Deliver phase-C first 10 tasks with executable strategy-input v2, degradation ladder, phase stability guard, QoS controller, hard guard, and renderer wiring.

Change Type:

- Add / Modify

Impact:

- Affected modules:
  - runtime strategy/QoS decision path
  - diagnostics exposure for QoS snapshots
  - phase-C governance and tracking artifacts

Cleanup:

- Old logic to remove:
  - none in this batch; additive QoS scaffolding for staged integration.

Tests:

- Tests to add/update:
  - strategy input normalization tests
  - phase stability hysteresis tests
  - degradation guard tests
  - qos controller and hard guard tests
  - createEngine diagnostics QoS wiring tests
