# Epic A Legacy Toggle Governance (2026-05-18)

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/src/runtime/createEngine/createEngineRendererBootstrap.ts
  - packages/engine/src/runtime/createEngine/createEngineContracts.ts
  - packages/engine/src/debug/runtimeInspectorV2.ts

Goal:

- Problem being solved:
  - Keep the engine mainline on 3D-first render/visibility defaults.
  - Confine remaining 2D fallback behavior to explicit compatibility toggles.

Change Type:

- Add / Modify / Remove
  - Modify (default toggle behavior + diagnostics baseline)
  - Add (legacy-toggle governance ledger)

Impact:

- Affected modules:
  - createEngine renderer bootstrap defaults
  - runtime diagnostics inspector normalization
  - integration/debug expectation baselines

Cleanup:

- Old logic to remove:
  - Implicit default enabling of model-complete 2D composite lane.
  - Legacy visibility default wording tied to fallback-frustum-coarse.

Tests:

- Tests to add/update:
  - Update runtimeInspectorV2 default mode expectation.

---

## Governance List

1. Toggle: render.modelCompleteComposite

- Owner module: createEngine renderer bootstrap
- Current state: compatibility-only, explicit opt-in required
- Default: false
- Risk if enabled: routes non-interactive frames through 2D model composite lane, increasing fallback coupling
- Removal condition: WebGL/WebGPU packet path rich-text and zero-draw recovery are production-complete without model-complete lane

2. Toggle family: visibility execution fallback wording

- Owner module: runtime inspector normalization
- Current state: mainline default wording switched to frustum-only
- Default inspector value when absent: frustum-only
- Removal condition: all dashboards and downstream tooling consume policy-provided execution mode directly

## Exit Criteria for Epic A Toggle Governance

- No implicit 2D fallback toggle remains enabled by default in createEngine mainline.
- Diagnostics mainline defaults reflect frustum-first 3D posture.
- Any temporary compatibility branch must be tagged with AI-TEMP and removal condition.
