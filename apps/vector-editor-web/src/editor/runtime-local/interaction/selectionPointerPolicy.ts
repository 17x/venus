import type {DocumentNode} from '@vector/model'
import {isPointInsideEngineShapeHitArea, isPointInsideRotatedBounds} from '@venus/engine'
import {hasSelectedAncestorInDocument} from './selectionHierarchy.ts'
import {withResolvedPathHints} from '../../interaction/pathHitTestHints.ts'

export interface ShouldClearSelectionOnPointerDownOptions {
  selectedBounds: {minX: number; minY: number; maxX: number; maxY: number} | null | undefined
  selectedNodes: DocumentNode[]
  singleSelectedRotation: number
  shapeById: Map<string, DocumentNode>
  tolerance?: number
}

export function shouldClearSelectionOnPointerDown(
  pointer: {x: number; y: number},
  options: ShouldClearSelectionOnPointerDownOptions,
) {
  if (!options.selectedBounds || options.selectedNodes.length === 0) {
    return false
  }

  if (!isPointInsideRotatedBounds(pointer, options.selectedBounds, options.singleSelectedRotation)) {
    return false
  }

  const tolerance = options.tolerance ?? 6
  return !options.selectedNodes.some((shape) => isPointInsideEngineShapeHitArea(pointer, withResolvedPathHints(shape), {
    tolerance,
    shapeById: options.shapeById,
  }))
}

export interface ShouldPreserveGroupDragSelectionOptions {
  modifiers?: {
    shiftKey?: boolean
    metaKey?: boolean
    ctrlKey?: boolean
    altKey?: boolean
  }
  hoveredShapeId: string | null
  selectedNodes: DocumentNode[]
  shapeById: Map<string, DocumentNode>
}

export function shouldPreserveGroupDragSelection(
  options: ShouldPreserveGroupDragSelectionOptions,
) {
  const isPlainClick = !(
    options.modifiers?.shiftKey ||
    options.modifiers?.metaKey ||
    options.modifiers?.ctrlKey ||
    options.modifiers?.altKey
  )

  if (!isPlainClick || !options.hoveredShapeId) {
    return false
  }

  const selectedIdSet = new Set(options.selectedNodes.map((shape) => shape.id))
  return (
    selectedIdSet.has(options.hoveredShapeId) ||
    hasSelectedAncestorInDocument(options.shapeById, options.hoveredShapeId, selectedIdSet)
  )
}

