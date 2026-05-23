import assert from "node:assert/strict";
import test from "node:test";

import {
  createEngineCompilerModule,
  createEngineDocumentStoreModule,
  createEngineRuntimeFromProfile,
  createEngineViewModule,
  headlessReplayScenarioProfile,
  resolveBackendSelection,
} from "../../index";
import type { EngineBackendProbe } from "../../backend/backendSelector";
import {
  vectorDenseSceneScenarioProfile,
} from "../../kernel/profiles/scenario/vector-dense-scene-profile";

/**
 * Replays one scenario profile document/viewport/input timeline and returns deterministic snapshot metadata.
 * @param profile Scenario profile with manifest metadata.
 */
function replayScenarioProfile(profile: {
  id: string;
  scenarioManifest?: {
    replay: {
      documentChangeSets: readonly Array<{
        id: string;
        operations: readonly unknown[];
      }>;
      viewportStates: readonly Array<{
        width: number;
        height: number;
        offsetX: number;
        offsetY: number;
        scale: number;
      }>;
      inputEvents: readonly Array<{
        kind: "none" | "set" | "pan" | "zoom";
        deltaX?: number;
        deltaY?: number;
        scale?: number;
      }>;
    };
  };
}): {
  finalRevision: number;
  compileChangeSetIds: readonly string[];
  finalViewport: {
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
    scale: number;
  };
} {
  const manifest = profile.scenarioManifest;
  assert.ok(manifest, `${profile.id} must define scenarioManifest`);

  const documentModule = createEngineDocumentStoreModule();
  const compilerModule = createEngineCompilerModule();
  const viewModule = createEngineViewModule();
  let documentSnapshot = documentModule.createSnapshot();
  const compileChangeSetIds: string[] = [];

  let viewportState = manifest.replay.viewportStates[0] ?? {
    width: 800,
    height: 600,
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  };
  const viewportFacade = viewModule.createViewportFacade({
    getViewportState: () => viewportState,
    setViewportState: (next) => {
      viewportState = next;
    },
  });

  for (const viewport of manifest.replay.viewportStates) {
    viewportFacade.setViewport(viewport);
  }

  for (const event of manifest.replay.inputEvents) {
    if (event.kind === "pan") {
      viewportFacade.panBy(event.deltaX ?? 0, event.deltaY ?? 0);
      continue;
    }
    if (event.kind === "zoom") {
      viewportFacade.zoomTo(event.scale ?? viewportFacade.getViewport().scale, {
        x: viewportFacade.getViewport().width / 2,
        y: viewportFacade.getViewport().height / 2,
      });
    }
  }

  for (const changeSet of manifest.replay.documentChangeSets) {
    const previousSnapshot = documentSnapshot;
    const currentSnapshot = documentModule.applyChangeSet(previousSnapshot, changeSet as never);
    const compileOutput = compilerModule.compileChangeSet({
      previousSnapshot,
      currentSnapshot,
      changeSet: changeSet as never,
    });
    compileChangeSetIds.push(compileOutput.changeSetId);
    documentSnapshot = currentSnapshot;
  }

  return {
    finalRevision: documentSnapshot.revision,
    compileChangeSetIds,
    finalViewport: viewportFacade.getViewport(),
  };
}

/**
 * Verifies vector dense scene scenario replay manifest can be replayed deterministically.
 */
test("vector dense scene scenario replay remains deterministic", () => {
  const replay = replayScenarioProfile(vectorDenseSceneScenarioProfile);

  assert.equal(replay.finalRevision, 2);
  assert.deepEqual(replay.compileChangeSetIds, ["dense-load-1", "dense-update-2"]);
  assert.equal(replay.finalViewport.width, 1280);
  assert.equal(replay.finalViewport.height, 720);
});

/**
 * Verifies headless replay scenario manifest can be replayed deterministically.
 */
test("headless replay scenario remains deterministic", () => {
  const replay = replayScenarioProfile(headlessReplayScenarioProfile);

  assert.equal(replay.finalRevision, 2);
  assert.deepEqual(replay.compileChangeSetIds, ["headless-replay-load-1", "headless-replay-update-2"]);
  assert.equal(replay.finalViewport.width, 1024);
  assert.equal(replay.finalViewport.height, 768);
});

/**
 * Verifies scenario diagnostics snapshots for module activation and backend selection remain deterministic.
 */
test("scenario diagnostics snapshots remain deterministic", () => {
  const vectorManifest = vectorDenseSceneScenarioProfile.scenarioManifest;
  const headlessManifest = headlessReplayScenarioProfile.scenarioManifest;
  assert.ok(vectorManifest);
  assert.ok(headlessManifest);

  const vectorRuntime = createEngineRuntimeFromProfile(vectorDenseSceneScenarioProfile);
  const headlessRuntime = createEngineRuntimeFromProfile(headlessReplayScenarioProfile);

  assert.deepEqual(
    vectorRuntime.activationResults.map((result) => result.moduleId),
    vectorManifest.diagnostics.moduleActivationOrder,
  );
  assert.deepEqual(
    headlessRuntime.activationResults.map((result) => result.moduleId),
    headlessManifest.diagnostics.moduleActivationOrder,
  );

  const vectorProbes: readonly EngineBackendProbe[] = [
    { mode: "webgpu", canUse: () => false },
    { mode: "webgl", canUse: () => false },
    { mode: "canvas2d", canUse: () => true },
    { mode: "headless", canUse: () => true },
  ];
  const vectorBackendSelection = resolveBackendSelection(
    {
      backend: vectorManifest.diagnostics.backendRequested,
      surface: {
        width: 1280,
        height: 720,
      },
    },
    vectorProbes,
  );
  const headlessBackendSelection = resolveBackendSelection({
    backend: headlessManifest.diagnostics.backendRequested,
    surface: {
      width: 1024,
      height: 768,
    },
  });

  assert.equal(vectorBackendSelection.resolved, vectorManifest.diagnostics.backendResolved);
  assert.equal(vectorBackendSelection.fallbackReason, vectorManifest.diagnostics.backendFallbackReason);
  assert.equal(headlessBackendSelection.resolved, headlessManifest.diagnostics.backendResolved);
  assert.equal(headlessBackendSelection.fallbackReason, headlessManifest.diagnostics.backendFallbackReason);
});
