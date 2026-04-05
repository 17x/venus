import * as React from 'react'
import {
  CanvasViewport,
  CanvasSelectionOverlay,
  createMarqueeState,
  getMarqueeNormalizedBounds,
  createSelectionDragController,
  createTransformSessionManager,
  resolveMarqueeBounds,
  resolveMarqueeSelection,
  updateMarqueeState,
  useTransformPreviewCommitState,
  useCanvasRuntimeSelector,
  useCanvasRuntimeStore,
  type CanvasRenderLodState,
  type CanvasOverlayProps,
  type MarqueeBounds,
  type MarqueeSelectionMode,
  type MarqueeState,
  type CanvasRuntimeStore,
  type CanvasRenderer,
  type CanvasViewportState,
} from '@venus/canvas-base'
import {
  convertDrawPointsToBezierPoints,
  getBoundingRectFromBezierPoints,
  nid,
  type Point,
} from '@venus/document-core'
import {
  Canvas2DRenderer,
  defaultCanvas2DLodConfig,
  useCanvas2DRenderDiagnostics,
  type Canvas2DLodConfig,
} from '@venus/renderer-canvas'
import type {EditorRuntimeCommand} from '@venus/editor-worker'
import type {HistorySummary} from '@venus/editor-worker'
import type {EditorDocument} from '@venus/document-core'
import type {SceneShapeSnapshot} from '@venus/shared-memory'
import {MOCK_DOCUMENT} from './mockDocument.ts'
import {createStressDocument} from './sceneGenerator.ts'
import './index.css'

const STRESS_SHAPE_COUNT = 100_000
const LARGE_STRESS_SHAPE_COUNT = 50_000
const MEDIUM_STRESS_SHAPE_COUNT = 10_000
const EXTREME_STRESS_SHAPE_COUNT = 1_000_000
const SHAPE_TYPE_ORDER = ['frame', 'group', 'rectangle', 'ellipse', 'polygon', 'star', 'lineSegment', 'path', 'text', 'image'] as const

