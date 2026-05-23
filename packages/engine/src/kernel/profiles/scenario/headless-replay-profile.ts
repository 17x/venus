import type { EngineRuntimeProfile } from "../../profile-contracts";
import { headlessRuntimeProfile } from "../headless/headless-runtime-profile";

/**
 * Headless replay scenario profile used for deterministic server/test replay conformance.
 */
export const headlessReplayScenarioProfile: EngineRuntimeProfile = {
  ...headlessRuntimeProfile,
  id: "headless-replay-scenario-runtime",
  target: "scenario",
  strictness: "strict",
  scenario: "headless-replay",
  scenarioManifest: {
    id: "scenario.headless-replay.v1",
    description: "Headless deterministic replay for document and viewport state sequencing.",
    replay: {
      documentChangeSets: [
        {
          id: "headless-replay-load-1",
          targetRevision: 1,
          operations: [
            {
              type: "upsert-node",
              node: {
                id: "group-root",
                kind: "group",
                payload: {
                  transformRevision: 1,
                },
              },
            },
            {
              type: "upsert-node",
              node: {
                id: "shape-replay-1",
                kind: "shape",
                parentId: "group-root",
                payload: {
                  transformRevision: 1,
                  geometryRevision: 1,
                  visibilityRevision: 1,
                },
              },
            },
          ],
        },
        {
          id: "headless-replay-update-2",
          targetRevision: 2,
          operations: [
            {
              type: "upsert-node",
              node: {
                id: "shape-replay-1",
                kind: "shape",
                parentId: "group-root",
                payload: {
                  transformRevision: 2,
                  geometryRevision: 2,
                  visibilityRevision: 1,
                },
              },
            },
          ],
        },
      ],
      viewportStates: [
        {
          width: 1024,
          height: 768,
          offsetX: 0,
          offsetY: 0,
          scale: 1,
        },
      ],
      inputEvents: [
        {
          atMs: 32,
          kind: "set",
        },
      ],
    },
    diagnostics: {
      moduleActivationOrder: headlessRuntimeProfile.modules.map((moduleDefinition) => moduleDefinition.id),
      backendRequested: "headless",
      backendResolved: "headless",
      backendFallbackReason: null,
    },
  },
};
