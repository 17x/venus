import type {EditorDocument} from '../model/index.ts'
import type {SceneShapeSnapshot} from '../shared-memory/index.ts'
import type {PreparedPass} from './types.ts'

/**
 * Phase-2 skeleton: prepare scene pass metadata while preserving current
 * canvas adapter behavior. Batch decomposition and partial updates are added
 * incrementally in later phases.
 */
export function prepareScenePass(input: {
  document: EditorDocument
  previousDocument: EditorDocument | null
  shapes: SceneShapeSnapshot[]
  previousShapes: SceneShapeSnapshot[]
  revision: number
}): PreparedPass {
  const changedShapeIds = resolveChangedSceneShapeIds(
    input.previousShapes,
    input.shapes,
    input.previousDocument,
    input.document,
  )
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
  previousDocument: EditorDocument | null,
  nextDocument: EditorDocument,
) {
  if (!previousDocument || previousShapes.length === 0 || nextShapes.length === 0) {
    return [] as string[]
  }

  const previousById = new Map(previousShapes.map((shape) => [shape.id, shape]))
  const changedIds = new Set<string>()
  const previousDocById = new Map(previousDocument.shapes.map((shape) => [shape.id, shape] as const))
  const nextDocById = new Map(nextDocument.shapes.map((shape) => [shape.id, shape] as const))

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
      changedIds.add(shape.id)
      return
    }

    const previousDocShape = previousDocById.get(shape.id)
    const nextDocShape = nextDocById.get(shape.id)
    if (!previousDocShape || !nextDocShape) {
      return
    }

    // Rotation/flip changes do not always mutate shared snapshot geometry,
    // so compare document transforms to keep rotate preview frames live.
    if (
      (previousDocShape.rotation ?? 0) !== (nextDocShape.rotation ?? 0) ||
      !!previousDocShape.flipX !== !!nextDocShape.flipX ||
      !!previousDocShape.flipY !== !!nextDocShape.flipY
    ) {
      changedIds.add(shape.id)
      return
    }

    // Track visual-style deltas so active-layer property edits immediately
    // produce scene patches even when geometry snapshots stay unchanged.
    if (hasRenderableStyleChanged(previousDocShape, nextDocShape)) {
      changedIds.add(shape.id)
    }
  })

  return Array.from(changedIds)
}

// Resolves style/shape-specific fields that affect engine visual output.
function hasRenderableStyleChanged(
  previousShape: EditorDocument['shapes'][number],
  nextShape: EditorDocument['shapes'][number],
) {
  // Shape kind switch always requires scene patch because renderer path changes.
  if (previousShape.type !== nextShape.type) {
    return true
  }

  // Keep shared visual channels (fill/stroke/shadow/text) in dirty detection.
  if (
    stableStringify(previousShape.fill) !== stableStringify(nextShape.fill) ||
    stableStringify(previousShape.stroke) !== stableStringify(nextShape.stroke) ||
    stableStringify(previousShape.shadow) !== stableStringify(nextShape.shadow) ||
    previousShape.text !== nextShape.text ||
    stableStringify(previousShape.textRuns) !== stableStringify(nextShape.textRuns)
  ) {
    return true
  }

  // Keep rectangle/ellipse style controls in active-layer patch path.
  if (
    previousShape.cornerRadius !== nextShape.cornerRadius ||
    stableStringify(previousShape.cornerRadii) !== stableStringify(nextShape.cornerRadii) ||
    previousShape.ellipseStartAngle !== nextShape.ellipseStartAngle ||
    previousShape.ellipseEndAngle !== nextShape.ellipseEndAngle
  ) {
    return true
  }

  // Path/polygon/bezier edits can change contour with stable bbox snapshots.
  return (
    stableStringify(previousShape.points) !== stableStringify(nextShape.points) ||
    stableStringify(previousShape.bezierPoints) !== stableStringify(nextShape.bezierPoints)
  )
}

// Produces deterministic string snapshots so object key order does not create false positives.
function stableStringify(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }

  if (typeof value !== 'object') {
    return String(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`
  }

  const objectValue = value as Record<string, unknown>
  const keys = Object.keys(objectValue).sort()
  return `{${keys.map((key) => `${key}:${stableStringify(objectValue[key])}`).join(',')}}`
}
