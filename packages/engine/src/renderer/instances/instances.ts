import type { EngineRenderFrame } from '../types/index.ts'
import type { EngineRenderPlan } from '../plan/index.ts'
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
  // World matrices mirrored from the render plan.
  transforms: Float32Array
  // World-space bounds mirrored from the render plan so future instanced
  // backends cannot drift from culling, packets, overlay, or hit-test geometry.
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

  const drawCount = plan.drawList.length
  const indices = new Uint32Array(drawCount)
  const transforms = new Float32Array(drawCount * TRANSFORM_STRIDE)
  const bounds = new Float32Array(drawCount * BOUNDS_STRIDE)

  for (let drawIndex = 0; drawIndex < drawCount; drawIndex += 1) {
    const preparedIndex = plan.drawList[drawIndex]
    indices[drawIndex] = preparedIndex
    writePreparedWorldMatrix(plan, preparedIndex, transforms, drawIndex)
    writePreparedWorldBounds(plan, preparedIndex, bounds, drawIndex)
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
 * Writes one prepared node world matrix into the instance view.
 * @param plan Render plan that owns authoritative prepared transforms.
 * @param preparedIndex Prepared node index.
 * @param target target parameter.
 * @param targetIndex targetIndex parameter.
 */
function writePreparedWorldMatrix(
  plan: EngineRenderPlan,
  preparedIndex: number,
  target: Float32Array,
  targetIndex: number,
) {
  const matrix = plan.preparedNodes[preparedIndex]?.worldMatrix
  const targetOffset = targetIndex * TRANSFORM_STRIDE
  target[targetOffset] = matrix?.[0] ?? 1
  target[targetOffset + 1] = matrix?.[1] ?? 0
  target[targetOffset + OFFSET_2] = matrix?.[OFFSET_2] ?? 0
  target[targetOffset + OFFSET_3] = matrix?.[OFFSET_3] ?? 0
  target[targetOffset + OFFSET_4] = matrix?.[OFFSET_4] ?? 1
  target[targetOffset + OFFSET_5] = matrix?.[OFFSET_5] ?? 0
}

/**
 * Writes world bounds resolved by the render plan into the instance view.
 * @param plan Render plan that owns authoritative prepared bounds.
 * @param preparedIndex Prepared node index.
 * @param target target parameter.
 * @param targetIndex targetIndex parameter.
 */
function writePreparedWorldBounds(
  plan: EngineRenderPlan,
  preparedIndex: number,
  target: Float32Array,
  targetIndex: number,
) {
  const worldBounds = plan.preparedNodes[preparedIndex]?.worldBounds
  const targetOffset = targetIndex * BOUNDS_STRIDE
  target[targetOffset] = worldBounds?.x ?? 0
  target[targetOffset + 1] = worldBounds?.y ?? 0
  target[targetOffset + OFFSET_2] = worldBounds?.width ?? 0
  target[targetOffset + OFFSET_3] = worldBounds?.height ?? 0
}
