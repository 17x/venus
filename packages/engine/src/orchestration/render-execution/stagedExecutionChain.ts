import type { EngineIncrementalCompileOutput } from "../../kernel/compiler/incrementalCompiler";
import { createEngineWorldModule } from "../../kernel/core/world/runtime-world-module";
import { resolvePickingHitStack } from "../../kernel/picking/pickingPipeline";
import {
  createSpatialIndexFromWorld,
  querySpatialCandidates,
} from "../../kernel/spatial/spatialIndex";
import type { EngineDocumentSnapshot } from "../../kernel/document/document-contracts";
import type { EnginePlanningViewport } from "../render-planning/createEngineFrameResolver";

const worldModule = createEngineWorldModule();

/**
 * Staged software execution snapshot proving document->runtime->render flow.
 */
export interface EngineExecutionSnapshot {
  /** Source document revision consumed by this execution. */
  documentRevision: number;
  /** Runtime world revision produced from the document. */
  worldRevision: number;
  /** Compile output consumed by this execution. */
  compile: EngineIncrementalCompileOutput;
  /** Visible candidate ids for current viewport. */
  visibleCandidateIds: readonly string[];
  /** Picking hit stack at viewport anchor. */
  pickingHitIds: readonly string[];
  /** Executed draw count for staged software path. */
  drawCount: number;
}

/**
 * Resolves one staged execution snapshot from document/compiler outputs.
 * @param options Document snapshot, compile output, and viewport inputs.
 */
export function resolveStagedExecutionSnapshot(options: {
  /** Persistent document snapshot. */
  document: EngineDocumentSnapshot;
  /** Incremental compiler output for the current revision. */
  compile: EngineIncrementalCompileOutput;
  /** Current viewport snapshot used by visibility and picking. */
  viewport: EnginePlanningViewport;
}): EngineExecutionSnapshot {
  const world = worldModule.createWorldFromDocument(options.document);
  const spatialIndex = createSpatialIndexFromWorld(world);
  const visibleCandidateIds = querySpatialCandidates(spatialIndex, {
    x: options.viewport.offsetX,
    y: options.viewport.offsetY,
    width: options.viewport.width,
    height: options.viewport.height,
  });

  const picking = resolvePickingHitStack({
    spatialIndex,
    x: options.viewport.offsetX + options.viewport.width / 2,
    y: options.viewport.offsetY + options.viewport.height / 2,
  });

  return {
    documentRevision: options.document.revision,
    worldRevision: world.revision,
    compile: options.compile,
    visibleCandidateIds,
    pickingHitIds: picking.hits.map((hit) => hit.entityId),
    drawCount: visibleCandidateIds.length,
  };
}
