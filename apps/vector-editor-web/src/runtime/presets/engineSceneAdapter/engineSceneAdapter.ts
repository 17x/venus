import {
  applyAffineMatrixToPoint,
  getBoundingRectFromBezierPoints,
  type EditorDocument,
} from '../../model/index.ts'
import {
  resolveNodeTransform,
  type EngineRenderableNode,
  type EngineScenePatch,
  type EngineScenePatchBatch,
  type EngineSceneSnapshot,
} from '@venus/engine'
import type {SceneShapeSnapshot} from '../../shared-memory/index.ts'
import {readRunShadow, resolveEngineShapeKind, resolveEngineTextAlign} from './engineSceneAdapter.text.ts'
import {resolveParentLocalEngineTransform} from './engineSceneAdapter.tree.ts'

type RuntimeDocumentShape = EditorDocument['shapes'][number]

export interface CreateEngineSceneFromRuntimeSnapshotOptions {
  document: EditorDocument
  shapes: SceneShapeSnapshot[]
  revision: string | number
  backgroundFill?: string
  backgroundStroke?: string
  includeShapeIds?: readonly string[]
  includeDocumentBackground?: boolean
  /**
   * `flat` preserves the current top-level render snapshot contract.
   * `tree` emits group/frame hierarchy with parent-local transforms.
   */
  structureMode?: 'flat' | 'tree'
}

export interface CreateEngineScenePatchBatchFromRuntimeSnapshotOptions
  extends Omit<CreateEngineSceneFromRuntimeSnapshotOptions, 'includeShapeIds'> {
  changedShapeIds: readonly string[]
}

export interface CreateEngineScenePatchBatchFromRuntimeSnapshotResult {
  requiresFullLoad: boolean
  batch: EngineScenePatchBatch
  upsertNodes: readonly EngineRenderableNode[]
}

/**
 * Build an engine scene snapshot from runtime document + shape snapshot data.
 *
 * Ownership split:
 * - runtime document provides semantic/source geometry + style metadata
 * - snapshot provides current hover/selection flags and visible shape ordering
 */
export function createEngineSceneFromRuntimeSnapshot(
  options: CreateEngineSceneFromRuntimeSnapshotOptions,
): EngineSceneSnapshot {
  const includeShapeIdSet = options.includeShapeIds
    ? new Set(options.includeShapeIds)
    : null
  const documentShapeById = new Map(options.document.shapes.map((shape) => [shape.id, shape]))
  const snapshotShapeById = new Map(options.shapes.map((shape) => [shape.id, shape]))
  const nodes: EngineRenderableNode[] = []

  if (options.includeDocumentBackground !== false) {
    nodes.push(createDocumentBackgroundNode(options))
  }

  if (options.structureMode === 'tree') {
    nodes.push(...createTreeEngineNodes({
      document: options.document,
      includeShapeIdSet,
      documentShapeById,
      snapshotShapeById,
      shapeOrder: options.shapes.map((shape) => shape.id),
    }))

    return {
      revision: options.revision,
      width: options.document.width,
      height: options.document.height,
      nodes,
    }
  }

  options.shapes.forEach((shape) => {
    if (includeShapeIdSet && !includeShapeIdSet.has(shape.id)) {
      return
    }

    const sourceShape = documentShapeById.get(shape.id)
    nodes.push(createEngineNodeFromRuntimeShape({
      snapshotShape: shape,
      sourceShape,
      parentShape: undefined,
      children: [],
      documentShapeById,
      structureMode: 'flat',
    }))
  })

  return {
    revision: options.revision,
    width: options.document.width,
    height: options.document.height,
    nodes,
  }
}

