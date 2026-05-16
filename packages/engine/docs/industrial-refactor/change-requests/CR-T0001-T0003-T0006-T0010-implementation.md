# CR-T0001-T0003-T0006-T0010 Implementation

Status: Approved for implementation batch
Date: 2026-05-16
Owner: engine/runtime

[CHANGE REQUEST]

Target:

- File / Module:
  - `packages/engine/src/bench/baselineReport/**`
  - `packages/engine/src/bench/runBaselineBenchmark.ts`
  - `packages/engine/scripts/update-program-dashboard.mjs`
  - `.github/workflows/engine-governance.yml`
  - `packages/engine/package.json`
  - `package.json`

Goal:

- Problem being solved:
  - Deliver executable baseline evidence generation (T0001), per-frame diagnostics report schema path (T0006), CR gate in CI (T0003), and dashboard trend ingestion (T0010).

Change Type:

- Add / Modify

Impact:

- Affected modules:
  - benchmark/report tooling
  - engine governance CI
  - dashboard trend ingestion flow

Cleanup:

- Old logic to remove:
  - None. This batch adds missing execution rails without replacing runtime behavior.

Tests:

- Tests to add/update:
  - unit test for baseline report aggregate + phase mapping
  - smoke run for baseline benchmark output
  - dashboard ingestion update smoke
