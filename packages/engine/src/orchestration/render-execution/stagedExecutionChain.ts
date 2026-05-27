import type { EngineIncrementalCompileOutput } from "../../kernel/compiler/incrementalCompiler";
import { createEngineWorldModule } from "../../kernel/core/world/runtime-world-module";
import { resolvePickingHitStack } from "../../kernel/picking/pickingPipeline";
import {
  createSpatialIndexFromWorld,
} from "../../kernel/spatial/spatialIndex";
import { createEngineSpatialIndex } from "../../kernel/spatial/engineSpatialIndex";
import type { EngineDocumentSnapshot } from "../../kernel/document/document-contracts";
import type { EnginePlanningViewport } from "../render-planning/createEngineFrameResolver";

const worldModule = createEngineWorldModule();
const PICKING_CENTER_DIVISOR = 2;

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
 *
 * Uses an R-tree spatial index for O(log n) viewport culling instead of the
 * legacy O(n) linear scan. The R-tree (RBush3D) is the canonical spatial index
 * for 2D/3D range queries in this engine.
 *
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

  // Build an R-tree spatial index for O(log n) viewport-candidate queries.
  // This replaces the legacy O(n) linear scan in querySpatialCandidates
  // for scenes with large node counts.
  const spatialIndex = createEngineSpatialIndex<{ nodeId: string }>({ dimension: "2d" });
  const spatialItems = world.entities.map((entity) => ({
    id: entity.id,
    minX: entity.bounds.x,
    minY: entity.bounds.y,
    maxX: entity.bounds.x + entity.bounds.width,
    maxY: entity.bounds.y + entity.bounds.height,
    meta: { nodeId: entity.id },
  }));
  spatialIndex.load(spatialItems);

  // Convert viewport CSS-pixel dimensions to world-space coordinates for
  // correct spatial query alignment. width/height are in CSS pixels while
  // offsetX/offsetY and entity bounds are in world space.
  const worldViewportWidth = options.viewport.width / Math.max(options.viewport.scale, 0.001);
  const worldViewportHeight = options.viewport.height / Math.max(options.viewport.scale, 0.001);
  const viewportBounds = {
    minX: options.viewport.offsetX,
    minY: options.viewport.offsetY,
    maxX: options.viewport.offsetX + worldViewportWidth,
    maxY: options.viewport.offsetY + worldViewportHeight,
  };
  const visibleCandidateIds = spatialIndex
    .search(viewportBounds)
    .map((item) => item.id)
    .sort();

  // Build a legacy snapshot index for the picking pipeline which still
  // expects the linear-scan spatial index shape.
  const legacyIndex = createSpatialIndexFromWorld(world);
  const picking = resolvePickingHitStack({
    spatialIndex: legacyIndex,
      x: options.viewport.offsetX + options.viewport.width / PICKING_CENTER_DIVISOR,
      y: options.viewport.offsetY + options.viewport.height / PICKING_CENTER_DIVISOR,
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