export function createEngineScenePatchBatchFromRuntimeSnapshot(
  options: CreateEngineScenePatchBatchFromRuntimeSnapshotOptions,
): CreateEngineScenePatchBatchFromRuntimeSnapshotResult {
  if (options.structureMode !== 'tree') {
    const incrementalScene = createEngineSceneFromRuntimeSnapshot({
      ...options,
      includeShapeIds: options.changedShapeIds,
      includeDocumentBackground: false,
    })
    const patch: EngineScenePatch = {
      revision: options.revision,
      upsertNodes: incrementalScene.nodes,
    }
    return {
      requiresFullLoad: false,
      batch: {patches: incrementalScene.nodes.length > 0 ? [patch] : []},
      upsertNodes: incrementalScene.nodes,
    }
  }

  const documentShapeById = new Map(options.document.shapes.map((shape) => [shape.id, shape]))
  const snapshotShapeById = new Map(options.shapes.map((shape) => [shape.id, shape]))
  const shapeOrder = options.shapes.map((shape) => shape.id)
  const childrenByParentId = resolveOrderedChildrenByParentId(options.document, shapeOrder)
  const rootShapeIds = shapeOrder.filter((shapeId) => {
    const shape = documentShapeById.get(shapeId)
    if (!shape) {
      return false
    }
    const parentId = shape.parentId ?? null
    return parentId === null || !documentShapeById.has(parentId)
  })
  const uniqueChangedIds = filterTreePatchRootIds(
    Array.from(new Set(options.changedShapeIds)),
    documentShapeById,
  )
  const patches: EngineScenePatch[] = []
  const upsertNodes: EngineRenderableNode[] = []

  for (const changedId of uniqueChangedIds) {
    const sourceShape = documentShapeById.get(changedId)
    if (!sourceShape) {
      return {
        requiresFullLoad: true,
        batch: {patches: []},
        upsertNodes: [],
      }
    }

    const parentShape = sourceShape.parentId
      ? documentShapeById.get(sourceShape.parentId) ?? null
      : null
    const node = createTreeEngineNodeSubtree({
      sourceShape,
      parentShape,
      includeShapeIdSet: null,
      childrenByParentId,
      snapshotShapeById,
      documentShapeById,
    })
    const upsertParentId = parentShape?.id ?? null
    const upsertIndex = resolveTreeNodeUpsertIndex({
      sourceShape,
      parentShape,
      childrenByParentId,
      rootShapeIds,
      includeDocumentBackground: options.includeDocumentBackground,
    })

    upsertNodes.push(node)
    patches.push({
      revision: options.revision,
      upsertNodes: [node],
      upsertParentId,
      upsertIndex,
    })
  }

  return {
    requiresFullLoad: false,
    batch: {patches},
    upsertNodes,
  }
}

function createDocumentBackgroundNode(
  options: Pick<CreateEngineSceneFromRuntimeSnapshotOptions, 'document' | 'backgroundFill' | 'backgroundStroke'>,
): EngineRenderableNode {
  return {
    id: '__doc_background__',
    type: 'shape',
    shape: 'rect',
    x: 0,
    y: 0,
    width: options.document.width,
    height: options.document.height,
    fill: options.backgroundFill ?? '#ffffff',
    stroke: options.backgroundStroke ?? '#d0d7de',
    strokeWidth: 1,
  }
}

function createTreeEngineNodes(input: {
  document: EditorDocument
  includeShapeIdSet: Set<string> | null
  documentShapeById: Map<string, RuntimeDocumentShape>
  snapshotShapeById: Map<string, SceneShapeSnapshot>
  shapeOrder: readonly string[]
}): EngineRenderableNode[] {
  const childrenByParentId = resolveOrderedChildrenByParentId(input.document, input.shapeOrder)
  const rootShapes = input.shapeOrder
    .map((id) => input.documentShapeById.get(id))
    .filter((shape): shape is RuntimeDocumentShape => Boolean(shape))
    .filter((shape) => shouldIncludeTreeNode(shape.id, input.includeShapeIdSet, childrenByParentId))
    .filter((shape) => {
      const parentId = shape.parentId ?? null
      return parentId === null ||
        !input.documentShapeById.has(parentId) ||
        !shouldIncludeTreeNode(parentId, input.includeShapeIdSet, childrenByParentId)
    })

  return rootShapes.map((shape) => createTreeEngineNodeSubtree({
    sourceShape: shape,
    parentShape: null,
    includeShapeIdSet: input.includeShapeIdSet,
    childrenByParentId,
    snapshotShapeById: input.snapshotShapeById,
    documentShapeById: input.documentShapeById,
  }))
}

