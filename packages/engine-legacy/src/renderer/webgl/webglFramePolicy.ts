import type { EngineFrameBudget, EngineRenderFrame } from '../types/index.ts'

const BYTES_PER_KIBIBYTE = 1024
const DEFAULT_TEXTURE_UPLOAD_TOTAL_BUDGET_MIB = 24
const DEFAULT_TEXTURE_UPLOAD_TOTAL_BUDGET_BYTES = DEFAULT_TEXTURE_UPLOAD_TOTAL_BUDGET_MIB * BYTES_PER_KIBIBYTE * BYTES_PER_KIBIBYTE
const INTERACTIVE_CRITICAL_PACKET_MAX_SCREEN_AREA_PX = 48_000

/**
 * High-zoom text SLA scale used by interaction and diagnostics guards.
 */
export const HIGH_ZOOM_TEXT_SLA_SCALE = 2

/**
 * Default frame budget snapshot used when runtime context does not provide one.
 */
const DEFAULT_FRAME_BUDGET: EngineFrameBudget = {
  drawSubmitBudgetMs: 28,
  textureUploadBudgetBytes: 32 * BYTES_PER_KIBIBYTE * BYTES_PER_KIBIBYTE,
  textureUploadTotalBudgetBytes: DEFAULT_TEXTURE_UPLOAD_TOTAL_BUDGET_BYTES,
  imageTextureUploadMaxCount: 6,
  textTextureUploadMaxCount: 4,
  tilePreloadBudgetMs: 10,
  tilePreloadMaxUploads: 8,
  overlayPassBudgetMs: 2,
}

/**
 * Resolve renderer-safe frame budget values from runtime-provided context data.
 * @param frame Current render frame.
 * @returns Normalized frame budget values with non-negative clamps.
 */
export function resolveWebGLFrameBudget(frame: EngineRenderFrame): EngineFrameBudget {
  const budget = frame.context.frameBudget
  if (!budget) {
    return DEFAULT_FRAME_BUDGET
  }

  return {
    drawSubmitBudgetMs: Math.max(0, budget.drawSubmitBudgetMs),
    textureUploadBudgetBytes: Math.max(0, budget.textureUploadBudgetBytes),
    textureUploadTotalBudgetBytes: Math.max(0, budget.textureUploadTotalBudgetBytes),
    imageTextureUploadMaxCount: Math.max(0, budget.imageTextureUploadMaxCount),
    textTextureUploadMaxCount: Math.max(0, budget.textTextureUploadMaxCount),
    tilePreloadBudgetMs: Math.max(0, budget.tilePreloadBudgetMs),
    tilePreloadMaxUploads: Math.max(0, budget.tilePreloadMaxUploads),
    overlayPassBudgetMs: Math.max(0, budget.overlayPassBudgetMs),
  }
}

/**
 * Resolves effective visible element count, preferring layered bridge commands when available.
 * @param frame Current render frame.
 * @returns Visible element count used by LOD heuristics.
 */
export function resolveWebGLVisibleElementCountForLod(frame: EngineRenderFrame): number {
  const candidateIds = frame.context.framePlanCandidateIds
  if (candidateIds && candidateIds.length > 0) {
    return candidateIds.length
  }

  const layeredRender = frame.context.layeredRender
  if (!layeredRender) {
    return frame.scene.nodes.length
  }

  // Keep overlay commands out of LOD visible-count heuristics to avoid
  // inflating scene visibility with runtime UI overlays.
  return Math.max(0, layeredRender.base.length + layeredRender.active.length)
}

/**
 * Resolves whether one packet overlaps any runtime dirty region.
 * @param packetBounds Packet world bounds.
 * @param dirtyRegions Runtime dirty-region payload.
 * @returns True when any dirty region intersects packet bounds.
 */
export function doesWebGLPacketIntersectDirtyRegions(
  packetBounds: {x: number; y: number; width: number; height: number},
  dirtyRegions: readonly {
    zoomLevel?: number
    previousBounds?: {x: number; y: number; width: number; height: number}
    bounds: {x: number; y: number; width: number; height: number}
  }[],
): boolean {
  const packetMinX = packetBounds.x
  const packetMinY = packetBounds.y
  const packetMaxX = packetBounds.x + packetBounds.width
  const packetMaxY = packetBounds.y + packetBounds.height

  for (const dirtyRegion of dirtyRegions) {
    const dirtyBounds = dirtyRegion.bounds
    const dirtyMinX = dirtyBounds.x
    const dirtyMinY = dirtyBounds.y
    const dirtyMaxX = dirtyBounds.x + dirtyBounds.width
    const dirtyMaxY = dirtyBounds.y + dirtyBounds.height
    if (
      packetMaxX >= dirtyMinX &&
      packetMinX <= dirtyMaxX &&
      packetMaxY >= dirtyMinY &&
      packetMinY <= dirtyMaxY
    ) {
      return true
    }
  }

  return false
}

/**
 * Resolves whether one packet should bypass interaction upload freeze.
 * @param frame Current render frame.
 * @param packet Packet payload from WebGL packet plan.
 * @param activeLayerPass Whether packet belongs to active interaction layer.
 * @returns True when packet should upload and draw during interaction lane.
 */
export function shouldPrioritizeInteractiveWebGLTexturePacket(
  frame: EngineRenderFrame,
  packet: {
    kind: 'shape' | 'text' | 'image'
    nodeId: string
    worldBounds: {x: number; y: number; width: number; height: number}
  },
  activeLayerPass: boolean,
): boolean {
  if (activeLayerPass) {
    return true
  }

  // Keep directly interacted/protected nodes legible during pan/zoom feedback.
  if (frame.context.interactionActiveNodeIds?.includes(packet.nodeId)) {
    return true
  }
  if (frame.context.protectedNodeIds?.includes(packet.nodeId)) {
    return true
  }

  if (packet.kind === 'text' && frame.viewport.scale >= HIGH_ZOOM_TEXT_SLA_SCALE) {
    return true
  }

  if (packet.kind === 'image') {
    const scale = Math.max(0, frame.viewport.scale)
    const area = Math.max(0, packet.worldBounds.width * scale) * Math.max(0, packet.worldBounds.height * scale)
    return area <= INTERACTIVE_CRITICAL_PACKET_MAX_SCREEN_AREA_PX
  }

  return false
}
