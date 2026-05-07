import type { Mat3 } from '../../../math/matrix/matrix.ts'
import type { EngineRendererContext } from '../../../renderer/types/index.ts'
import type { EngineSceneSnapshot } from '../../../scene/types/types.ts'
import type { EngineCanvasViewportState } from '../../../interaction/viewport/viewport.ts'
import { renderLayeredScene } from '../../../core/render.ts'

/**
 * Resolves one compatibility layered-render output from legacy runtime frame state.
  * @param input Input payload for this operation.
*/
export function resolveLayeredRenderBridgeOutput(input: {
  /** Stores scene snapshot from runtime resolveFrame path. */
  scene: EngineSceneSnapshot
  /** Stores viewport snapshot shared by existing render backend path. */
  viewport: EngineCanvasViewportState
  /** Stores renderer context for cache flags and interaction payload mapping. */
  context: EngineRendererContext
}) {
  const activeIds = resolveBridgeActiveIds(input.context)
  const safeScale = Math.max(Number.EPSILON, Math.abs(input.viewport.scale))
  const viewportBounds = {
    x: -input.viewport.offsetX / safeScale,
    y: -input.viewport.offsetY / safeScale,
    width: input.viewport.viewportWidth / safeScale,
    height: input.viewport.viewportHeight / safeScale,
  }

  const matrix = input.viewport.matrix as Mat3
  const inverseMatrix = resolveViewportInverseMatrix(input.viewport)

  return renderLayeredScene({
    scene: input.scene,
    camera: {
      viewportWidth: input.viewport.viewportWidth,
      viewportHeight: input.viewport.viewportHeight,
      scale: input.viewport.scale,
      offsetX: input.viewport.offsetX,
      offsetY: input.viewport.offsetY,
      matrix,
      inverseMatrix,
    },
    interaction: {
      activeIds,
      previewTransform: undefined,
      hoverId: undefined,
      selectionIds: undefined,
    },
    options: {
      enableCache: Boolean(input.context.framePlanCandidateIds),
      viewport: viewportBounds,
    },
  })
}

/**
 * Resolves migration-time active ids from runtime context for layered bridge rendering.
  * @param context Rendering context.
*/
function resolveBridgeActiveIds(context: EngineRendererContext): ReadonlySet<string> | undefined {
  const interactionActiveNodeIds = normalizeBridgeActiveNodeIds(context.interactionActiveNodeIds)
  if (interactionActiveNodeIds) {
    return interactionActiveNodeIds
  }

  const protectedNodeIds = context.protectedNodeIds
  if (!protectedNodeIds || protectedNodeIds.length === 0) {
    return undefined
  }

  // AI-TEMP: fallback to protected ids for legacy callers that do not emit
  // dedicated editing active ids yet; remove when all runtimes publish
  // interactionActiveNodeIds; ref R-09.
  return new Set(protectedNodeIds)
}

/**
 * Resolves one stable active-id set from runtime-provided editing ids.
 * @param nodeIds Runtime-provided editing active ids.
 */
function normalizeBridgeActiveNodeIds(
  nodeIds: readonly string[] | undefined,
): ReadonlySet<string> | undefined {
  if (!nodeIds || nodeIds.length === 0) {
    return undefined
  }

  return new Set(nodeIds)
}

/**
 * Resolves viewport inverse matrix with compatibility fallback for legacy snapshots.
  * @param viewport Viewport state.
*/
function resolveViewportInverseMatrix(viewport: EngineCanvasViewportState): Mat3 {
  const compatibleViewport = viewport as EngineCanvasViewportState & {
    inverseMatrix?: Mat3
    matrix?: Mat3
  }

  if (compatibleViewport.inverseMatrix) {
    return compatibleViewport.inverseMatrix
  }

  // AI-TEMP: legacy viewport snapshots may omit inverse matrix; remove when viewport contract guarantees inverseMatrix; ref R-09.
  return (compatibleViewport.matrix ?? viewport.matrix) as Mat3
}
