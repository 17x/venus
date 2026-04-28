import type {ElementProps} from '../../runtime/types/index.ts'
import {nid} from '../../runtime/model/index.ts'
import {expandMaskLinkedShapeIds} from '../../runtime/interaction/maskGroup.ts'
import {createTransformBatchCommand} from '../../runtime/interaction/index.ts'
import {offsetElementPosition} from '../editorRuntimeHelpers/editorRuntimeHelpers.ts'
import type {DocumentNode} from '../../runtime/model/index.ts'
import type {EditorRuntimeCommand} from '../../runtime/worker/index.ts'

/**
 * Resolves direct execute-action commands that map 1:1 to runtime command types.
 */
export function resolveDirectExecuteActionCommand(input: {
  type: string
  shapes: DocumentNode[]
}): EditorRuntimeCommand | null {
  if (input.type === 'history-undo') {
    return {type: 'history.undo'}
  }

  if (input.type === 'history-redo') {
    return {type: 'history.redo'}
  }

  if (input.type === 'element-delete') {
    return {type: 'selection.delete'}
  }

  if (input.type === 'selection-all') {
    return {
      type: 'selection.set',
      shapeIds: input.shapes
        .filter((shape) => shape.type !== 'frame')
        .map((shape) => shape.id),
      mode: 'replace',
    }
  }

  return null
}

/**
 * Resolves layer reorder direction from execute-action payload.
 */
export function resolveReorderDirectionFromExecuteAction(input: {
  type: string
  data: unknown
}) {
  if (input.type === 'element-layer') {
    return String(input.data ?? 'up') as 'up' | 'down' | 'top' | 'bottom'
  }

  if (input.type === 'bringForward') {
    return 'up' as const
  }

  if (input.type === 'sendBackward') {
    return 'down' as const
  }

  if (input.type === 'bringToFront') {
    return 'top' as const
  }

  if (input.type === 'sendToBack') {
    return 'bottom' as const
  }

  return null
}

/**
 * Resolves keyboard move delta for nudge-style actions.
 */
export function resolveElementMoveDelta(type: string) {
  if (
    type !== 'element-move-up' &&
    type !== 'element-move-right' &&
    type !== 'element-move-down' &&
    type !== 'element-move-left'
  ) {
    return null
  }

  return {
    x: type === 'element-move-right' ? 1 : type === 'element-move-left' ? -1 : 0,
    y: type === 'element-move-down' ? 1 : type === 'element-move-up' ? -1 : 0,
  }
}

/**
 * Resolves selection-modify payload into selection.set runtime command.
 */
export function resolveSelectionModifyCommand(data: unknown): EditorRuntimeCommand | null {
  if (!data || typeof data !== 'object' || !('idSet' in data)) {
    return null
  }

  const nextIds = Array.from(data.idSet as Set<string>)
  const mode =
    'mode' in data && typeof data.mode === 'string'
      ? data.mode as 'replace' | 'add' | 'remove' | 'toggle' | 'clear'
      : 'replace'

  return {
    type: 'selection.set',
    shapeIds: nextIds,
    mode,
  }
}

/**
 * Resolves viewport pan payload from execute-action data.
 */
export function resolveViewportShiftFromExecuteAction(data: unknown) {
  if (!data || typeof data !== 'object' || !('x' in data) || !('y' in data)) {
    return null
  }

  return {
    x: Number(data.x),
    y: Number(data.y),
  }
}

/**
 * Resolves viewport zoom payload from execute-action data.
 */
export function resolveViewportZoomFromExecuteAction(data: unknown) {
  if (data === 'fit') {
    return {
      mode: 'fit' as const,
    }
  }

  if (!data || typeof data !== 'object' || !('zoomFactor' in data)) {
    return null
  }

  return {
    mode: 'zoom' as const,
    zoomFactor: Number(data.zoomFactor),
    point: 'physicalPoint' in data
      ? data.physicalPoint as {x: number; y: number} | undefined
      : undefined,
  }
}

/**
 * Resolves non-frame selected nodes, including mask-linked companions.
 */
function resolveSelectedNonFrameNodes(input: {
  shapes: DocumentNode[]
  selectedShapeIds: string[]
}) {
  const selectedSet = new Set(expandMaskLinkedShapeIds({
    id: 'selection-move',
    name: 'selection-move',
    width: 0,
    height: 0,
    shapes: input.shapes,
  }, input.selectedShapeIds))
  return input.shapes.filter((shape) => selectedSet.has(shape.id) && shape.type !== 'frame')
}

/**
 * Resolves selection move into transform-batch command payload.
 */
export function resolveSelectionMoveCommand(input: {
  shapes: DocumentNode[]
  selectedShapeIds: string[]
  delta: {x: number; y: number}
}) {
  const moveTargets = resolveSelectedNonFrameNodes({
    shapes: input.shapes,
    selectedShapeIds: input.selectedShapeIds,
  })

  return createTransformBatchCommand(moveTargets, {
    shapes: moveTargets.map((shape) => ({
      shapeId: shape.id,
      x: shape.x + input.delta.x,
      y: shape.y + input.delta.y,
      width: shape.width,
      height: shape.height,
      rotation: shape.rotation ?? 0,
      flipX: shape.flipX ?? false,
      flipY: shape.flipY ?? false,
    })),
  })
}

/**
 * Allocates one unique shape id for copy/paste/duplicate element remapping.
 */
