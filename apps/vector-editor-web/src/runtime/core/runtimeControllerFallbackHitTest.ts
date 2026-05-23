import type {EditorDocument} from '../model/index.ts'
import {
  isPointInsideRuntimeClipShape,
  isPointInsideRuntimeShapeHitArea,
} from '../interaction/runtimeHitTest.ts'
import type {PointerState, SceneShapeSnapshot} from '../shared-memory/index.ts'
import {withResolvedPathHints} from '../../runtime/interaction/pathHitTestHints.ts'

const HIT_TEST_TOLERANCE = 6

/**
 * Resolves one fallback selection index in no-SAB runtime mode.
 * @param document Runtime document used as hit-test source of truth.
 * @param shapes Runtime snapshot shapes ordered by draw order.
 * @param pointer Pointer position in world coordinates.
 * @param allowFrameSelection Whether frame nodes are allowed as direct selection targets.
 * @param strictStrokeHitTest Whether strict stroke-only hit-test mode is enabled.
 */
export function resolveFallbackSelectionIndex(
  document: EditorDocument,
  shapes: SceneShapeSnapshot[],
  pointer: PointerState,
  allowFrameSelection = true,
  strictStrokeHitTest = false,
) {
  const shapeById = new Map(document.shapes.map((shape) => [shape.id, shape]))
  for (let index = shapes.length - 1; index >= 0; index -= 1) {
    const shape = shapes[index]
    const source = document.shapes[index] ?? shapeById.get(shape?.id ?? '')
    if (!shape || !source) {
      continue
    }

    if (source.type === 'image' && source.clipPathId) {
      continue
    }
    if (source.clipPathId) {
      const clipSource = shapeById.get(source.clipPathId)
      if (clipSource && !isPointInsideRuntimeClipShape(pointer, withResolvedPathHints(clipSource))) {
        continue
      }
    }
    if (isPointInsideRuntimeShapeHitArea(pointer, withResolvedPathHints(source), {
      allowFrameSelection,
      tolerance: HIT_TEST_TOLERANCE,
      strictStrokeHitTest,
    })) {
      return index
    }
  }

  return -1
}