function createTreeEngineNodeSubtree(input: {
  sourceShape: RuntimeDocumentShape
  parentShape: RuntimeDocumentShape | null
  includeShapeIdSet: Set<string> | null
  childrenByParentId: Map<string, RuntimeDocumentShape[]>
  snapshotShapeById: Map<string, SceneShapeSnapshot>
  documentShapeById: Map<string, RuntimeDocumentShape>
}): EngineRenderableNode {
  const childNodes = (input.childrenByParentId.get(input.sourceShape.id) ?? [])
    .filter((child) => shouldIncludeTreeNode(child.id, input.includeShapeIdSet, input.childrenByParentId))
    .map((child) => createTreeEngineNodeSubtree({
      sourceShape: child,
      parentShape: input.sourceShape,
      includeShapeIdSet: input.includeShapeIdSet,
      childrenByParentId: input.childrenByParentId,
      snapshotShapeById: input.snapshotShapeById,
      documentShapeById: input.documentShapeById,
    }))
  const snapshotShape = input.snapshotShapeById.get(input.sourceShape.id) ??
    snapshotFromDocumentShape(input.sourceShape)

  return createEngineNodeFromRuntimeShape({
    snapshotShape,
    sourceShape: input.sourceShape,
    parentShape: input.parentShape,
    children: childNodes,
    documentShapeById: input.documentShapeById,
    structureMode: 'tree',
  })
}

