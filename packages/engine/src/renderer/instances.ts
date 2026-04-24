import type { EngineRenderFrame } from './types.ts'
import type { EngineRenderPlan } from './plan.ts'
import type { EngineSceneBufferLayout } from '../scene/buffer.ts'
import { prepareEngineRenderPlan } from './plan.ts'

export interface EngineRenderInstanceBatch {
  key: string
  nodeType: string
  assetId?: string
  count: number
  indices: Uint32Array
}

export interface EngineRenderInstanceView {
  count: number
  indices: Uint32Array
  transforms: Float32Array
  bounds: Float32Array
  batches: EngineRenderInstanceBatch[]
}

const renderInstanceViewCache = new WeakMap<EngineRenderPlan, EngineRenderInstanceView>()

/**
 * Build a backend-agnostic instance view from scene-store buffers.
 *
 * The output is intentionally simple and typed-array based so future WebGL
 * backends can upload one compact render view per frame without re-walking
 * scene object trees.
 */
export function prepareEngineRenderInstanceView(
  frame: EngineRenderFrame,
  plan: EngineRenderPlan = prepareEngineRenderPlan(frame),
): EngineRenderInstanceView {
  // Reuse the instance payload whenever the render plan object is reused.
  // This avoids rebuilding typed arrays on duplicate frames after plan caching.
  const cached = renderInstanceViewCache.get(plan)
  if (cached) {
    return cached
  }

  const layout = resolveSceneBufferLayout(frame.scene)
  const drawCount = plan.drawList.length

  if (!layout) {
    const nextView = {
      count: drawCount,
      indices: Uint32Array.from(plan.drawList),
      transforms: new Float32Array(drawCount * 6),
      bounds: new Float32Array(drawCount * 4),
      batches: plan.batches.map((batch) => ({
        key: batch.key,
        nodeType: batch.nodeType,
        assetId: batch.assetId,
        count: batch.indices.length,
        indices: Uint32Array.from(batch.indices),
      })),
    }
    renderInstanceViewCache.set(plan, nextView)
    return nextView
  }

  const indices = new Uint32Array(drawCount)
  const transforms = new Float32Array(drawCount * 6)
  const bounds = new Float32Array(drawCount * 4)

  for (let drawIndex = 0; drawIndex < drawCount; drawIndex += 1) {
    const slot = plan.drawList[drawIndex]
    indices[drawIndex] = slot
    copyTransform(layout, slot, transforms, drawIndex)
    copyBounds(layout, slot, bounds, drawIndex)
  }

  const nextView = {
    count: drawCount,
    indices,
    transforms,
    bounds,
    batches: plan.batches.map((batch) => ({
      key: batch.key,
      nodeType: batch.nodeType,
      assetId: batch.assetId,
      count: batch.indices.length,
      indices: Uint32Array.from(batch.indices),
    })),
  }
  renderInstanceViewCache.set(plan, nextView)
  return nextView
}

function resolveSceneBufferLayout(scene: EngineRenderFrame['scene']) {
  const layout = scene.metadata?.bufferLayout
  if (!layout) {
    return null
  }

  const candidate = layout as EngineSceneBufferLayout
  if (
    typeof candidate.count !== 'number' ||
    !(candidate.transform instanceof Float32Array) ||
    !(candidate.bounds instanceof Float32Array)
  ) {
    return null
  }

  return candidate
}

function copyTransform(
  layout: EngineSceneBufferLayout,
  slot: number,
  target: Float32Array,
  targetIndex: number,
) {
  const sourceOffset = slot * 6
  const targetOffset = targetIndex * 6
  target[targetOffset] = layout.transform[sourceOffset]
  target[targetOffset + 1] = layout.transform[sourceOffset + 1]
  target[targetOffset + 2] = layout.transform[sourceOffset + 2]
  target[targetOffset + 3] = layout.transform[sourceOffset + 3]
  target[targetOffset + 4] = layout.transform[sourceOffset + 4]
  target[targetOffset + 5] = layout.transform[sourceOffset + 5]
}

function copyBounds(
  layout: EngineSceneBufferLayout,
  slot: number,
  target: Float32Array,
  targetIndex: number,
) {
  const sourceOffset = slot * 4
  const targetOffset = targetIndex * 4
  target[targetOffset] = layout.bounds[sourceOffset]
  target[targetOffset + 1] = layout.bounds[sourceOffset + 1]
  target[targetOffset + 2] = layout.bounds[sourceOffset + 2]
  target[targetOffset + 3] = layout.bounds[sourceOffset + 3]
}