function allocateUniqueShapeId(existingIds: Set<string>) {
  let nextId = nid()
  let attempts = 0
  while (existingIds.has(nextId) && attempts < 16) {
    attempts += 1
    nextId = attempts < 8 ? nid() : nid(8)
  }
  existingIds.add(nextId)
  return nextId
}

/**
 * Remaps copied elements to new ids while rebuilding mask-group linkage.
 */
function remapCopiedElements(input: {
  elements: ElementProps[]
  existingShapeIds: Set<string>
  project: (element: ElementProps) => ElementProps
}) {
  const oldToNewId = new Map<string, string>()
  input.elements.forEach((element) => {
    oldToNewId.set(String(element.id), allocateUniqueShapeId(input.existingShapeIds))
  })

  const membersByMaskGroupId = new Map<string, ElementProps[]>()
  input.elements.forEach((element) => {
    if (typeof element.maskGroupId !== 'string') {
      return
    }
    const members = membersByMaskGroupId.get(element.maskGroupId) ?? []
    members.push(element)
    membersByMaskGroupId.set(element.maskGroupId, members)
  })

  // Rebuild copied mask groups from copied host/source ids so new copies don't remain linked to originals.
  const nextMaskGroupIdByPrevious = new Map<string, string>()
  membersByMaskGroupId.forEach((members, previousMaskGroupId) => {
    const host = members.find((element) => element.maskRole === 'host')
    const source = members.find((element) => element.maskRole === 'source')
    const nextHostId = host ? oldToNewId.get(String(host.id)) : undefined
    const nextSourceId = source ? oldToNewId.get(String(source.id)) : undefined
    if (nextHostId && nextSourceId) {
      nextMaskGroupIdByPrevious.set(previousMaskGroupId, `mask-group:${nextHostId}:${nextSourceId}`)
    }
  })

  return input.elements.map((element) => {
    const nextElement = input.project(element)
    return {
      ...nextElement,
      id: oldToNewId.get(String(element.id)) ?? String(element.id),
      clipPathId: typeof element.clipPathId === 'string'
        ? (oldToNewId.get(element.clipPathId) ?? element.clipPathId)
        : element.clipPathId,
      maskGroupId: typeof element.maskGroupId === 'string'
        ? nextMaskGroupIdByPrevious.get(element.maskGroupId) ?? element.maskGroupId
        : element.maskGroupId,
    }
  })
}

/**
 * Resolves pasted elements with deterministic offset and id remapping.
 */
export function resolvePastedElements(input: {
  clipboard: ElementProps[]
  pasteSerial: number
  existingShapeIds: Set<string>
  position: {x: number; y: number} | null
}) {
  if (input.clipboard.length === 0) {
    return []
  }

  const baseOffset = 24 * (input.pasteSerial + 1)
  const anchor = input.clipboard[0]
  const anchorX = anchor?.x ?? 0
  const anchorY = anchor?.y ?? 0
  const pasteTargetX = input.position ? input.position.x + baseOffset : anchorX + baseOffset
  const pasteTargetY = input.position ? input.position.y + baseOffset : anchorY + baseOffset
  const deltaX = pasteTargetX - anchorX
  const deltaY = pasteTargetY - anchorY

  return remapCopiedElements({
    elements: input.clipboard,
    existingShapeIds: input.existingShapeIds,
    project: (item) => ({
      ...offsetElementPosition(
        item,
        (item.x ?? 0) + deltaX,
        (item.y ?? 0) + deltaY,
      ),
      name: `${item.name ?? item.type} Copy`,
    }),
  })
}

/**
 * Resolves duplicated elements with fixed offset and id remapping.
 */
export function resolveDuplicatedElements(input: {
  elements: ElementProps[]
  existingShapeIds: Set<string>
}) {
  return remapCopiedElements({
    elements: input.elements,
    existingShapeIds: input.existingShapeIds,
    project: (item) => ({
      ...offsetElementPosition(item, (item.x ?? 0) + 24, (item.y ?? 0) + 24),
      name: `${item.name ?? item.type} Copy`,
    }),
  })
}

/**
 * Resolves dropped image element geometry using viewport-aware scaling.
 */
export function resolveDroppedImageElement(input: {
  asset: {
    id?: string
    name?: string
    objectUrl?: string
    imageRef?: unknown
  } | null
  position: {x: number; y: number}
  viewportWidth: number
  viewportHeight: number
  imageInsertViewportRatio: number
  existingShapeIds: Set<string>
}): ElementProps {
  const imageRef = input.asset?.imageRef as {naturalWidth?: number; naturalHeight?: number} | undefined
  const naturalWidth = imageRef?.naturalWidth ?? 160
  const naturalHeight = imageRef?.naturalHeight ?? 120
  const maxWidth = input.viewportWidth * input.imageInsertViewportRatio
  const maxHeight = input.viewportHeight * input.imageInsertViewportRatio
  const scale = Math.min(
    1,
    maxWidth / naturalWidth,
    maxHeight / naturalHeight,
  )
  const width = naturalWidth * scale
  const height = naturalHeight * scale

  return {
    id: allocateUniqueShapeId(input.existingShapeIds),
    type: 'image',
    name: input.asset?.name ?? 'Image',
    asset: input.asset?.id,
    assetUrl: input.asset?.objectUrl,
    x: input.position.x - width / 2,
    y: input.position.y - height / 2,
    width,
    height,
    rotation: 0,
    opacity: 1,
  }
}

export {
  resolveSelectedNonFrameElementProps,
} from '../useEditorRuntime/helpers.ts'
