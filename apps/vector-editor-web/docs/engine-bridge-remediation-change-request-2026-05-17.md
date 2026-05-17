# Vector Engine Bridge Remediation Change Request (2026-05-17)

[CHANGE REQUEST]

Target:

- File / Module:
  - `apps/vector-editor-web/src/runtime/engine-bridge/engine.ts`
  - `apps/vector-editor-web/src/runtime/core/createCanvasRuntimeApi.ts`
  - `apps/vector-editor-web/src/runtime/interaction/selectionDragController.ts`
  - `apps/vector-editor-web/src/runtime/engine-bridge/internal/engineRenderer/useEngineRendererSceneSync.ts`
  - `apps/vector-editor-web/src/runtime/presets/engineSceneAdapter/engineSceneAdapter.ts`
  - `apps/vector-editor-web/src/runtime/engine-bridge/internal/engineRenderer/engineSceneProfile.ts`
  - `apps/vector-editor-web/src/runtime/engine-bridge/internal/engineRenderer/engineRenderer.tsx`
  - `apps/vector-editor-web/src/runtime/engine-bridge/internal/__tests__/engineSceneSyncPolicy.test.ts`
  - `apps/vector-editor-web/src/runtime/presets/engineSceneAdapter/engineSceneAdapter.test.ts`

Goal:

- Problem being solved:
  - Vector runtime still has scattered direct engine imports and duplicated scene-prep triggers.
  - Scene adapter lacks explicit 3D-readiness contract fields for lighting/material compatibility.
  - Engine bridge profile is static and not explicit about adapter/runtime compatibility defaults.
  - Test coverage is missing for scene-sync fast-path policy and scene adapter compatibility fields.

Change Type:

- Modify / Add

Impact:

- Affected modules:
  - Vector runtime engine bridge, interaction drag controller, scene adapter presets.

Cleanup:

- Old logic to remove:
  - Direct package-level engine calls in runtime modules where facade contract already exists.
  - Overly strict scene fast-path identity gate that re-runs prep when revision is stable.

Tests:

- Tests to add/update:
  - Add scene-sync policy unit tests.
  - Add scene-adapter compatibility contract tests.
