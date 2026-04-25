import {
  type EditorDocument,
} from '@vector/model'
import {
  getNormalizedBoundsFromBox,
} from '@venus/engine'
import type {SceneShapeSnapshot} from '@vector/runtime/shared-memory'
import {resolveMaskLinkedShapeIds} from '../../interaction/maskGroup.ts'
import {hasSelectedAncestorInDocument} from './selectionHierarchy.ts'
import {resolveTopHitShapeId} from './shapeHitTest.ts'

export interface SelectionDragModifiers {
  shiftKey?: boolean
  metaKey?: boolean
  ctrlKey?: boolean
  altKey?: boolean
}

export interface SelectionDragSnapshot {
  document: EditorDocument
  shapes: SceneShapeSnapshot[]
}

export interface SelectionDragShapeState {
  shapeId: string
  x: number
  y: number
}

export interface SelectionDragSession {
  start: {x: number; y: number}
  current: {x: number; y: number}
  bounds: {minX: number; minY: number; maxX: number; maxY: number}
  shapes: SelectionDragShapeState[]
}

export interface SelectionDragMoveResult {
  phase: 'none' | 'pending' | 'started' | 'dragging'
  session: SelectionDragSession | null
}

export interface SelectionDragController {
  pointerDown: (
    pointer: {x: number; y: number},
    snapshot: SelectionDragSnapshot,
    modifiers?: SelectionDragModifiers,
    options?: {
      hitShapeId?: string | null
      preferGroupSelection?: boolean
    },
  ) => boolean
  pointerMove: (pointer: {x: number; y: number}, snapshot: SelectionDragSnapshot) => SelectionDragMoveResult
  pointerUp: () => SelectionDragSession | null
  clear: () => void
  getSession: () => SelectionDragSession | null
}

