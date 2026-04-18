import type {EditorDocument} from '@venus/document-core'
import type {SceneShapeSnapshot} from '@vector/runtime/shared-memory'
import type {PreparedPass} from './types.ts'

export interface PrepareScenePassInput {
  document: EditorDocument
  previousDocument: EditorDocument | null
  shapes: SceneShapeSnapshot[]
  previousShapes: SceneShapeSnapshot[]
  revision: number
}

/**
 * Phase-2 skeleton: prepare scene pass metadata while preserving current
 * canvas adapter behavior. Batch decomposition and partial updates are added
 * incrementally in later phases.
 */
export function prepareScenePass(input: PrepareScenePassInput): PreparedPass {
  const changedShapeIds = resolveChangedSceneShapeIds(input.previousShapes, input.shapes)
  const structureChanged = hasSceneStructureChanged(input.previousDocument, input.document, input.previousShapes, input.shapes)
  const sceneDirty = structureChanged || changedShapeIds.length > 0

  return {
    kind: 'scene',
    dirty: sceneDirty,
    batches: [{
      batchId: 'scene:document-shapes',
      geometryKey: 'document-shape-geometry',
      pipelineKey: 'scene-default',
      instanceCount: input.shapes.length,
    }],
    instanceUpdates: structureChanged
      ? [{
          batchId: 'scene:document-shapes',
          start: 0,
          count: input.shapes.length,
          reason: 'scene-structure-changed',
        }]
      : changedShapeIds.map((shapeId) => {
          const index = input.shapes.findIndex((shape) => shape.id === shapeId)
          return {
            batchId: 'scene:document-shapes',
            start: Math.max(0, index),
            count: 1,
            reason: `scene-shape-changed:${shapeId}`,
          }
        }),
    uniformUpdates: [{
      scope: 'scene',
      name: 'revision',
      value: input.revision,
    }, {
      scope: 'scene',
      name: 'shapeCount',
      value: input.document.shapes.length,
    }],
  }
}

function hasSceneStructureChanged(
  previousDocument: EditorDocument | null,
  nextDocument: EditorDocument,
  previousShapes: SceneShapeSnapshot[],
  nextShapes: SceneShapeSnapshot[],
) {
  if (!previousDocument) {
    return true
  }

  if (previousDocument.id !== nextDocument.id) {
    return true
  }

  if (previousShapes.length !== nextShapes.length) {
    return true
  }

  for (let index = 0; index < nextShapes.length; index += 1) {
    if (previousShapes[index]?.id !== nextShapes[index]?.id) {
      return true
    }
  }

  return false
}

function resolveChangedSceneShapeIds(
  previousShapes: SceneShapeSnapshot[],
  nextShapes: SceneShapeSnapshot[],
) {
  if (previousShapes.length === 0 || nextShapes.length === 0) {
    return [] as string[]
  }

  const previousById = new Map(previousShapes.map((shape) => [shape.id, shape]))
  const changedIds: string[] = []

  nextShapes.forEach((shape) => {
    const previous = previousById.get(shape.id)
    if (!previous) {
      return
    }

    // Ignore selection/hover flag noise; scene dirty is geometry/style focused.
    if (
      previous.x !== shape.x ||
      previous.y !== shape.y ||
      previous.width !== shape.width ||
      previous.height !== shape.height
    ) {
      changedIds.push(shape.id)
    }
  })

  return changedIds
}
