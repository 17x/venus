import type {
  EngineRenderFrame,
} from '../types/index.ts'
import type { EngineSceneBufferLayout } from '../../scene/buffer/buffer.ts'

const PLAN_HASH_MULTIPLIER = 31
const PLAN_HASH_DELIMITER = 124

/**
 * Resolves frame-level plan signature used by render-plan cache keying.
 * @param frame Current render frame.
 */
export function resolveFramePlanSignature(frame: EngineRenderFrame) {
  const candidateIds = frame.context.framePlanCandidateIds
  return `${frame.context.framePlanVersion ?? 'none'}:${candidateIds?.length ?? 0}:${resolveFramePlanCandidateHash(candidateIds)}`
}

/**
 * Resolves stable candidate-id hash so frame-plan cache keys remain collision-resistant.
 * @param candidateIds Frame-plan candidate ids.
 */
function resolveFramePlanCandidateHash(candidateIds: readonly string[] | undefined) {
  if (!candidateIds || candidateIds.length === 0) {
    return 0
  }

  let hash = 0
  for (const candidateId of candidateIds) {
    // Fold candidate id bytes into rolling hash so equal-length candidate lists do not collide.
    for (let index = 0; index < candidateId.length; index += 1) {
      hash = (hash * PLAN_HASH_MULTIPLIER + candidateId.charCodeAt(index)) >>> 0
    }
    // Include one delimiter fold so concatenation boundary stays unambiguous.
    hash = (hash * PLAN_HASH_MULTIPLIER + PLAN_HASH_DELIMITER) >>> 0
  }

  return hash
}

/**
 * Resolves scene plan version used by render-plan cache invalidation.
 * @param scene Scene snapshot.
 */
export function resolveScenePlanVersion(scene: EngineRenderFrame['scene']) {
  return scene.metadata?.planVersion ?? scene.revision
}

/**
 * Resolves validated scene buffer layout metadata for buffer traversal path.
 * @param scene Scene snapshot.
 */
export function resolveSceneBufferLayout(scene: EngineRenderFrame['scene']) {
  const layout = scene.metadata?.bufferLayout
  if (!layout) {
    return null
  }

  const candidate = layout as EngineSceneBufferLayout
  if (
    typeof candidate.count !== 'number' ||
    !Array.isArray(candidate.nodeIds) ||
    !(candidate.bounds instanceof Float32Array) ||
    !(candidate.transform instanceof Float32Array) ||
    !(candidate.parentIndices instanceof Int32Array) ||
    !(candidate.order instanceof Uint32Array)
  ) {
    return null
  }

  return candidate
}

/**
 * Resolves viewport signature used by render-plan cache keying.
 * @param frame Current render frame.
 */
export function resolveViewportSignature(frame: EngineRenderFrame) {
  const viewport = frame.viewport
  // Keep signature explicit to avoid hidden float rounding assumptions.
  return `${viewport.viewportWidth}:${viewport.viewportHeight}:${viewport.scale}:${viewport.offsetX}:${viewport.offsetY}:${viewport.matrix.join(',')}`
}

/**
 * Resolves frame-plan candidate id set from direct shortlist or layered fallback.
 * @param frame Current render frame.
 */
export function resolveFramePlanCandidateIdSet(frame: EngineRenderFrame) {
  const candidateIds = frame.context.framePlanCandidateIds
  if (!candidateIds || candidateIds.length === 0) {
    return null
  }

  return new Set(candidateIds)
}