function createEngineNodeFromRuntimeShape(input: {
  snapshotShape: SceneShapeSnapshot
  sourceShape: RuntimeDocumentShape | undefined
  parentShape: RuntimeDocumentShape | null | undefined
  children: EngineRenderableNode[]
  documentShapeById: Map<string, RuntimeDocumentShape>
  structureMode: 'flat' | 'tree'
}): EngineRenderableNode {
  const {snapshotShape, sourceShape, documentShapeById, structureMode} = input
  const sourceBounds = resolveSourceShapeBounds(sourceShape)
  const sourceTransform = resolveSourceShapeTransform(sourceShape, input.parentShape)
  const paint = resolveShapePaint(sourceShape)
  const sourceType = sourceShape?.type ?? snapshotShape.type
  const clip = resolveNodeClip(sourceShape, documentShapeById)

  if (sourceType === 'group') {
    return {
      id: snapshotShape.id,
      type: 'group',
      children: structureMode === 'tree' ? input.children : [],
      transform: sourceTransform,
    }
  }

  if (sourceType === 'frame' && structureMode === 'tree') {
    const background: EngineRenderableNode = {
      id: `${snapshotShape.id}__frame_background`,
      type: 'shape',
      shape: 'rect',
      x: sourceBounds?.x ?? snapshotShape.x,
      y: sourceBounds?.y ?? snapshotShape.y,
      width: sourceBounds?.width ?? snapshotShape.width,
      height: sourceBounds?.height ?? snapshotShape.height,
      clip,
      fillConfig: paint.fillConfig,
      strokeConfig: paint.strokeConfig,
      fill: paint.fill,
      stroke: paint.stroke,
      strokeWidth: paint.strokeWidth,
      hitTargetId: snapshotShape.id,
      cornerRadius: sourceShape?.cornerRadius,
      cornerRadii: sourceShape?.cornerRadii
        ? {
          topLeft: sourceShape.cornerRadii.topLeft,
          topRight: sourceShape.cornerRadii.topRight,
          bottomRight: sourceShape.cornerRadii.bottomRight,
          bottomLeft: sourceShape.cornerRadii.bottomLeft,
        }
        : undefined,
    }

    return {
      id: snapshotShape.id,
      type: 'group',
      children: [background, ...input.children],
      transform: sourceTransform,
      shadow: resolveNodeShadow(sourceShape),
    }
  }

  if (sourceType === 'image') {
    const hasImageSource = Boolean(sourceShape?.assetId || sourceShape?.assetUrl)
    if (!hasImageSource) {
      return {
        id: snapshotShape.id,
        type: 'shape',
        shape: 'rect',
        x: sourceBounds?.x ?? snapshotShape.x,
        y: sourceBounds?.y ?? snapshotShape.y,
        width: sourceBounds?.width ?? snapshotShape.width,
        height: sourceBounds?.height ?? snapshotShape.height,
        transform: sourceTransform,
        clip,
        fillConfig: paint.fillConfig,
        strokeConfig: paint.strokeConfig,
        fill: paint.fill,
        stroke: paint.stroke,
        strokeWidth: paint.strokeWidth,
      }
    }

    return {
      id: snapshotShape.id,
      type: 'image',
      x: sourceBounds?.x ?? snapshotShape.x,
      y: sourceBounds?.y ?? snapshotShape.y,
      width: sourceBounds?.width ?? snapshotShape.width,
      height: sourceBounds?.height ?? snapshotShape.height,
      transform: sourceTransform,
      shadow: resolveNodeShadow(sourceShape),
      assetId: sourceShape?.assetId ?? sourceShape?.id ?? snapshotShape.id,
      clip,
    }
  }

  if (sourceType === 'text') {
    return {
      id: snapshotShape.id,
      type: 'text',
      x: sourceBounds?.x ?? snapshotShape.x,
      y: sourceBounds?.y ?? snapshotShape.y,
      width: sourceBounds?.width ?? snapshotShape.width,
      height: sourceBounds?.height ?? snapshotShape.height,
      transform: sourceTransform,
      shadow: resolveNodeShadow(sourceShape),
      clip,
      cacheKey: snapshotShape.textRenderHash ? `worker:${snapshotShape.textRenderHash}` : undefined,
      lineCount: snapshotShape.textLineCount,
      maxLineHeight: snapshotShape.textMaxLineHeight,
      text: sourceShape?.text ?? snapshotShape.name ?? 'Text',
      runs: sourceShape?.textRuns?.map((run) => {
        const style = {
          fill: run.style?.color,
          fillConfig: run.style?.color ? {color: run.style.color} : undefined,
          fontFamily: run.style?.fontFamily,
          fontSize: run.style?.fontSize,
          fontWeight: run.style?.fontWeight,
          lineHeight: run.style?.lineHeight,
          letterSpacing: run.style?.letterSpacing,
          align: resolveEngineTextAlign(run.style?.textAlign),
          verticalAlign: run.style?.verticalAlign,
        }
        const shadow = readRunShadow(run.style)
        if (shadow) {
          // Keep shadow transport compatible even before all type surfaces are refreshed.
          ;(style as Record<string, unknown>).shadow = shadow
        }

        return {
          text: (sourceShape.text ?? '').slice(run.start, run.end),
          style,
        }
      }),
      style: (() => {
        const firstRun = sourceShape?.textRuns?.[0]
        const style = {
          fontFamily: firstRun?.style?.fontFamily ?? 'Arial, sans-serif',
          fontSize: firstRun?.style?.fontSize ?? 16,
          fontWeight: firstRun?.style?.fontWeight,
          lineHeight: firstRun?.style?.lineHeight,
          letterSpacing: firstRun?.style?.letterSpacing,
          fill: firstRun?.style?.color ?? '#111111',
          fillConfig: {color: firstRun?.style?.color ?? '#111111'},
          align: resolveEngineTextAlign(firstRun?.style?.textAlign) ?? 'start',
          verticalAlign: firstRun?.style?.verticalAlign,
        }
        const shadow = readRunShadow(firstRun?.style)
        if (shadow) {
          ;(style as Record<string, unknown>).shadow = shadow
        }
        return style
      })(),
    }
  }

  return {
    id: snapshotShape.id,
    type: 'shape',
    shape: resolveEngineShapeKind(sourceType),
    ...resolveEngineShapeGeometry(snapshotShape, sourceShape, sourceBounds),
    pointCount: snapshotShape.pathPointCount,
    bezierPointCount: snapshotShape.pathBezierPointCount,
    cornerRadius: sourceShape?.cornerRadius,
    cornerRadii: sourceShape?.cornerRadii
      ? {
        topLeft: sourceShape.cornerRadii.topLeft,
        topRight: sourceShape.cornerRadii.topRight,
        bottomRight: sourceShape.cornerRadii.bottomRight,
        bottomLeft: sourceShape.cornerRadii.bottomLeft,
      }
      : undefined,
    ellipseStartAngle: sourceShape?.ellipseStartAngle,
    ellipseEndAngle: sourceShape?.ellipseEndAngle,
    strokeStartArrowhead: sourceShape?.strokeStartArrowhead,
    strokeEndArrowhead: sourceShape?.strokeEndArrowhead,
    shadow: resolveNodeShadow(sourceShape),
    clip,
    transform: sourceTransform,
    fillConfig: paint.fillConfig,
    strokeConfig: paint.strokeConfig,
    fill: paint.fill,
    stroke: paint.stroke,
    strokeWidth: paint.strokeWidth,
  }
}

