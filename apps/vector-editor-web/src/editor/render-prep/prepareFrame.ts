import type {EditorDocument} from '@venus/document-core'
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

  return {
    revision: input.revision,
    scene,
    overlay,
    picking,
    dirtyState: {
      sceneStructureDirty: scene.instanceUpdates.some((update) => update.reason === 'scene-structure-changed'),
      sceneInstanceIds: scene.instanceUpdates
        .filter((update) => update.reason?.startsWith('scene-shape-changed:'))
        .map((update) => (update.reason ?? '').replace('scene-shape-changed:', '')),
      overlayDirty: overlay.dirty,
      pickingDirty: Boolean(picking?.dirty),
      cameraDirty: Boolean(input.cameraDirty),
    },
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
