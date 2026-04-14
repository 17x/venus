import type { EngineRenderPlan } from './plan.ts'
import type { EngineRenderInstanceView } from './instances.ts'
import type { EngineRenderableNode } from '../scene/types.ts'

export type EngineWebGLPacketKind = 'shape' | 'text' | 'image'

export interface EngineWebGLRenderPacket {
  kind: EngineWebGLPacketKind
  nodeId: string
  preparedIndex: number
  batchKey: string
  opacity: number
}

export interface EngineWebGLPacketPlan {
  packets: EngineWebGLRenderPacket[]
  drawCount: number
  uploadBytesEstimate: number
}

/**
 * Compile plan output into render packets so backend commit paths can submit
 * draw work without reinterpreting scene/business structures.
 */
export function compileEngineWebGLPacketPlan(
  plan: EngineRenderPlan,
  instanceView: EngineRenderInstanceView,
): EngineWebGLPacketPlan {
  const packets: EngineWebGLRenderPacket[] = []

  for (const preparedIndex of plan.drawList) {
    const prepared = plan.preparedNodes[preparedIndex]
    if (!prepared || prepared.node.type === 'group') {
      continue
    }

    packets.push({
      kind: resolvePacketKind(prepared.node),
      nodeId: prepared.node.id,
      preparedIndex,
      batchKey: prepared.bucketKey,
      opacity: resolveNodeOpacity(prepared.node),
    })
  }

  // One upload estimate gives the resource manager a stable frame-level signal
  // for buffer pressure, before concrete draw-program uploads are wired.
  const uploadBytesEstimate =
    instanceView.transforms.byteLength +
    instanceView.bounds.byteLength +
    instanceView.indices.byteLength

  return {
    packets,
    drawCount: packets.length,
    uploadBytesEstimate,
  }
}

function resolvePacketKind(node: EngineRenderableNode): EngineWebGLPacketKind {
  switch (node.type) {
    case 'shape':
      return 'shape'
    case 'text':
      return 'text'
    case 'image':
      return 'image'
    default:
      return 'shape'
  }
}

function resolveNodeOpacity(node: EngineRenderableNode) {
  const value = node.opacity
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 1
  }

  if (value < 0) {
    return 0
  }

  if (value > 1) {
    return 1
  }

  return value
}
