import type { EngineRenderFrame } from '../types/index.ts'
import type { EngineRenderPlan } from '../plan/index.ts'
import type { EngineSceneBufferLayout } from '../../scene/buffer/buffer.ts'
import { prepareEngineRenderPlan } from '../plan/index.ts'

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
const TRANSFORM_STRIDE = 6
const BOUNDS_STRIDE = 4
const OFFSET_2 = 2
const OFFSET_3 = 3
const OFFSET_4 = 4
const OFFSET_5 = 5

/**
 * Build a backend-agnostic instance view from scene-store buffers.
 *
 * The output is intentionally simple and typed-array based so future WebGL
 * backends can upload one compact render view per frame without re-walking
 * scene object trees.
  * @param frame Current render frame.
 * @param plan plan parameter.
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
      transforms: new Float32Array(drawCount * TRANSFORM_STRIDE),
      bounds: new Float32Array(drawCount * BOUNDS_STRIDE),
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
  const transforms = new Float32Array(drawCount * TRANSFORM_STRIDE)
  const bounds = new Float32Array(drawCount * BOUNDS_STRIDE)

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

/**
 * Handles resolveSceneBufferLayout.
 * @param scene Scene snapshot.
 */
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

/**
 * Handles copyTransform.
 * @param layout layout parameter.
 * @param slot slot parameter.
 * @param target target parameter.
 * @param targetIndex targetIndex parameter.
 */
function copyTransform(
  layout: EngineSceneBufferLayout,
  slot: number,
  target: Float32Array,
  targetIndex: number,
) {
  const sourceOffset = slot * TRANSFORM_STRIDE
  const targetOffset = targetIndex * TRANSFORM_STRIDE
  target[targetOffset] = layout.transform[sourceOffset]
  target[targetOffset + 1] = layout.transform[sourceOffset + 1]
  target[targetOffset + OFFSET_2] = layout.transform[sourceOffset + OFFSET_2]
  target[targetOffset + OFFSET_3] = layout.transform[sourceOffset + OFFSET_3]
  target[targetOffset + OFFSET_4] = layout.transform[sourceOffset + OFFSET_4]
  target[targetOffset + OFFSET_5] = layout.transform[sourceOffset + OFFSET_5]
}

/**
 * Handles copyBounds.
 * @param layout layout parameter.
 * @param slot slot parameter.
 * @param target target parameter.
 * @param targetIndex targetIndex parameter.
 */
function copyBounds(
  layout: EngineSceneBufferLayout,
  slot: number,
  target: Float32Array,
  targetIndex: number,
) {
  const sourceOffset = slot * BOUNDS_STRIDE
  const targetOffset = targetIndex * BOUNDS_STRIDE
  target[targetOffset] = layout.bounds[sourceOffset]
  target[targetOffset + 1] = layout.bounds[sourceOffset + 1]
  target[targetOffset + OFFSET_2] = layout.bounds[sourceOffset + OFFSET_2]
  target[targetOffset + OFFSET_3] = layout.bounds[sourceOffset + OFFSET_3]
}