export function buildDocumentImageAssetUrlMap(document: EditorDocument) {
  const map = new Map<string, string>()
  document.shapes.forEach((shape) => {
    if (shape.type !== 'image') {
      return
    }

    if (shape.assetId && shape.assetUrl) {
      map.set(shape.assetId, shape.assetUrl)
    }
    if (shape.assetUrl) {
      map.set(shape.id, shape.assetUrl)
    }
  })

  return map
}

function resolveEngineShapeGeometry(
  snapshotShape: SceneShapeSnapshot,
  sourceShape: EditorDocument['shapes'][number] | undefined,
  sourceBounds: {x: number; y: number; width: number; height: number} | null,
) {
  const rawPoints = sourceShape?.points?.map((point) => ({x: point.x, y: point.y})) ?? undefined
  const rawBezierPoints = sourceShape?.bezierPoints?.map((point) => ({
    anchor: {x: point.anchor.x, y: point.anchor.y},
    cp1: point.cp1 ? {x: point.cp1.x, y: point.cp1.y} : point.cp1,
    cp2: point.cp2 ? {x: point.cp2.x, y: point.cp2.y} : point.cp2,
  })) ?? undefined
  const usesWorldSpaceGeometry = (
    sourceShape?.type === 'lineSegment' ||
    sourceShape?.type === 'polygon' ||
    sourceShape?.type === 'star' ||
    sourceShape?.type === 'path'
  )
  const inverseMatrix = sourceShape && usesWorldSpaceGeometry
    ? resolveNodeTransform(sourceShape).inverseMatrix
    : null
  const points = rawPoints && inverseMatrix
    ? rawPoints.map((point) => applyAffineMatrixToPoint(inverseMatrix, point))
    : rawPoints
  const bezierPoints = rawBezierPoints && inverseMatrix
    ? rawBezierPoints.map((point) => ({
      anchor: applyAffineMatrixToPoint(inverseMatrix, point.anchor),
      cp1: point.cp1 ? applyAffineMatrixToPoint(inverseMatrix, point.cp1) : point.cp1,
      cp2: point.cp2 ? applyAffineMatrixToPoint(inverseMatrix, point.cp2) : point.cp2,
    }))
    : rawBezierPoints
  const fallbackRect = sourceBounds ?? {
    x: snapshotShape.x,
    y: snapshotShape.y,
    width: snapshotShape.width,
    height: snapshotShape.height,
  }
  const fallbackLinePoints = inverseMatrix
    ? [
      applyAffineMatrixToPoint(inverseMatrix, {x: fallbackRect.x, y: fallbackRect.y}),
      applyAffineMatrixToPoint(inverseMatrix, {
        x: fallbackRect.x + fallbackRect.width,
        y: fallbackRect.y + fallbackRect.height,
      }),
    ]
    : [
      {x: fallbackRect.x, y: fallbackRect.y},
      {x: fallbackRect.x + fallbackRect.width, y: fallbackRect.y + fallbackRect.height},
    ]
  const normalizedPoints = (
    sourceShape?.type === 'lineSegment' && (!rawPoints || rawPoints.length < 2)
      ? fallbackLinePoints
      : points
  )
  const bounds = resolveShapePointBounds(normalizedPoints, bezierPoints)

  return {
    x: bounds?.x ?? sourceBounds?.x ?? snapshotShape.x,
    y: bounds?.y ?? sourceBounds?.y ?? snapshotShape.y,
    width: bounds?.width ?? sourceBounds?.width ?? snapshotShape.width,
    height: bounds?.height ?? sourceBounds?.height ?? snapshotShape.height,
    points: normalizedPoints,
    bezierPoints,
    closed: resolveShapeClosed(sourceShape, normalizedPoints, bezierPoints),
  }
}

