# Entropy Dashboard

Generated at: 2026-05-25T09:03:37.283Z

## Summary

- Files scanned: 793
- AI-TEMP count: 16
- GOV-EXCEPTION count: 0
- Hard-limit files (>600 lines): 16
- Soft-limit files (501-600 lines): 15
- Wrapper-like filenames: 10

## Hard-limit Hotspots

- 2498 lines: apps/vector-editor-web/src/testing/product-specs/rendering/render-parity-runtime-replay-history-gate.contract.test.ts
- 1224 lines: packages/engine/src/testing/webAdapter.conformance.test.ts
- 1155 lines: apps/vector-editor-web/src/runtime/templatePresets/generators/generators.ts
- 912 lines: packages/engine/src/orchestration/api/createEngine.runtime-document-dirty-command.foundation.ts
- 879 lines: packages/engine/src/orchestration/api/createEngine.ts
- 849 lines: packages/engine/src/orchestration/api/public-types/runtime-services.types.ts
- 782 lines: packages/engine/src/testing/createEngine.hard-cut.runtime-foundation.test.ts
- 729 lines: apps/vector-editor-web/src/runtime/engine-bridge/internal/engineRenderer/engineRenderer.tsx
- 726 lines: packages/engine/src/orchestration/api/public-types/core-foundation.types.ts
- 707 lines: packages/engine/src/backend/adapters/webglBackendAdapter.ts
- 702 lines: apps/vector-editor-web/src/runtime/events/index/index/index.runtimeEvents.types.ts
- 702 lines: apps/vector-editor-web/src/runtime/engine-bridge/internal/engineRenderer/createEngineStatsHandler.ts
- 670 lines: packages/engine/src/backend/adapters/webgpuBackendAdapter.ts
- 665 lines: apps/vector-editor-web/src/runtime/engine-bridge/renderParityChecklist.ts
- 661 lines: apps/vector-editor-web/src/runtime/engine-bridge/runtimeDiagnosticsPayload.ts
- 650 lines: packages/engine/src/orchestration/api/public-types/runtime-document-world.types.ts

## Soft-limit Hotspots

- 599 lines: apps/vector-editor-web/src/product/useEditorRuntime/useEditorRuntime.ts
- 574 lines: packages/engine/src/testing/createEngine.hard-cut.test.ts
- 568 lines: apps/vector-editor-web/src/runtime/interaction/transformSessionManager.ts
- 561 lines: packages/engine/src/orchestration/api/createEngine.events-hooks-cache.foundation.ts
- 552 lines: apps/vector-editor-web/src/runtime/core/createCanvasRuntimeController.ts
- 551 lines: packages/lib/src/viewport/index.ts
- 540 lines: packages/engine/src/testing/contract/backendRenderBrowserChain.contract.test.ts
- 524 lines: apps/vector-editor-web/src/runtime/model/document-runtime/documentGovernance.ts
- 516 lines: apps/vector-editor-web/src/views/shell/RuntimeDebugPanel/RuntimeDebugPanel.sceneDirtyModel.ts
- 516 lines: packages/engine/src/orchestration/api/runtimeCapabilityMap.ts
- 515 lines: apps/vector-editor-web/src/runtime/presets/engineSceneAdapter/engineSceneAdapter.ts
- 509 lines: apps/vector-editor-web/src/runtime/events/index/index/index.runtimeEvents.ts
- 508 lines: apps/vector-editor-web/src/runtime/worker/scope/normalizedPatchParity/normalizedPatchParity.fixtures.ts
- 506 lines: apps/vector-editor-web/src/runtime/worker/scope/localHistoryEntry/localHistoryEntry.ts
- 502 lines: apps/vector-editor-web/src/product/runtime/createEditorRuntimeActionExecutor.ts

## Wrapper-like Filenames

- packages/engine/src/orchestration/api/createEngine.cache-policy-security.facade.ts
- packages/engine/src/orchestration/api/createEngine.capability.facade.ts
- packages/engine/src/orchestration/api/createEngine.diagnostics-replay.facade.ts
- packages/engine/src/orchestration/api/createEngine.events-hooks.facade.ts
- packages/engine/src/orchestration/api/createEngine.extension-scheduler.facade.ts
- packages/engine/src/orchestration/api/createEngine.graph-render.facade.ts
- packages/engine/src/orchestration/api/createEngine.lifecycle-view.facade.ts
- packages/engine/src/orchestration/api/createEngine.media-overlay.facade.ts
- packages/engine/src/orchestration/api/createEngine.runtime-capability-dispose.facade.ts
- packages/engine/src/orchestration/api/createEngine.runtime.facade.ts

## Recommended Actions

1. Prioritize splitting hard-limit hotspots by ownership boundary.
2. Reduce AI-TEMP entries by converting temporary branches to permanent contracts.
3. Eliminate wrapper-like names unless authority/transform behavior is explicit.
4. Track unresolved exceptions with expiry and closure owner.
