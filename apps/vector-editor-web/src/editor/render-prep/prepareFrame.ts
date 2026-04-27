import type {EditorDocument} from '@vector/model'
import type {SceneShapeSnapshot} from '@vector/runtime/shared-memory'
import {prepareOverlayPass, type PrepareOverlayPassInput} from './prepareOverlayPass.ts'
import {prepareScenePass} from './prepareScenePass.ts'
import type {PreparedPass, PreparedRenderFrame} from './types.ts'

export interface PrepareRenderFrameInput {
  revision: number
  document: EditorDocument
  previousDocument: EditorDocument | null
  shapes: SceneShapeSnapshot[]
  previousShapes: SceneShapeSnapshot[]
  previousFrameCandidateIds?: readonly string[]
  overlay: PrepareOverlayPassInput
  includePicking?: boolean
  cameraDirty?: boolean
}

/**
 * Build scene/overlay/picking frame skeleton for incremental render-prep
 * migration without changing existing runtime adapter contracts.
 */
export function prepareRenderFrame(input: PrepareRenderFrameInput): PreparedRenderFrame {
  const scene = prepareScenePass({
    document: input.document,
    previousDocument: input.previousDocument,
    shapes: input.shapes,
    previousShapes: input.previousShapes,
    revision: input.revision,
  })
  const overlay = prepareOverlayPass(input.overlay)
  const picking = input.includePicking
    ? createPickingPass(input)
    : undefined
  const sceneInstanceIds = scene.instanceUpdates
    .filter((update) => update.reason?.startsWith('scene-shape-changed:'))
    .map((update) => (update.reason ?? '').replace('scene-shape-changed:', ''))
  const candidateOverlap = resolveCandidateOverlapStats(
    sceneInstanceIds,
    input.previousFrameCandidateIds,
  )

  return {
    revision: input.revision,
    scene,
    overlay,
    picking,
    dirtyState: {
      sceneStructureDirty: scene.instanceUpdates.some((update) => update.reason === 'scene-structure-changed'),
      sceneInstanceIds,
      previousFrameCandidateCount: candidateOverlap.previousFrameCandidateCount,
      dirtyCandidateCount: candidateOverlap.dirtyCandidateCount,
      dirtyOffscreenCount: candidateOverlap.dirtyOffscreenCount,
      overlayDirty: overlay.dirty,
      pickingDirty: Boolean(picking?.dirty),
      cameraDirty: Boolean(input.cameraDirty),
    },
  }
}

// Compare current dirty ids against the previous frame's coarse candidate set
// so render-prep can report how much work likely intersects the active view.
function resolveCandidateOverlapStats(
  dirtyShapeIds: readonly string[],
  previousFrameCandidateIds?: readonly string[],
) {
  if (!previousFrameCandidateIds || previousFrameCandidateIds.length === 0) {
    return {
      previousFrameCandidateCount: 0,
      dirtyCandidateCount: 0,
      dirtyOffscreenCount: dirtyShapeIds.length,
    }
  }

  const previousCandidateIdSet = new Set(previousFrameCandidateIds)
  let dirtyCandidateCount = 0

  for (const dirtyShapeId of dirtyShapeIds) {
    if (previousCandidateIdSet.has(dirtyShapeId)) {
      dirtyCandidateCount += 1
    }
  }

  return {
    previousFrameCandidateCount: previousFrameCandidateIds.length,
    dirtyCandidateCount,
    dirtyOffscreenCount: Math.max(0, dirtyShapeIds.length - dirtyCandidateCount),
  }
}

function createPickingPass(input: PrepareRenderFrameInput): PreparedPass {
  return {
    kind: 'picking',
    dirty: true,
    batches: [{
      batchId: 'picking:scene-hit-proxy',
      geometryKey: 'document-shape-geometry',
      pipelineKey: 'picking-default',
      instanceCount: input.shapes.length,
    }],
    instanceUpdates: [],
    uniformUpdates: [{
      scope: 'picking',
      name: 'revision',
      value: input.revision,
    }],
  }
}