function resolveShapePointBounds(
  points?: readonly {x: number; y: number}[],
  bezierPoints?: readonly {
    anchor: {x: number; y: number}
    cp1?: {x: number; y: number} | null
    cp2?: {x: number; y: number} | null
  }[],
) {
  if (bezierPoints && bezierPoints.length > 0) {
    const bounds = getBoundingRectFromBezierPoints(bezierPoints.map((point) => ({
      anchor: point.anchor,
      cp1: point.cp1 ?? null,
      cp2: point.cp2 ?? null,
    })))

    return {
      x: bounds.x,
      y: bounds.y,
      width: Math.max(1, bounds.width),
      height: Math.max(1, bounds.height),
    }
  }

  if (!points || points.length === 0) {
    return null
  }

  const minX = Math.min(...points.map((point) => point.x))
  const minY = Math.min(...points.map((point) => point.y))
  const maxX = Math.max(...points.map((point) => point.x))
  const maxY = Math.max(...points.map((point) => point.y))

  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  }
}

function resolveShapePaint(
  sourceShape: EditorDocument['shapes'][number] | undefined,
) {
  const baseStroke = sourceShape?.stroke?.enabled === false
    ? 'transparent'
    : sourceShape?.stroke?.color ?? '#1f2937'
  const baseStrokeWidth = sourceShape?.stroke?.weight ?? 1
  const baseFill = sourceShape?.fill?.enabled === false
    ? 'transparent'
    : sourceShape?.fill?.color ?? 'rgba(17,24,39,0.05)'

  return {
    // Hover highlight is rendered by overlay chrome; keep node paint stable.
    fill: baseFill,
    fillConfig: {
      color: baseFill,
    },
    stroke: baseStroke,
    strokeWidth: baseStrokeWidth,
    strokeConfig: {
      color: baseStroke,
      width: baseStrokeWidth,
    },
  }
}

function resolveOrderedChildrenByParentId(
  document: EditorDocument,
  shapeOrder: readonly string[],
) {
  const shapeById = new Map(document.shapes.map((shape) => [shape.id, shape]))
  const childrenByParentId = new Map<string, RuntimeDocumentShape[]>()

  shapeOrder.forEach((shapeId) => {
    const shape = shapeById.get(shapeId)
    if (!shape) {
      return
    }

    const parentId = shape.parentId ?? null
    if (!parentId || !shapeById.has(parentId)) {
      return
    }

    const siblings = childrenByParentId.get(parentId)
    if (siblings) {
      siblings.push(shape)
      return
    }

    childrenByParentId.set(parentId, [shape])
  })

  document.shapes.forEach((shape) => {
    if ((shape.type !== 'group' && shape.type !== 'frame') || !shape.childIds) {
      return
    }

    const orderedChildren = shape.childIds
      .map((childId) => shapeById.get(childId))
      .filter((child): child is RuntimeDocumentShape => Boolean(child))
    const existingChildren = childrenByParentId.get(shape.id) ?? []
    existingChildren.forEach((child) => {
      if (!orderedChildren.some((candidate) => candidate.id === child.id)) {
        orderedChildren.push(child)
      }
    })
    childrenByParentId.set(shape.id, orderedChildren)
  })

  return childrenByParentId
}

function resolveTreeNodeUpsertIndex(input: {
  sourceShape: RuntimeDocumentShape
  parentShape: RuntimeDocumentShape | null
  childrenByParentId: Map<string, RuntimeDocumentShape[]>
  rootShapeIds: readonly string[]
  includeDocumentBackground?: boolean
}) {
  if (!input.parentShape) {
    const rootIndex = input.rootShapeIds.indexOf(input.sourceShape.id)
    if (rootIndex < 0) {
      return undefined
    }
    return rootIndex + (input.includeDocumentBackground === false ? 0 : 1)
  }

  const siblingIndex = (input.childrenByParentId.get(input.parentShape.id) ?? [])
    .findIndex((shape) => shape.id === input.sourceShape.id)
  if (siblingIndex < 0) {
    return undefined
  }

  return siblingIndex + (input.parentShape.type === 'frame' ? 1 : 0)
}

