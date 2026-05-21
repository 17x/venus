import type { EngineRuntimeProfile } from "../profile-contracts";
import { vectorEditorRuntimeProfile } from "../vector-editor/vector-editor-profile";

/**
 * Dense-scene vector scenario profile used by deterministic replay and diagnostics tests.
 */
export const vectorDenseSceneScenarioProfile: EngineRuntimeProfile = {
  ...vectorEditorRuntimeProfile,
  id: "vector-dense-scene-scenario-runtime",
  target: "scenario",
  strictness: "dev",
  scenario: "vector-dense-scene",
  scenarioManifest: {
    id: "scenario.vector-dense-scene.v1",
    description: "Dense vector scene replay covering document, viewport, and interaction timelines.",
    replay: {
      documentChangeSets: [
        {
          id: "dense-load-1",
          targetRevision: 1,
          operations: [
            {
              type: "upsert-node",
              node: {
                id: "shape-1",
                kind: "shape",
                payload: {
                  transformRevision: 1,
                  geometryRevision: 1,
                  materialRevision: 1,
                  visibilityRevision: 1,
                  pickingRevision: 1,
                  gpuUploadRevision: 1,
                },
              },
            },
            {
              type: "upsert-node",
              node: {
                id: "shape-2",
                kind: "shape",
                payload: {
                  transformRevision: 1,
                  geometryRevision: 1,
                  materialRevision: 1,
                  visibilityRevision: 1,
                  pickingRevision: 1,
                  gpuUploadRevision: 1,
                },
              },
            },
            {
              type: "upsert-node",
              node: {
                id: "shape-3",
                kind: "shape",
                payload: {
                  transformRevision: 1,
                  geometryRevision: 1,
                  materialRevision: 1,
                  visibilityRevision: 1,
                  pickingRevision: 1,
                  gpuUploadRevision: 1,
                },
              },
            },
          ],
        },
        {
          id: "dense-update-2",
          targetRevision: 2,
          operations: [
            {
              type: "upsert-node",
              node: {
                id: "shape-4",
                kind: "shape",
                payload: {
                  transformRevision: 1,
                  geometryRevision: 1,
                  materialRevision: 1,
                  visibilityRevision: 1,
                  pickingRevision: 1,
                  gpuUploadRevision: 1,
                },
              },
            },
            {
              type: "upsert-node",
              node: {
                id: "shape-5",
                kind: "shape",
                payload: {
                  transformRevision: 1,
                  geometryRevision: 1,
                  materialRevision: 1,
                  visibilityRevision: 1,
                  pickingRevision: 1,
                  gpuUploadRevision: 1,
                },
              },
            },
          ],
        },
      ],
      viewportStates: [
        {
          width: 1280,
          height: 720,
          offsetX: 0,
          offsetY: 0,
          scale: 1,
        },
        {
          width: 1280,
          height: 720,
          offsetX: 120,
          offsetY: 80,
          scale: 0.75,
        },
      ],
      inputEvents: [
        {
          atMs: 16,
          kind: "pan",
          deltaX: 24,
          deltaY: -12,
        },
        {
          atMs: 48,
          kind: "zoom",
          scale: 1.25,
        },
      ],
    },
    diagnostics: {
      moduleActivationOrder: vectorEditorRuntimeProfile.modules.map((moduleDefinition) => moduleDefinition.id),
      backendRequested: "auto",
      backendResolved: "canvas2d",
      backendFallbackReason: "auto-priority-canvas2d",
    },
  },
};
