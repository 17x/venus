import type {DocumentNode} from '@venus/document-core'
import {buildSelectionHandlesFromBounds, pickSelectionHandleAtPoint, type SelectionHandle} from './selectionHandles.ts'
import {resolveSelectedNodesByIds, resolveSingleSelectedRotation} from './selectionResolve.ts'

export interface ResolveSelectionHandleHitOptions {
  point: {x: number; y: number}
  selectedShapeIds: string[]
  shapeById: Map<string, DocumentNode>
  selectedBounds: {minX: number; minY: number; maxX: number; maxY: number} | null
  handleTolerance?: number
  rotateOffset?: number
}

export interface ResolveSelectionHandleHitResult {
  selectedNodes: DocumentNode[]
  selectedBounds: {minX: number; minY: number; maxX: number; maxY: number} | null
  singleSelectedRotation: number
  handle: SelectionHandle | null
}

export function resolveSelectionHandleHitAtPoint(
  options: ResolveSelectionHandleHitOptions,
): ResolveSelectionHandleHitResult {
  const selectedNodes = resolveSelectedNodesByIds(options.shapeById, options.selectedShapeIds)
  const singleSelectedRotation = resolveSingleSelectedRotation(selectedNodes)
  const selectedBounds = options.selectedBounds

  if (!selectedBounds) {
    return {
      selectedNodes,
      selectedBounds,
      singleSelectedRotation,
      handle: null,
    }
  }

  const handles = buildSelectionHandlesFromBounds(selectedBounds, {
    rotateOffset: options.rotateOffset ?? 28,
    rotateDegrees: singleSelectedRotation,
  })

  return {
    selectedNodes,
    selectedBounds,
    singleSelectedRotation,
    handle: pickSelectionHandleAtPoint(
      options.point,
      handles,
      options.handleTolerance ?? 6,
    ),
  }
}