function filterTreePatchRootIds(
  changedIds: readonly string[],
  documentShapeById: Map<string, RuntimeDocumentShape>,
) {
  const changedIdSet = new Set(changedIds)
  return changedIds.filter((shapeId) => {
    let parentId = documentShapeById.get(shapeId)?.parentId ?? null
    while (parentId) {
      if (changedIdSet.has(parentId)) {
        return false
      }
      parentId = documentShapeById.get(parentId)?.parentId ?? null
    }
    return true
  })
}

function shouldIncludeTreeNode(
  id: string,
  includeShapeIdSet: Set<string> | null,
  childrenByParentId: Map<string, RuntimeDocumentShape[]>,
): boolean {
  if (!includeShapeIdSet) {
    return true
  }
  if (includeShapeIdSet.has(id)) {
    return true
  }

  return (childrenByParentId.get(id) ?? []).some((child) => (
    shouldIncludeTreeNode(child.id, includeShapeIdSet, childrenByParentId)
  ))
}

function snapshotFromDocumentShape(shape: RuntimeDocumentShape): SceneShapeSnapshot {
  return {
    id: shape.id,
    name: shape.name,
    type: shape.type,
    x: shape.x,
    y: shape.y,
    width: shape.width,
    height: shape.height,
    pathPointCount: shape.points?.length,
    pathBezierPointCount: shape.bezierPoints?.length,
    isHovered: false,
    isSelected: false,
  }
}

function resolveShapeClosed(
  sourceShape: EditorDocument['shapes'][number] | undefined,
  points?: readonly {x: number; y: number}[],
  bezierPoints?: readonly {
    anchor: {x: number; y: number}
    cp1?: {x: number; y: number} | null
    cp2?: {x: number; y: number} | null
  }[],
) {
  if (sourceShape?.type === 'polygon' || sourceShape?.type === 'star') {
    return true
  }

  const compare = (a: {x: number; y: number}, b: {x: number; y: number}) => {
    return Math.hypot(a.x - b.x, a.y - b.y) <= 1e-3
  }

  if (bezierPoints && bezierPoints.length >= 3) {
    return compare(bezierPoints[0].anchor, bezierPoints[bezierPoints.length - 1].anchor)
  }
  if (points && points.length >= 3) {
    return compare(points[0], points[points.length - 1])
  }

  return false
}

function resolveNodeShadow(
  sourceShape: EditorDocument['shapes'][number] | undefined,
) {
  if (sourceShape?.shadow?.enabled === false) {
    return undefined
  }
  if (!sourceShape?.shadow) {
    return undefined
  }

  return {
    color: sourceShape.shadow.color,
    offsetX: sourceShape.shadow.offsetX,
    offsetY: sourceShape.shadow.offsetY,
    blur: sourceShape.shadow.blur,
  }
}

function resolveNodeClip(
  sourceShape: EditorDocument['shapes'][number] | undefined,
  shapeById: Map<string, EditorDocument['shapes'][number]>,
) {
  if (!sourceShape?.clipPathId) {
    return undefined
  }

  if (!shapeById.has(sourceShape.clipPathId) || sourceShape.clipPathId === sourceShape.id) {
    return undefined
  }

  return {
    clipNodeId: sourceShape.clipPathId,
    rule: sourceShape.clipRule,
  }
}

function resolveSourceShapeBounds(
  sourceShape: EditorDocument['shapes'][number] | undefined,
) {
  if (!sourceShape) {
    return null
  }

  const resolved = resolveNodeTransform(sourceShape)
  return {
    x: resolved.bounds.minX,
    y: resolved.bounds.minY,
    width: resolved.bounds.width,
    height: resolved.bounds.height,
  }
}

function resolveSourceShapeTransform(
  sourceShape: RuntimeDocumentShape | undefined,
  parentShape?: RuntimeDocumentShape | null,
) {
  if (!sourceShape) {
    return undefined
  }

  if (parentShape !== undefined) {
    return resolveParentLocalEngineTransform(sourceShape, parentShape)
  }

  const resolved = resolveNodeTransform(sourceShape)
  const affine = resolved.matrix

  return {
    matrix: [
      affine[0],
      affine[2],
      affine[4],
      affine[1],
      affine[3],
      affine[5],
    ] as const,
  }
}
