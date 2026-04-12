import {
  type EditorDocument,
} from '@venus/document-core'
import {
  getNormalizedBounds,
  isPointInsideEngineClipShape,
  isPointInsideEngineShapeHitArea,
} from '@venus/engine'
import type {SceneShapeSnapshot} from '@venus/shared-memory'

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
      const shapeById = new Map(snapshot.document.shapes.map((item) => [item.id, item]))
      if (hintedId) {
        const hintedShape = snapshot.shapes.find((shape) => shape.id === hintedId) ?? null
        const hintedSource = hintedShape ? shapeById.get(hintedShape.id) : undefined
        if (
          hintedShape &&
          hintedSource &&
          isShapeHitAtPointer(hintedShape, hintedSource, pointer, lineHitTolerance, allowFrameSelection, shapeById)
        ) {
          hitShape = hintedShape
        }
      }
      if (!hitShape) {
        const hitIndex = hitTestSnapshot(snapshot, pointer, lineHitTolerance, allowFrameSelection)
        hitShape = hitIndex >= 0 ? snapshot.shapes[hitIndex] : null
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
        // Drag follows the selected set when hit shape is selected; otherwise
        // it drags the hit shape only (single-shape takeover).
        const selectedIdSet = new Set(selectedIds)
        const dragIds = (
          selectedIdSet.has(pending.shapeId) ||
          hasSelectedAncestor(pending.shapeId, selectedIdSet, snapshot.document)
        )
          ? selectedIds
          : [pending.shapeId]
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
        const firstBounds = getNormalizedBounds(first.x, first.y, first.width, first.height)
        const bounds = dragShapes
          .map((shape) => getNormalizedBounds(shape.x, shape.y, shape.width, shape.height))
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

function hasSelectedAncestor(
  shapeId: string,
  selectedIds: Set<string>,
  document: EditorDocument,
) {
  const byId = new Map(document.shapes.map((shape) => [shape.id, shape]))
  let current = byId.get(shapeId)
  while (current?.parentId) {
    if (selectedIds.has(current.parentId)) {
      return true
    }
    current = byId.get(current.parentId)
  }
  return false
}

function hitTestSnapshot(
  snapshot: SelectionDragSnapshot,
  pointer: {x: number; y: number},
  lineHitTolerance: number,
  allowFrameSelection: boolean,
) {
  const {document, shapes} = snapshot
  const shapeById = new Map(document.shapes.map((item) => [item.id, item]))
  for (let index = shapes.length - 1; index >= 0; index -= 1) {
    const shape = shapes[index]
    const source = shapeById.get(shape.id)
    if (!source) {
      continue
    }
    if (isShapeHitAtPointer(shape, source, pointer, lineHitTolerance, allowFrameSelection, shapeById)) {
      return index
    }
  }

  return -1
}

function isShapeHitAtPointer(
  _shape: SceneShapeSnapshot,
  source: EditorDocument['shapes'][number],
  pointer: {x: number; y: number},
  lineHitTolerance: number,
  allowFrameSelection: boolean,
  shapeById: Map<string, EditorDocument['shapes'][number]>,
) {
  if (source.type === 'image' && source.clipPathId) {
    return false
  }

  if (source.clipPathId) {
    const clipSource = shapeById.get(source.clipPathId)
    if (clipSource && !isPointInsideEngineClipShape(pointer, clipSource, {
      tolerance: lineHitTolerance,
      shapeById,
    })) {
      return false
    }
  }

  return isPointInsideEngineShapeHitArea(pointer, source, {
    allowFrameSelection,
    tolerance: lineHitTolerance,
    shapeById,
  })
}
