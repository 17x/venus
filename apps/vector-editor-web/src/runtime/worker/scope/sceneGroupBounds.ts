import type {EditorDocument} from '../../model/index.ts'
import {incrementSceneVersion, type SceneMemory} from '../../shared-memory/index.ts'
import type {WorkerSpatialIndex} from './types.ts'
import {updateSpatialShape, writeRuntimeShapeToScene} from './sceneSpatial.ts'
import {
  createNormalizedRuntimeDocument,
  deriveGroupBoundsFromNormalizedRuntime,
} from '../../model/document-runtime/index.ts'

/**
 * Syncs derived group bounds via normalized runtime traversal and writes changed groups back to scene memory.
 */
export function syncDerivedGroupBounds(
  scene: SceneMemory,
  document: EditorDocument,
  spatialIndex: WorkerSpatialIndex,
) {
  // Build a normalized graph snapshot so group geometry derives from stable parent/children structure.
  const normalizedDocument = createNormalizedRuntimeDocument(document)
  const changedIds = deriveGroupBoundsFromNormalizedRuntime(normalizedDocument)
  if (changedIds.length === 0) {
    return
  }

  changedIds.forEach((shapeId) => {
    const index = document.shapes.findIndex((shape) => shape.id === shapeId)
    if (index < 0) {
      return
    }

    writeRuntimeShapeToScene(scene, document, index, document.shapes[index])
    updateSpatialShape(spatialIndex, document, shapeId)
  })

  incrementSceneVersion(scene)
}