function createGeneratedImageDataUrl(label: string, width: number, height: number) {
  const hue = Math.floor(Math.random() * 360)
  const accentHue = (hue + 42) % 360
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="hsl(${hue} 78% 72%)" />
          <stop offset="100%" stop-color="hsl(${accentHue} 82% 58%)" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" rx="28" fill="url(#bg)" />
      <circle cx="${Math.round(width * 0.78)}" cy="${Math.round(height * 0.28)}" r="${Math.round(Math.min(width, height) * 0.18)}" fill="rgba(255,255,255,0.28)" />
      <path d="M0 ${Math.round(height * 0.7)} C ${Math.round(width * 0.22)} ${Math.round(height * 0.48)}, ${Math.round(width * 0.48)} ${Math.round(height * 0.95)}, ${width} ${Math.round(height * 0.62)} L ${width} ${height} L 0 ${height} Z" fill="rgba(15,23,42,0.14)" />
      <text x="28" y="${Math.round(height * 0.45)}" font-family="Arial, sans-serif" font-size="${Math.max(18, Math.round(width * 0.12))}" font-weight="700" fill="white">${label}</text>
      <text x="28" y="${Math.round(height * 0.68)}" font-family="Arial, sans-serif" font-size="${Math.max(12, Math.round(width * 0.06))}" fill="rgba(255,255,255,0.88)">Generated in playground</text>
    </svg>
  `.trim()

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function createStarPoints(x: number, y: number, width: number, height: number) {
  const centerX = x + width / 2
  const centerY = y + height / 2
  const outerRadius = Math.min(width, height) / 2
  const innerRadius = outerRadius * 0.46

  return Array.from({length: 10}, (_, index) => {
    const angle = -Math.PI / 2 + (Math.PI / 5) * index
    const radius = index % 2 === 0 ? outerRadius : innerRadius
    return {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    }
  })
}

function createMockBezierPoints(x: number, y: number, width: number, height: number): Point[] {
  return [
    {x, y: y + height * 0.72},
    {x: x + width * 0.22, y: y + height * 0.18},
    {x: x + width * 0.48, y: y + height * 0.86},
    {x: x + width * 0.74, y: y + height * 0.28},
    {x: x + width, y: y + height * 0.66},
  ]
}

function createRandomMockShape() {
  const x = 80 + Math.round(Math.random() * 720)
  const y = 80 + Math.round(Math.random() * 420)
  const width = 120 + Math.round(Math.random() * 100)
  const height = 90 + Math.round(Math.random() * 80)

  if (Math.random() < 0.35) {
    const imageWidth = 180 + Math.round(Math.random() * 140)
    const imageHeight = 120 + Math.round(Math.random() * 100)
    const label = `Mock ${Math.floor(Math.random() * 100)}`

    return {
      id: nid(),
      type: 'image' as const,
      name: label,
      assetUrl: createGeneratedImageDataUrl(label, imageWidth, imageHeight),
      x,
      y,
      width: imageWidth,
      height: imageHeight,
    }
  }

  const shapeRoll = Math.random()
  const shapeType =
    shapeRoll < 0.2 ? 'polygon' as const :
      shapeRoll < 0.38 ? 'star' as const :
        shapeRoll < 0.56 ? 'path' as const :
          'rectangle' as const

  if (shapeType === 'path') {
    const points = createMockBezierPoints(x, y, width, height)
    const path = convertDrawPointsToBezierPoints(points, 0.24)
    const bounds = getBoundingRectFromBezierPoints(path.points)

    return {
      id: nid(),
      type: 'path' as const,
      name: `Bezier ${Math.floor(Math.random() * 100)}`,
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      points,
      bezierPoints: path.points,
    }
  }

  return {
    id: nid(),
    type: shapeType,
    name: `Shape ${Math.floor(Math.random() * 100)}`,
    x,
    y,
    width,
    height,
    points: shapeType === 'polygon'
      ? [
          {x: x + width * 0.5, y},
          {x: x + width, y: y + height * 0.34},
          {x: x + width * 0.82, y: y + height},
          {x: x + width * 0.18, y: y + height},
          {x, y: y + height * 0.34},
        ]
      : shapeType === 'star'
        ? createStarPoints(x, y, width, height)
      : undefined,
  }
}

function formatMetric(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function summarizeShapeTypes(document: EditorDocument) {
  const counts = new Map<string, number>()
  document.shapes.forEach((shape) => {
    counts.set(shape.type, (counts.get(shape.type) ?? 0) + 1)
  })

  return SHAPE_TYPE_ORDER
    .map((type) => ({
      type,
      count: counts.get(type) ?? 0,
    }))
    .filter((item) => item.count > 0)
}

function isPointInBounds(
  point: {x: number; y: number},
  bounds: {minX: number; minY: number; maxX: number; maxY: number},
) {
  return (
    point.x >= bounds.minX &&
    point.x <= bounds.maxX &&
    point.y >= bounds.minY &&
    point.y <= bounds.maxY
  )
}

type PlaygroundHandleKind =
  | 'move'
  | 'nw'
  | 'n'
  | 'ne'
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w'
  | 'rotate'

function buildSelectionHandles(
  bounds: {minX: number; minY: number; maxX: number; maxY: number},
  rotateOffset: number,
  rotateDegrees: number,
) {
  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerY = (bounds.minY + bounds.maxY) / 2
  const handles = [
    {kind: 'nw' as const, x: bounds.minX, y: bounds.minY},
    {kind: 'n' as const, x: centerX, y: bounds.minY},
    {kind: 'ne' as const, x: bounds.maxX, y: bounds.minY},
    {kind: 'e' as const, x: bounds.maxX, y: centerY},
    {kind: 'se' as const, x: bounds.maxX, y: bounds.maxY},
    {kind: 's' as const, x: centerX, y: bounds.maxY},
    {kind: 'sw' as const, x: bounds.minX, y: bounds.maxY},
    {kind: 'w' as const, x: bounds.minX, y: centerY},
    {kind: 'rotate' as const, x: centerX, y: bounds.minY - rotateOffset},
  ]

  if (Math.abs(rotateDegrees) <= 0.0001) {
    return handles
  }

  return handles.map((handle) => ({
    ...handle,
    ...rotatePointAround(
      {x: handle.x, y: handle.y},
      {x: centerX, y: centerY},
      rotateDegrees,
    ),
  }))
}

function pickHandleAtPoint(
  point: {x: number; y: number},
  handles: Array<{kind: PlaygroundHandleKind; x: number; y: number}>,
  tolerance: number,
) {
  for (const handle of handles) {
    if (Math.hypot(handle.x - point.x, handle.y - point.y) <= tolerance) {
      return handle
    }
  }

  return null
}

function rotatePointAround(
  point: {x: number; y: number},
  center: {x: number; y: number},
  degrees: number,
) {
  const radians = (degrees * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  const dx = point.x - center.x
  const dy = point.y - center.y

  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  }
}

function buildGroupAwarePreviewMap(
  document: EditorDocument,
  previewShapes: Array<{
    shapeId: string
    x: number
    y: number
    width: number
    height: number
    rotation?: number
  }>,
) {
  const previewById = new Map(previewShapes.map((shape) => [shape.shapeId, shape] as const))
  const childrenByParent = new Map<string, string[]>()

  document.shapes.forEach((shape) => {
    if (!shape.parentId) {
      return
    }
    const siblings = childrenByParent.get(shape.parentId) ?? []
    siblings.push(shape.id)
    childrenByParent.set(shape.parentId, siblings)
  })

  for (const previewShape of previewShapes) {
    const source = document.shapes.find((shape) => shape.id === previewShape.shapeId)
    if (!source || source.type !== 'group') {
      continue
    }

    const deltaX = previewShape.x - source.x
    const deltaY = previewShape.y - source.y
    if (Math.abs(deltaX) <= 0.0001 && Math.abs(deltaY) <= 0.0001) {
      continue
    }

    const queue = [...(childrenByParent.get(source.id) ?? [])]
    while (queue.length > 0) {
      const childId = queue.shift()!
      const child = document.shapes.find((shape) => shape.id === childId)
      if (!child) {
        continue
      }

      if (!previewById.has(child.id)) {
        previewById.set(child.id, {
          shapeId: child.id,
          x: child.x + deltaX,
          y: child.y + deltaY,
          width: child.width,
          height: child.height,
          rotation: child.rotation,
        })
      }

      const nested = childrenByParent.get(child.id)
      if (nested && nested.length > 0) {
        queue.push(...nested)
      }
    }
  }

  return previewById
}

function remapPoint(
  point: {x: number; y: number},
  source: {x: number; y: number; width: number; height: number},
  target: {x: number; y: number; width: number; height: number},
) {
  const scaleX = source.width === 0 ? 1 : target.width / source.width
  const scaleY = source.height === 0 ? 1 : target.height / source.height
  return {
    x: target.x + (point.x - source.x) * scaleX,
    y: target.y + (point.y - source.y) * scaleY,
  }
}

function applyPreviewGeometryToShape(
  shape: EditorDocument['shapes'][number],
  preview: {x: number; y: number; width: number; height: number; rotation?: number},
) {
  const source = {
    x: shape.x,
    y: shape.y,
    width: shape.width,
    height: shape.height,
  }
  const target = {
    x: preview.x,
    y: preview.y,
    width: preview.width,
    height: preview.height,
  }

  return {
    ...shape,
    x: preview.x,
    y: preview.y,
    width: preview.width,
    height: preview.height,
    rotation: typeof preview.rotation === 'number' ? preview.rotation : shape.rotation,
    points:
      (shape.type === 'path' || shape.type === 'polygon' || shape.type === 'star') && shape.points
        ? shape.points.map((point) => remapPoint(point, source, target))
        : shape.points,
    bezierPoints:
      shape.type === 'path' && shape.bezierPoints
        ? shape.bezierPoints.map((point) => ({
            anchor: remapPoint(point.anchor, source, target),
            cp1: point.cp1 ? remapPoint(point.cp1, source, target) : point.cp1,
            cp2: point.cp2 ? remapPoint(point.cp2, source, target) : point.cp2,
          }))
        : shape.bezierPoints,
  }
}

function App() {
  const [documentMode, setDocumentMode] = React.useState<'demo' | 'medium-stress' | 'large-stress' | 'stress' | 'extreme-stress' | 'image-heavy' | 'image-heavy-large'>('demo')
  const [mediumStressRevision, setMediumStressRevision] = React.useState(0)
  const [largeStressRevision, setLargeStressRevision] = React.useState(0)
  const [stressRevision, setStressRevision] = React.useState(0)
  const [extremeStressRevision, setExtremeStressRevision] = React.useState(0)
  const [imageHeavyRevision, setImageHeavyRevision] = React.useState(0)
  const [imageHeavyLargeRevision, setImageHeavyLargeRevision] = React.useState(0)
  const activeDocument = React.useMemo(() => {
    switch (documentMode) {
      case 'medium-stress':
        return createStressDocument(MEDIUM_STRESS_SHAPE_COUNT)
      case 'large-stress':
        return createStressDocument(LARGE_STRESS_SHAPE_COUNT)
      case 'stress':
        return createStressDocument(STRESS_SHAPE_COUNT)
      case 'extreme-stress':
        return createStressDocument(EXTREME_STRESS_SHAPE_COUNT)
      case 'image-heavy':
        return createStressDocument(MEDIUM_STRESS_SHAPE_COUNT, {imageDensity: 'high'})
      case 'image-heavy-large':
        return createStressDocument(LARGE_STRESS_SHAPE_COUNT, {imageDensity: 'high'})
      case 'demo':
      default:
        return MOCK_DOCUMENT
    }
  }, [
    documentMode,
    mediumStressRevision,
    largeStressRevision,
    stressRevision,
    extremeStressRevision,
    imageHeavyRevision,
    imageHeavyLargeRevision,
  ])
  const createWorker = React.useCallback(
    () => new Worker(new URL('./editor.worker.ts', import.meta.url), {type: 'module'}),
    [],
  )
  const runtimeOptions = React.useMemo(
    () => ({
      capacity: activeDocument.shapes.length + 16,
      createWorker,
      document: activeDocument,
      allowFrameSelection: false,
    }),
    [activeDocument, createWorker],
  )
  const runtimeStore = useCanvasRuntimeStore(runtimeOptions)
  const runtimeController = runtimeStore.controller
  const runtimeDocumentShapes = useCanvasRuntimeSelector(runtimeStore, (snapshot) => snapshot.document.shapes)
  const [renderLodState, setRenderLodState] = React.useState<CanvasRenderLodState | null>(null)
  const {
    preview: dragPreview,
    previewRef: dragPreviewRef,
    setPreview: setDragPreviewState,
    clearPreview: clearDragPreview,
    markCommitPending: markDragPreviewCommitPending,
  } = useTransformPreviewCommitState({
    documentShapes: runtimeDocumentShapes,
  })
  const [marquee, setMarquee] = React.useState<MarqueeState | null>(null)

  const dispatch = React.useCallback((command: EditorRuntimeCommand) => {
    runtimeController.dispatchCommand(command)
  }, [runtimeController])
  const handleLoadDemo = React.useCallback(() => {
    setDocumentMode('demo')
  }, [])
  const handleLoadStress = React.useCallback(() => {
    setStressRevision((current) => current + 1)
    setDocumentMode('stress')
  }, [])
  const handleLoadExtremeStress = React.useCallback(() => {
    setExtremeStressRevision((current) => current + 1)
    setDocumentMode('extreme-stress')
  }, [])
  const handleLoadMediumStress = React.useCallback(() => {
    setMediumStressRevision((current) => current + 1)
    setDocumentMode('medium-stress')
  }, [])
  const handleLoadLargeStress = React.useCallback(() => {
    setLargeStressRevision((current) => current + 1)
    setDocumentMode('large-stress')
  }, [])
  const handleLoadImageHeavy = React.useCallback(() => {
    setImageHeavyRevision((current) => current + 1)
    setDocumentMode('image-heavy')
  }, [])
  const handleLoadImageHeavyLarge = React.useCallback(() => {
    setImageHeavyLargeRevision((current) => current + 1)
    setDocumentMode('image-heavy-large')
  }, [])
  const dragControllerRef = React.useRef(createSelectionDragController({
    allowFrameSelection: false,
  }))
  const transformManagerRef = React.useRef(createTransformSessionManager())

  const resolveSelectedBounds = React.useCallback((snapshot: ReturnType<typeof runtimeController.getSnapshot>) => {
    const selectedNodes = snapshot.shapes
      .filter((shape) => shape.isSelected)
      .map((shape) => snapshot.document.shapes.find((item) => item.id === shape.id))
      .filter((shape): shape is NonNullable<typeof shape> => Boolean(shape))
    if (selectedNodes.length === 0) {
      return null
    }

    const first = selectedNodes[0]
    const initial = getMarqueeNormalizedBounds(first.x, first.y, first.width, first.height)
    return selectedNodes
      .slice(1)
      .map((shape) => getMarqueeNormalizedBounds(shape.x, shape.y, shape.width, shape.height))
      .reduce((acc, item) => ({
        minX: Math.min(acc.minX, item.minX),
        minY: Math.min(acc.minY, item.minY),
        maxX: Math.max(acc.maxX, item.maxX),
        maxY: Math.max(acc.maxY, item.maxY),
      }), initial)
  }, [runtimeController])

  const handlePointerMove = React.useCallback((pointer: { x: number; y: number }) => {
    const transformSession = transformManagerRef.current.getSession()
    if (transformSession) {
      runtimeController.clearHover()
      const preview = transformManagerRef.current.update(pointer)
      if (preview) {
        setDragPreviewState({
          shapes: preview.shapes.map((shape) => ({
            shapeId: shape.shapeId,
            x: shape.x,
            y: shape.y,
            width: shape.width,
            height: shape.height,
            rotation: shape.rotation,
          })),
        })
      }
      return
    }

    if (marquee) {
      runtimeController.clearHover()
      setMarquee((current) => (current ? updateMarqueeState(current, pointer) : current))
      return
    }

    const snapshot = runtimeController.getSnapshot()
    const dragMove = dragControllerRef.current.pointerMove(pointer, {
      document: snapshot.document,
      shapes: snapshot.shapes,
    })
    if ((dragMove.phase === 'started' || dragMove.phase === 'dragging') && dragMove.session) {
      runtimeController.clearHover()
      if (dragMove.phase === 'started') {
        const dragShapeIds = dragMove.session.shapes.map((shape) => shape.shapeId)
        const dragShapes = dragShapeIds
          .map((id) => snapshot.document.shapes.find((shape) => shape.id === id))
          .filter((shape): shape is NonNullable<typeof shape> => Boolean(shape))

        if (dragShapes.length > 0) {
          transformManagerRef.current.start({
            shapeIds: dragShapes.map((shape) => shape.id),
            shapes: dragShapes.map((shape) => ({
              shapeId: shape.id,
              x: shape.x,
              y: shape.y,
              width: Math.max(1, shape.width),
              height: Math.max(1, shape.height),
              rotation: shape.rotation ?? 0,
              centerX: shape.x + shape.width / 2,
              centerY: shape.y + shape.height / 2,
            })),
            handle: 'move',
            pointer: dragMove.session.start,
            startBounds: dragMove.session.bounds,
          })
          setDragPreviewState({
            shapes: dragShapes.map((shape) => ({
              shapeId: shape.id,
              x: shape.x,
              y: shape.y,
              width: Math.max(1, shape.width),
              height: Math.max(1, shape.height),
              rotation: shape.rotation ?? 0,
            })),
          })
        }
      }

      const preview = transformManagerRef.current.update(pointer)
      if (preview) {
        setDragPreviewState({
          shapes: preview.shapes.map((shape) => ({
            shapeId: shape.shapeId,
            x: shape.x,
            y: shape.y,
            width: shape.width,
            height: shape.height,
            rotation: shape.rotation,
          })),
        })
      }
      return
    }

    if (dragMove.phase === 'none') {
      setDragPreviewState(null)
    }
    if (dragMove.phase === 'pending') {
      runtimeController.clearHover()
      return
    }

    runtimeController.postPointer('pointermove', pointer)
  }, [clearDragPreview, marquee, runtimeController, setDragPreviewState])
  const handlePointerDown = React.useCallback((
    pointer: { x: number; y: number },
    modifiers?: {shiftKey: boolean; metaKey: boolean; ctrlKey: boolean},
  ) => {
    const snapshot = runtimeController.getSnapshot()
    const selectedNodes = snapshot.shapes
      .filter((shape) => shape.isSelected)
      .map((shape) => snapshot.document.shapes.find((item) => item.id === shape.id))
      .filter((shape): shape is NonNullable<typeof shape> => Boolean(shape))
    const selectedBounds = resolveSelectedBounds(snapshot)

    if (selectedBounds && selectedNodes.length > 0) {
      const singleSelectedRotation = selectedNodes.length === 1
        ? (selectedNodes[0].rotation ?? 0)
        : 0
      const handles = buildSelectionHandles(selectedBounds, 28, singleSelectedRotation)
      const handle = pickHandleAtPoint(pointer, handles, 6)
      if (handle) {
        dragControllerRef.current.clear()
        transformManagerRef.current.start({
          shapeIds: selectedNodes.map((shape) => shape.id),
          shapes: selectedNodes.map((shape) => ({
            shapeId: shape.id,
            x: shape.x,
            y: shape.y,
            width: Math.max(1, shape.width),
            height: Math.max(1, shape.height),
            rotation: shape.rotation ?? 0,
            centerX: shape.x + shape.width / 2,
            centerY: shape.y + shape.height / 2,
          })),
          handle: handle.kind,
          pointer,
          startBounds: selectedBounds,
        })
        setDragPreviewState({
          shapes: selectedNodes.map((shape) => ({
            shapeId: shape.id,
            x: shape.x,
            y: shape.y,
            width: Math.max(1, shape.width),
            height: Math.max(1, shape.height),
            rotation: shape.rotation ?? 0,
          })),
        })
        return
      }
    }

    if (selectedBounds && selectedNodes.length > 0 && isPointInBounds(pointer, selectedBounds)) {
      dragControllerRef.current.clear()
      transformManagerRef.current.start({
        shapeIds: selectedNodes.map((shape) => shape.id),
        shapes: selectedNodes.map((shape) => ({
          shapeId: shape.id,
          x: shape.x,
          y: shape.y,
          width: Math.max(1, shape.width),
          height: Math.max(1, shape.height),
          rotation: shape.rotation ?? 0,
          centerX: shape.x + shape.width / 2,
          centerY: shape.y + shape.height / 2,
        })),
        handle: 'move',
        pointer,
        startBounds: selectedBounds,
      })
      setDragPreviewState({
        shapes: selectedNodes.map((shape) => ({
          shapeId: shape.id,
          x: shape.x,
          y: shape.y,
          width: Math.max(1, shape.width),
          height: Math.max(1, shape.height),
          rotation: shape.rotation ?? 0,
        })),
      })
      return
    }

    const hoveredShape = snapshot.stats.hoveredIndex >= 0
      ? snapshot.shapes[snapshot.stats.hoveredIndex] ?? null
      : null
    const hasHit = dragControllerRef.current.pointerDown(pointer, {
      document: snapshot.document,
      shapes: snapshot.shapes,
    }, modifiers, {
      hitShapeId: hoveredShape?.id ?? null,
    })

    if (!hasHit) {
      dragControllerRef.current.clear()
      const marqueeMode: MarqueeSelectionMode = modifiers?.shiftKey
        ? 'add'
        : (modifiers?.metaKey || modifiers?.ctrlKey)
          ? 'toggle'
          : 'replace'
      runtimeController.clearHover()
      setMarquee(createMarqueeState(pointer, marqueeMode))
      return
    }

    runtimeController.postPointer('pointerdown', pointer, modifiers)
  }, [resolveSelectedBounds, runtimeController])
  const handlePointerUp = React.useCallback(() => {
    dragControllerRef.current.pointerUp()
    if (marquee) {
      const snapshot = runtimeController.getSnapshot()
      const bounds = resolveMarqueeBounds(marquee)
      const selectedIds = resolveMarqueeSelection(snapshot.document.shapes, bounds, {
        excludeShape: (shape) => shape.type === 'frame',
      })

      runtimeController.dispatchCommand({
        type: 'selection.set',
        shapeIds: selectedIds,
        mode: marquee.mode,
      })
      dragControllerRef.current.clear()
      setMarquee(null)
      return
    }

    const transformSession = transformManagerRef.current.commit()
    if (!transformSession) {
      clearDragPreview()
      return
    }

    const snapshot = runtimeController.getSnapshot()
    const preview = dragPreviewRef.current
    if (!preview) {
      clearDragPreview()
      return
    }

    const transformBatch: Array<{
      id: string
      from: {x: number; y: number; width: number; height: number; rotation: number}
      to: {x: number; y: number; width: number; height: number; rotation: number}
    }> = []
    preview.shapes.forEach((item) => {
      const shape = snapshot.document.shapes.find((candidate) => candidate.id === item.shapeId)
      if (!shape) {
        return
      }
      const nextRotation = typeof item.rotation === 'number' ? item.rotation : (shape.rotation ?? 0)
      const changed =
        shape.x !== item.x ||
        shape.y !== item.y ||
        shape.width !== item.width ||
        shape.height !== item.height ||
        (shape.rotation ?? 0) !== nextRotation
      if (!changed) {
        return
      }
      transformBatch.push({
        id: shape.id,
        from: {
          x: shape.x,
          y: shape.y,
          width: shape.width,
          height: shape.height,
          rotation: shape.rotation ?? 0,
        },
        to: {
          x: item.x,
          y: item.y,
          width: item.width,
          height: item.height,
          rotation: nextRotation,
        },
      })
    })
    if (transformBatch.length === 0) {
      clearDragPreview()
      return
    }
    runtimeController.dispatchCommand({
      type: 'shape.transform.batch',
      transforms: transformBatch,
    })
    markDragPreviewCommitPending()
  }, [clearDragPreview, dragPreviewRef, markDragPreviewCommitPending, marquee, runtimeController])
  const handlePointerLeave = React.useCallback(() => {
    clearDragPreview()
    setMarquee(null)
    dragControllerRef.current.clear()
    transformManagerRef.current.cancel()
    runtimeController.clearHover()
  }, [clearDragPreview, runtimeController])
  const marqueeBounds = React.useMemo<MarqueeBounds | null>(
    () => marquee ? resolveMarqueeBounds(marquee) : null,
    [marquee],
  )

  return (
    <main className="playground-shell">
      <PlaygroundSidebar
        runtimeStore={runtimeStore}
        documentMode={documentMode}
        renderLodState={renderLodState}
        onLoadDemo={handleLoadDemo}
        onLoadMediumStress={handleLoadMediumStress}
        onLoadLargeStress={handleLoadLargeStress}
        onLoadStress={handleLoadStress}
        onLoadExtremeStress={handleLoadExtremeStress}
        onLoadImageHeavy={handleLoadImageHeavy}
        onLoadImageHeavyLarge={handleLoadImageHeavyLarge}
        onDispatch={dispatch}
      />

      <PlaygroundStage
        runtimeStore={runtimeStore}
        canvasLodConfig={defaultCanvas2DLodConfig}
        onRenderLodChange={setRenderLodState}
        onDispatch={dispatch}
        dragPreview={dragPreview}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        marqueeBounds={marqueeBounds}
        onViewportChange={runtimeController.setViewport}
        onViewportPan={runtimeController.panViewport}
        onViewportResize={runtimeController.resizeViewport}
        onViewportZoom={runtimeController.zoomViewport}
      />
    </main>
  )
}

const PlaygroundSidebar = React.memo(function PlaygroundSidebar({
  runtimeStore,
  documentMode,
  renderLodState,
  onLoadDemo,
  onLoadMediumStress,
  onLoadLargeStress,
  onLoadStress,
  onLoadExtremeStress,
  onLoadImageHeavy,
  onLoadImageHeavyLarge,
  onDispatch,
}: {
  runtimeStore: CanvasRuntimeStore<EditorDocument>
  documentMode: 'demo' | 'medium-stress' | 'large-stress' | 'stress' | 'extreme-stress' | 'image-heavy' | 'image-heavy-large'
  renderLodState: CanvasRenderLodState | null
  onLoadDemo: () => void
  onLoadMediumStress: () => void
  onLoadLargeStress: () => void
  onLoadStress: () => void
  onLoadExtremeStress: () => void
  onLoadImageHeavy: () => void
  onLoadImageHeavyLarge: () => void
  onDispatch: (command: EditorRuntimeCommand) => void
}) {
  const document = useCanvasRuntimeSelector(runtimeStore, (snapshot) => snapshot.document)
  const stats = useCanvasRuntimeSelector(runtimeStore, (snapshot) => snapshot.stats)
  const history = useCanvasRuntimeSelector(runtimeStore, (snapshot) => snapshot.history)
  const viewport = useCanvasRuntimeSelector(runtimeStore, (snapshot) => snapshot.viewport)
  const ready = useCanvasRuntimeSelector(runtimeStore, (snapshot) => snapshot.ready)
  const sabSupported = useCanvasRuntimeSelector(runtimeStore, (snapshot) => snapshot.sabSupported)
  const shapes = useCanvasRuntimeSelector(runtimeStore, (snapshot) => snapshot.shapes)
  const selectedShape = stats.selectedIndex >= 0 ? shapes[stats.selectedIndex] ?? null : null
  const selectedNode = React.useMemo(
    () => (selectedShape ? document.shapes.find((shape) => shape.id === selectedShape.id) ?? null : null),
    [document, selectedShape],
  )
  const selectedLabel = selectedShape ? `${selectedShape.name} (${selectedShape.type})` : 'None'
  const scaleLabel = viewport.scale.toFixed(2)
  const typeSummary = React.useMemo(() => summarizeShapeTypes(document), [document])

  return (
    <aside className="playground-panel">
      <RuntimeIntroBlock documentMode={documentMode} />
      <LodBlock
        renderLodState={renderLodState}
      />
       <CommandsBlock
        onLoadDemo={onLoadDemo}
        onLoadMediumStress={onLoadMediumStress}
        onLoadLargeStress={onLoadLargeStress}
        onLoadStress={onLoadStress}
        onLoadExtremeStress={onLoadExtremeStress}
        onLoadImageHeavy={onLoadImageHeavy}
        onLoadImageHeavyLarge={onLoadImageHeavyLarge}
        onDispatch={onDispatch}
      />
      <DocumentBlock
        documentMode={documentMode}
        documentName={document.name}
        documentWidth={document.width}
        documentHeight={document.height}
        documentShapeCount={document.shapes.length}
        snapshotShapeCount={stats.shapeCount}
        version={stats.version}
        typeSummary={typeSummary}
      />
     
      <ViewportBlock
        ready={ready}
        sabSupported={sabSupported}
        scaleLabel={scaleLabel}
        selectedLabel={selectedLabel}
        viewport={viewport}
      />
      <SelectionBlock selectedShape={selectedShape} selectedNode={selectedNode} />
      <HistoryBlock history={history} />

      <RendererDiagnosticsPanel rendererBackend={rendererBackend} />
    </aside>
  )
})

const RuntimeIntroBlock = React.memo(function RuntimeIntroBlock({
  documentMode,
}: {
  documentMode: 'demo' | 'medium-stress' | 'large-stress' | 'stress' | 'extreme-stress' | 'image-heavy' | 'image-heavy-large'
}) {
  return (
    <div className="panel-block">
      <span className="panel-label">Runtime</span>
      <strong className="panel-title">
        Worker + SAB + Canvas2D
      </strong>
      <p className="panel-copy">
        Validate the shared runtime loop without product UI.
      </p>
      <div className="panel-badges">
        <span className="panel-badge">{documentMode}</span>
        <span className="panel-badge">canvas2d</span>
      </div>
    </div>
  )
})

const LodBlock = React.memo(function LodBlock({
  renderLodState,
}: {
  renderLodState: CanvasRenderLodState | null
}) {
  return (
    <div className="panel-block">
      <span className="panel-label">LOD</span>
      <div className="panel-row">
        <span>profile</span>
        <strong>balanced</strong>
      </div>
      <div className="panel-row">
        <span>level</span>
        <strong>{renderLodState ? renderLodState.level : '-'}</strong>
      </div>
      <div className="panel-row">
        <span>mode</span>
        <strong>{renderLodState ? renderLodState.renderQuality : '-'}</strong>
      </div>
      <div className="panel-row">
        <span>images</span>
        <strong>{renderLodState ? renderLodState.imageCount : '-'}</strong>
      </div>
    </div>
  )
})

const DocumentBlock = React.memo(function DocumentBlock({
  documentMode,
  documentName,
  documentWidth,
  documentHeight,
  documentShapeCount,
  snapshotShapeCount,
  version,
  typeSummary,
}: {
  documentMode: string
  documentName: string
  documentWidth: number
  documentHeight: number
  documentShapeCount: number
  snapshotShapeCount: number
  version: number
  typeSummary: Array<{type: string; count: number}>
}) {
  return (
    <div className="panel-block">
      <span className="panel-label">Document</span>
      <strong>{documentName}</strong>
      <div className="panel-stat-grid">
        <div className="panel-stat-card">
          <span>mode</span>
          <strong>{documentMode}</strong>
        </div>
        <div className="panel-stat-card">
          <span>size</span>
          <strong>{formatMetric(documentWidth)} x {formatMetric(documentHeight)}</strong>
        </div>
        <div className="panel-stat-card">
          <span>nodes</span>
          <strong>{documentShapeCount}</strong>
        </div>
        <div className="panel-stat-card">
          <span>snapshot</span>
          <strong>{snapshotShapeCount}</strong>
        </div>
      </div>
      <div className="panel-row">
        <span>version</span>
        <strong>{version}</strong>
      </div>
      <div className="panel-type-list">
        {typeSummary.map((item) => (
          <div key={item.type} className="panel-type-chip">
            <span>{item.type}</span>
            <strong>{item.count}</strong>
          </div>
        ))}
      </div>
    </div>
  )
})

const ViewportBlock = React.memo(function ViewportBlock({
  ready,
  sabSupported,
  scaleLabel,
  selectedLabel,
  viewport,
}: {
  ready: boolean
  sabSupported: boolean
  scaleLabel: string
  selectedLabel: string
  viewport: CanvasViewportState
}) {
  return (
    <div className="panel-block">
      <span className="panel-label">Viewport</span>
      <div className="panel-stat-grid">
        <div className="panel-stat-card">
          <span>ready</span>
          <strong>{String(ready)}</strong>
        </div>
        <div className="panel-stat-card">
          <span>SAB</span>
          <strong>{String(sabSupported)}</strong>
        </div>
        <div className="panel-stat-card">
          <span>scale</span>
          <strong>{scaleLabel}</strong>
        </div>
        <div className="panel-stat-card">
          <span>viewport</span>
          <strong>{formatMetric(viewport.viewportWidth)} x {formatMetric(viewport.viewportHeight)}</strong>
        </div>
      </div>
      <div className="panel-list-rows">
        <div className="panel-row">
          <span>translate</span>
          <strong>{formatMetric(viewport.matrix[2])}, {formatMetric(viewport.matrix[5])}</strong>
        </div>
        <div className="panel-row">
          <span>selected</span>
          <strong>{selectedLabel}</strong>
        </div>
      </div>
    </div>
  )
})

const SelectionBlock = React.memo(function SelectionBlock({
  selectedShape,
  selectedNode,
}: {
  selectedShape: SceneShapeSnapshot | null
  selectedNode: EditorDocument['shapes'][number] | null
}) {
  return (
    <div className="panel-block">
      <span className="panel-label">Selection</span>
      {!selectedShape || !selectedNode ? (
        <p className="panel-copy">No active selection.</p>
      ) : (
        <>
          <strong>{selectedNode.name}</strong>
          <div className="panel-stat-grid">
            <div className="panel-stat-card">
              <span>type</span>
              <strong>{selectedNode.type}</strong>
            </div>
            <div className="panel-stat-card">
              <span>flags</span>
              <strong>{selectedShape.isSelected ? 'selected' : 'idle'}</strong>
            </div>
            <div className="panel-stat-card">
              <span>origin</span>
              <strong>{formatMetric(selectedNode.x)}, {formatMetric(selectedNode.y)}</strong>
            </div>
            <div className="panel-stat-card">
              <span>size</span>
              <strong>{formatMetric(selectedNode.width)} x {formatMetric(selectedNode.height)}</strong>
            </div>
          </div>
          <div className="panel-list-rows">
            <div className="panel-row">
              <span>id</span>
              <strong>{selectedNode.id}</strong>
            </div>
            {selectedNode.text && (
              <div className="panel-row">
                <span>text</span>
                <strong>{selectedNode.text}</strong>
              </div>
            )}
            {selectedNode.assetUrl && (
              <div className="panel-row">
                <span>asset</span>
                <strong>embedded image</strong>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
})

const CommandsBlock = React.memo(function CommandsBlock({
  onLoadDemo,
  onLoadMediumStress,
  onLoadLargeStress,
  onLoadStress,
  onLoadExtremeStress,
  onLoadImageHeavy,
  onLoadImageHeavyLarge,
  onDispatch,
}: {
  onLoadDemo: () => void
  onLoadMediumStress: () => void
  onLoadLargeStress: () => void
  onLoadStress: () => void
  onLoadExtremeStress: () => void
  onLoadImageHeavy: () => void
  onLoadImageHeavyLarge: () => void
  onDispatch: (command: EditorRuntimeCommand) => void
}) {
  return (
    <div className="panel-block">
      <span className="panel-label">Commands</span>
      <div className="panel-actions">
        <button onClick={onLoadDemo}>Demo Scene</button>
        <button onClick={onLoadMediumStress}>10k Scene</button>
        <button onClick={onLoadLargeStress}>50k Scene</button>
        <button onClick={onLoadStress}>100k Scene</button>
        <button onClick={onLoadExtremeStress}>1000k Scene</button>
        <button onClick={onLoadImageHeavy}>10k Img+</button>
        <button onClick={onLoadImageHeavyLarge}>50k Img+</button>
        <button onClick={() => onDispatch({type: 'viewport.fit'})}>Fit</button>
        <button onClick={() => onDispatch({type: 'viewport.zoomIn'})}>Zoom In</button>
        <button onClick={() => onDispatch({type: 'viewport.zoomOut'})}>Zoom Out</button>
        <button onClick={() => onDispatch({type: 'shape.insert', shape: createRandomMockShape()})}>
          Insert Mock
        </button>
        <button onClick={() => onDispatch({type: 'history.undo'})}>Undo</button>
        <button onClick={() => onDispatch({type: 'history.redo'})}>Redo</button>
        <button onClick={() => onDispatch({type: 'selection.delete'})}>Delete Selected</button>
      </div>
    </div>
  )
})

const HistoryBlock = React.memo(function HistoryBlock({
  history,
}: {
  history: HistorySummary
}) {
  return (
    <div className="panel-block">
      <span className="panel-label">History</span>
      <ul className="panel-list">
        <li>entries: {history.entries.length}</li>
        <li>cursor: {history.cursor}</li>
        <li>canUndo: {String(history.canUndo)}</li>
        <li>canRedo: {String(history.canRedo)}</li>
      </ul>
    </div>
  )
})

const PlaygroundStage = React.memo(function PlaygroundStage({
  runtimeStore,
  canvasLodConfig,
  onRenderLodChange,
  onDispatch,
  dragPreview,
  onPointerMove,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  marqueeBounds,
  onViewportChange,
  onViewportPan,
  onViewportResize,
  onViewportZoom,
}: {
  runtimeStore: CanvasRuntimeStore<EditorDocument>
  canvasLodConfig: Canvas2DLodConfig
  onRenderLodChange: (lodState: CanvasRenderLodState) => void
  onDispatch: (command: EditorRuntimeCommand) => void
  dragPreview: {
    shapes: Array<{
      shapeId: string
      x: number
      y: number
      width: number
      height: number
      rotation?: number
    }>
  } | null
  onPointerMove: (pointer: { x: number; y: number }) => void
  onPointerDown: (
    pointer: { x: number; y: number },
    modifiers?: {shiftKey: boolean; metaKey: boolean; ctrlKey: boolean},
  ) => void
  onPointerUp: VoidFunction
  onPointerLeave: VoidFunction
  marqueeBounds: MarqueeBounds | null
  onViewportChange: (viewport: CanvasViewportState) => void
  onViewportPan: (deltaX: number, deltaY: number) => void
  onViewportResize: (width: number, height: number) => void
  onViewportZoom: (nextScale: number, anchor?: { x: number; y: number }) => void
}) {
  const stageRef = React.useRef<HTMLElement | null>(null)
  const contextMenuRef = React.useRef<HTMLDivElement | null>(null)
  const [showContextMenu, setShowContextMenu] = React.useState(false)
  const [contextMenuPosition, setContextMenuPosition] = React.useState<{x: number; y: number}>({x: 0, y: 0})
  const [resolvedContextMenuPosition, setResolvedContextMenuPosition] = React.useState<{x: number; y: number}>({
    x: 0,
    y: 0,
  })
  const document = useCanvasRuntimeSelector(runtimeStore, (snapshot) => snapshot.document)
  const shapes = useCanvasRuntimeSelector(runtimeStore, (snapshot) => snapshot.shapes)
  const stats = useCanvasRuntimeSelector(runtimeStore, (snapshot) => snapshot.stats)
  const viewport = useCanvasRuntimeSelector(runtimeStore, (snapshot) => snapshot.viewport)
  const renderDocument = React.useMemo(() => {
    if (!dragPreview) {
      return document
    }

    const previewById = buildGroupAwarePreviewMap(document, dragPreview.shapes)
    return {
      ...document,
      shapes: document.shapes.map((shape) => (
        previewById.has(shape.id)
          ? applyPreviewGeometryToShape(shape, {
              x: previewById.get(shape.id)?.x ?? shape.x,
              y: previewById.get(shape.id)?.y ?? shape.y,
              width: previewById.get(shape.id)?.width ?? shape.width,
              height: previewById.get(shape.id)?.height ?? shape.height,
              rotation: previewById.get(shape.id)?.rotation,
            })
          : shape
      )),
    }
  }, [document, dragPreview])
  const renderShapes = React.useMemo(() => {
    if (!dragPreview) {
      return shapes
    }

    const previewById = buildGroupAwarePreviewMap(document, dragPreview.shapes)
    return shapes.map((shape) => (
      previewById.has(shape.id)
        ? {
            ...shape,
            x: previewById.get(shape.id)?.x ?? shape.x,
            y: previewById.get(shape.id)?.y ?? shape.y,
            width: previewById.get(shape.id)?.width ?? shape.width,
            height: previewById.get(shape.id)?.height ?? shape.height,
          }
        : shape
    ))
  }, [document, shapes, dragPreview])

  const renderer = React.useMemo<CanvasRenderer>(() => {
    const Canvas2DWithLod: CanvasRenderer = (props) => (
      <Canvas2DRenderer {...props} lodConfig={canvasLodConfig} />
    )

    return Canvas2DWithLod
  }, [canvasLodConfig])
  const overlayRenderer = React.useMemo(() => {
    const activeMarqueeBounds = marqueeBounds

    return function PlaygroundOverlay(props: CanvasOverlayProps) {
      const marqueePolygon = activeMarqueeBounds
        ? [
            {x: activeMarqueeBounds.minX, y: activeMarqueeBounds.minY},
            {x: activeMarqueeBounds.maxX, y: activeMarqueeBounds.minY},
            {x: activeMarqueeBounds.maxX, y: activeMarqueeBounds.maxY},
            {x: activeMarqueeBounds.minX, y: activeMarqueeBounds.maxY},
          ].map((point) => ({
            x: props.viewport.matrix[0] * point.x + props.viewport.matrix[1] * point.y + props.viewport.matrix[2],
            y: props.viewport.matrix[3] * point.x + props.viewport.matrix[4] * point.y + props.viewport.matrix[5],
          }))
        : null

      return (
        <>
          <CanvasSelectionOverlay {...props} />
          {marqueePolygon && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                overflow: 'hidden',
              }}
            >
              <svg
                style={{
                  position: 'absolute',
                  inset: 0,
                }}
                width="100%"
                height="100%"
              >
                <polygon
                  points={marqueePolygon.map((point) => `${point.x},${point.y}`).join(' ')}
                  fill="rgba(37, 99, 235, 0.12)"
                  stroke="rgba(37, 99, 235, 0.95)"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                  strokeDasharray="4 3"
                />
              </svg>
            </div>
          )}
        </>
      )
    }
  }, [marqueeBounds])

  React.useLayoutEffect(() => {
    if (!showContextMenu) {
      return
    }

    const menu = contextMenuRef.current
    const stage = stageRef.current
    if (!menu || !stage) {
      setResolvedContextMenuPosition(contextMenuPosition)
      return
    }

    const menuWidth = menu.offsetWidth
    const menuHeight = menu.offsetHeight
    const maxX = Math.max(0, stage.clientWidth - menuWidth - 4)
    const maxY = Math.max(0, stage.clientHeight - menuHeight - 4)

    setResolvedContextMenuPosition({
      x: Math.min(Math.max(0, contextMenuPosition.x), maxX),
      y: Math.min(Math.max(0, contextMenuPosition.y), maxY),
    })
  }, [contextMenuPosition, showContextMenu])

  React.useEffect(() => {
    if (!showContextMenu) {
      return
    }
    const close = () => setShowContextMenu(false)
    window.addEventListener('pointerdown', close)
    return () => {
      window.removeEventListener('pointerdown', close)
    }
  }, [showContextMenu])

  return (
    <section
      ref={stageRef}
      className="playground-stage"
      onContextMenu={(event) => {
        event.preventDefault()
        const rect = stageRef.current?.getBoundingClientRect()
        if (!rect) {
          return
        }
        setContextMenuPosition({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        })
        setShowContextMenu(true)
      }}
    >
      <CanvasViewport
        document={renderDocument}
        renderer={renderer}
        overlayRenderer={overlayRenderer}
        shapes={renderShapes}
        stats={stats}
        viewport={viewport}
        onRenderLodChange={onRenderLodChange}
        onPointerMove={onPointerMove}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
        onViewportChange={onViewportChange}
        onViewportPan={onViewportPan}
        onViewportResize={onViewportResize}
        onViewportZoom={onViewportZoom}
      />
      {showContextMenu && (
        <div
          ref={contextMenuRef}
          style={{
            position: 'absolute',
            left: resolvedContextMenuPosition.x,
            top: resolvedContextMenuPosition.y,
            background: '#ffffff',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.14)',
            zIndex: 40,
            minWidth: 120,
            overflow: 'hidden',
          }}
          onPointerDown={(event) => {
            event.stopPropagation()
          }}
        >
          <ContextActionButton
            label="Fit"
            onClick={() => {
              onDispatch({type: 'viewport.fit'})
              setShowContextMenu(false)
            }}
          />
          <ContextActionButton
            label="Zoom In"
            onClick={() => {
              onDispatch({type: 'viewport.zoomIn'})
              setShowContextMenu(false)
            }}
          />
          <ContextActionButton
            label="Zoom Out"
            onClick={() => {
              onDispatch({type: 'viewport.zoomOut'})
              setShowContextMenu(false)
            }}
          />
          <ContextActionButton
            label="Delete Selection"
            onClick={() => {
              onDispatch({type: 'selection.delete'})
              setShowContextMenu(false)
            }}
          />
        </div>
      )}
    </section>
  )
})

function ContextActionButton({
  label,
  onClick,
}: {
  label: string
  onClick: VoidFunction
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        border: 0,
        background: 'transparent',
        textAlign: 'left',
        padding: '8px 10px',
        fontSize: 12,
        cursor: 'pointer',
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.background = '#f3f4f6'
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.background = 'transparent'
      }}
    >
      {label}
    </button>
  )
}

function RendererDiagnosticsPanel() {
  const canvas2dDiagnostics = useCanvas2DRenderDiagnostics()

  return (
    <div className="panel-block">
      <span className="panel-label">Renderer Cache</span>
      <div className="panel-stat-grid">
        <div className="panel-stat-card">
          <span>backend</span>
          <strong>canvas2d</strong>
        </div>
        <div className="panel-stat-card">
          <span>draws</span>
          <strong>{canvas2dDiagnostics.drawCount}</strong>
        </div>
        <div className="panel-stat-card">
          <span>visible</span>
          <strong>{canvas2dDiagnostics.visibleShapeCount}</strong>
        </div>
        <div className="panel-stat-card">
          <span>draw</span>
          <strong>{canvas2dDiagnostics.drawMs.toFixed(1)}ms</strong>
        </div>
      </div>
    </div>
  )
}

export default App