export function createSelectionDragController(options?: {
  dragThresholdPx?: number
  lineHitTolerance?: number
  allowFrameSelection?: boolean
}): SelectionDragController {
  const dragThresholdPx = options?.dragThresholdPx ?? 3
  const lineHitTolerance = options?.lineHitTolerance ?? 6
  const allowFrameSelection = options?.allowFrameSelection ?? true

  let pending: {start: {x: number; y: number}; shapeId: string} | null = null
  let session: SelectionDragSession | null = null

  const clear = () => {
    pending = null
    session = null
  }

  return {
    pointerDown(pointer, snapshot, modifiers, options) {
      // Modifier-based selection edits should still hit-test for click
      // selection, but should not arm drag-pending move sessions.
      const hasModifier = !!(
        modifiers?.shiftKey ||
        modifiers?.metaKey ||
        modifiers?.ctrlKey ||
        modifiers?.altKey
      )

      let hitShape = null as SceneShapeSnapshot | null
      const hintedId = options?.hitShapeId ?? null
      const preferGroupSelection = options?.preferGroupSelection ?? false
      const shapeSnapshotById = new Map(snapshot.shapes.map((shape) => [shape.id, shape]))
      if (hintedId) {
        const hintedShape = shapeSnapshotById.get(hintedId) ?? null
        const hintedHitId = hintedShape
          ? resolveTopHitShapeId(snapshot.document, [hintedShape], pointer, {
            allowFrameSelection,
            tolerance: lineHitTolerance,
            excludeClipBoundImage: true,
            clipTolerance: lineHitTolerance,
            preferGroupSelection,
          })
          : null
        if (hintedHitId && hintedShape) {
          hitShape = hintedShape
        }
      }
      if (!hitShape) {
        const hitShapeId = resolveTopHitShapeId(snapshot.document, snapshot.shapes, pointer, {
          allowFrameSelection,
          tolerance: lineHitTolerance,
          excludeClipBoundImage: true,
          clipTolerance: lineHitTolerance,
          preferGroupSelection,
        })
        hitShape = hitShapeId ? shapeSnapshotById.get(hitShapeId) ?? null : null
      }
      pending = hitShape && !hasModifier
        ? {
          start: pointer,
          shapeId: hitShape.id,
        }
        : null
      session = null
      return !!hitShape
    },
    pointerMove(pointer, snapshot) {
      if (pending) {
        const moved = Math.hypot(pointer.x - pending.start.x, pointer.y - pending.start.y)
        if (moved < dragThresholdPx) {
          return {
            phase: 'pending',
            session: null,
          }
        }

        const selectedIds = snapshot.shapes.filter((shape) => shape.isSelected).map((shape) => shape.id)
        const shapeById = new Map(snapshot.document.shapes.map((shape) => [shape.id, shape]))
        const selectedExpandedSet = new Set(selectedIds)
        selectedIds.forEach((shapeId) => {
          collectDescendantShapeIds(shapeById, shapeId, selectedExpandedSet)
          collectClipLinkedShapeIds(shapeById, shapeId, selectedExpandedSet)
        })
        // Drag follows the selected set when hit shape is selected; otherwise
        // it drags the hit shape only (single-shape takeover).
        const selectedIdSet = selectedExpandedSet
        const dragIds = (
          selectedIdSet.has(pending.shapeId) ||
          hasSelectedAncestorInDocument(
            shapeById,
            pending.shapeId,
            selectedIdSet,
          )
        )
          ? Array.from(selectedIdSet)
          : resolveSingleDragIds(shapeById, pending.shapeId)
        const dragShapes = dragIds
          .map((id) => snapshot.document.shapes.find((shape) => shape.id === id))
          .filter((shape): shape is NonNullable<typeof shape> => Boolean(shape))
          .map((shape) => ({
            shapeId: shape.id,
            x: shape.x,
            y: shape.y,
            width: shape.width,
            height: shape.height,
          }))

        if (dragShapes.length === 0) {
          pending = null
          return {
            phase: 'none',
            session: null,
          }
        }

        const first = dragShapes[0]
        const firstBounds = getNormalizedBoundsFromBox(first.x, first.y, first.width, first.height)
        const bounds = dragShapes
          .map((shape) => getNormalizedBoundsFromBox(shape.x, shape.y, shape.width, shape.height))
          .reduce<{minX: number; minY: number; maxX: number; maxY: number}>(
            (acc, boundsItem) => ({
              minX: Math.min(acc.minX, boundsItem.minX),
              minY: Math.min(acc.minY, boundsItem.minY),
              maxX: Math.max(acc.maxX, boundsItem.maxX),
              maxY: Math.max(acc.maxY, boundsItem.maxY),
            }),
            {
              minX: firstBounds.minX,
              minY: firstBounds.minY,
              maxX: firstBounds.maxX,
              maxY: firstBounds.maxY,
            },
          )

        session = {
          start: pending.start,
          current: pointer,
          bounds,
          shapes: dragShapes.map((shape) => ({
            shapeId: shape.shapeId,
            x: shape.x,
            y: shape.y,
          })),
        }
        pending = null
        return {
          phase: 'started',
          session,
        }
      }

      if (session) {
        session = {
          ...session,
          current: pointer,
        }
        return {
          phase: 'dragging',
          session,
        }
      }

      return {
        phase: 'none',
        session: null,
      }
    },
    pointerUp() {
      const finished = session
      pending = null
      session = null
      return finished
    },
    clear,
    getSession() {
      return session
    },
  }
}

function collectDescendantShapeIds(
  shapeById: Map<string, EditorDocument['shapes'][number]>,
  shapeId: string,
  out: Set<string>,
) {
  const shape = shapeById.get(shapeId)
  if (!shape || !Array.isArray(shape.childIds)) {
    return
  }

  shape.childIds.forEach((childId) => {
    if (out.has(childId)) {
      return
    }
    out.add(childId)
    collectDescendantShapeIds(shapeById, childId, out)
  })
}

function collectClipLinkedShapeIds(
  shapeById: Map<string, EditorDocument['shapes'][number]>,
  shapeId: string,
  out: Set<string>,
) {
  if (!shapeById.has(shapeId)) {
    return
  }

  const document: EditorDocument = {
    id: 'selection-drag',
    name: 'selection-drag',
    width: 0,
    height: 0,
    shapes: Array.from(shapeById.values()),
  }
  resolveMaskLinkedShapeIds(document, shapeId).forEach((linkedShapeId) => {
    if (linkedShapeId !== shapeId) {
      out.add(linkedShapeId)
    }
  })
}

function resolveSingleDragIds(
  shapeById: Map<string, EditorDocument['shapes'][number]>,
  shapeId: string,
) {
  const ids = new Set<string>([shapeId])
  collectDescendantShapeIds(shapeById, shapeId, ids)
  collectClipLinkedShapeIds(shapeById, shapeId, ids)
  return Array.from(ids)
}
