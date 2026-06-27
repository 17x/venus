import {createEngine, type Engine} from '../createEngine/createEngine.ts'
import type {
  EngineShadow,
  EngineRenderableNode,
  EngineSceneSnapshot,
  EngineTextRun,
  EngineTransform2D,
} from '../../scene/types/types.ts'

type VenusBackend = 'canvas2d' | 'webgl' | 'auto'

export interface VenusParameters {
  culling?: boolean
  lod?: boolean
  render?: {
    backend?: VenusBackend
    antialias?: boolean
    quality?: 'interactive' | 'full'
  }
}

export interface VenusEventMap {
  mounted: {canvas: HTMLCanvasElement}
  'document:changed': {revision: number; node: EngineRenderableNode}
  resized: {width: number; height: number}
  'render:before': {revision: number}
  'render:after': {revision: number}
  hit: {point: {x: number; y: number}; result: ReturnType<Engine['hitTest']>}
  destroyed: {}
}

export type VenusEventName = keyof VenusEventMap
export type VenusEventHandler<TEventName extends VenusEventName = VenusEventName> = (event: VenusEventMap[TEventName]) => void

export type VenusTransformOrigin = {
  x: number
  y: number
  unit?: 'ratio' | 'px'
}

export type VenusTransform2D = {
  x?: number
  y?: number
  rotation?: number
  scaleX?: number
  scaleY?: number
  skewX?: number
  skewY?: number
  flipX?: boolean
  flipY?: boolean
  origin?: VenusTransformOrigin
}

type VenusTransformFields = {
  transform?: VenusTransform2D
  rotation?: number
  scaleX?: number
  scaleY?: number
  flipX?: boolean
  flipY?: boolean
  skewX?: number
  skewY?: number
}

type VenusNodeBase = {
  id?: string
  name?: string
  visible?: boolean
  locked?: boolean
  opacity?: number
  blendMode?: string
} & VenusTransformFields

export type VenusNode =
  | {
    type: 'rect' | 'ellipse'
    x?: number
    y?: number
    width: number
    height: number
    fill?: string
    stroke?: string
    strokeWidth?: number
    cornerRadius?: number
    cornerRadii?: {topLeft?: number; topRight?: number; bottomRight?: number; bottomLeft?: number}
    ellipseStartAngle?: number
    ellipseEndAngle?: number
    shadow?: EngineShadow
  } & VenusNodeBase
  | {
    type: 'line'
    x?: number
    y?: number
    width: number
    height: number
    stroke?: string
    strokeWidth?: number
    shadow?: EngineShadow
  } & VenusNodeBase
  | {
    type: 'text'
    x?: number
    y?: number
    width?: number
    height?: number
    text: string
    runs?: readonly EngineTextRun[]
    fill?: string
    fontSize?: number
    fontWeight?: number
    lineHeight?: number
    shadow?: EngineShadow
  } & VenusNodeBase
  | {
    type: 'group'
    x?: number
    y?: number
    shadow?: EngineShadow
    children: VenusNode[]
  } & VenusNodeBase
  | {
    type: 'clip' | 'mask'
    clipPath: VenusNode
    children: VenusNode[]
  } & VenusNodeBase

const DEGREES_TO_RADIANS = Math.PI / 180
const IDENTITY_TRANSFORM: EngineTransform2D['matrix'] = [1, 0, 0, 0, 1, 0]

const hasTransformFields = (node: VenusTransformFields) => {
  const transform = node.transform
  return Boolean(
    transform?.x ||
    transform?.y ||
    transform?.rotation ||
    transform?.scaleX !== undefined && transform.scaleX !== 1 ||
    transform?.scaleY !== undefined && transform.scaleY !== 1 ||
    transform?.flipX ||
    transform?.flipY ||
    transform?.skewX ||
    transform?.skewY ||
    transform?.origin ||
    node.rotation ||
    node.scaleX !== undefined && node.scaleX !== 1 ||
    node.scaleY !== undefined && node.scaleY !== 1 ||
    node.flipX ||
    node.flipY ||
    node.skewX ||
    node.skewY,
  )
}

const multiplyTransformMatrices = (
  left: EngineTransform2D['matrix'],
  right: EngineTransform2D['matrix'],
): EngineTransform2D['matrix'] => {
  const [la, lc, le, lb, ld, lf] = left
  const [ra, rc, re, rb, rd, rf] = right
  return [
    la * ra + lc * rb,
    la * rc + lc * rd,
    la * re + lc * rf + le,
    lb * ra + ld * rb,
    lb * rc + ld * rd,
    lb * re + ld * rf + lf,
  ]
}

const createVenusTransform = (
  node: VenusNodeBase,
  bounds?: {x: number; y: number; width: number; height: number},
): EngineTransform2D | undefined => {
  const transform = node.transform
  const translateX = transform?.x ?? ('x' in node && typeof node.x === 'number' ? node.x : 0)
  const translateY = transform?.y ?? ('y' in node && typeof node.y === 'number' ? node.y : 0)
  const hasTranslation = translateX !== 0 || translateY !== 0
  if (!hasTransformFields(node) && !hasTranslation) {
    return undefined
  }

  const origin = transform?.origin
  const centerX = bounds
    ? origin?.unit === 'px'
      ? bounds.x + origin.x
      : bounds.x + bounds.width * (origin?.x ?? 0.5)
    : 0
  const centerY = bounds
    ? origin?.unit === 'px'
      ? bounds.y + origin.y
      : bounds.y + bounds.height * (origin?.y ?? 0.5)
    : 0
  const rotation = (transform?.rotation ?? node.rotation ?? 0) * DEGREES_TO_RADIANS
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)
  const scaleX = (transform?.scaleX ?? node.scaleX ?? 1) * (transform?.flipX ?? node.flipX ? -1 : 1)
  const scaleY = (transform?.scaleY ?? node.scaleY ?? 1) * (transform?.flipY ?? node.flipY ? -1 : 1)
  const skewX = Math.tan((transform?.skewX ?? node.skewX ?? 0) * DEGREES_TO_RADIANS)
  const skewY = Math.tan((transform?.skewY ?? node.skewY ?? 0) * DEGREES_TO_RADIANS)
  const translateToCenter: EngineTransform2D['matrix'] = [1, 0, centerX + translateX, 0, 1, centerY + translateY]
  const translateFromCenter: EngineTransform2D['matrix'] = [1, 0, -centerX, 0, 1, -centerY]
  const rotateMatrix: EngineTransform2D['matrix'] = [cos, -sin, 0, sin, cos, 0]
  const skewMatrix: EngineTransform2D['matrix'] = [1, skewX, 0, skewY, 1, 0]
  const scaleMatrix: EngineTransform2D['matrix'] = [scaleX, 0, 0, 0, scaleY, 0]
  const matrix = [
    translateToCenter,
    rotateMatrix,
    skewMatrix,
    scaleMatrix,
    translateFromCenter,
  ].reduce(multiplyTransformMatrices, IDENTITY_TRANSFORM)

  return {matrix}
}

const createEmptySnapshot = (revision: number): EngineSceneSnapshot => {
  return {
    revision,
    width: 520,
    height: 320,
    nodes: [],
  }
}

const getNodeBounds = (node: VenusNode): {x: number; y: number; width: number; height: number} | null => {
  if (node.type === 'group') {
    return getChildrenBounds(node.children)
  }

  if (node.type === 'clip' || node.type === 'mask') {
    return getNodeBounds(node.clipPath) ?? getChildrenBounds(node.children)
  }

  if ('width' in node && typeof node.width === 'number' && 'height' in node && typeof node.height === 'number') {
    return {
      x: 'x' in node ? node.x ?? 0 : 0,
      y: 'y' in node ? node.y ?? 0 : 0,
      width: node.width,
      height: node.height,
    }
  }

  return null
}

const getChildrenBounds = (children: readonly VenusNode[]) => {
  const bounds = children.map(getNodeBounds).filter((childBounds): childBounds is {x: number; y: number; width: number; height: number} => Boolean(childBounds))
  if (bounds.length === 0) {
    return {x: 0, y: 0, width: 0, height: 0}
  }

  const minX = Math.min(...bounds.map((childBounds) => childBounds.x))
  const minY = Math.min(...bounds.map((childBounds) => childBounds.y))
  const maxX = Math.max(...bounds.map((childBounds) => childBounds.x + childBounds.width))
  const maxY = Math.max(...bounds.map((childBounds) => childBounds.y + childBounds.height))
  return {x: minX, y: minY, width: maxX - minX, height: maxY - minY}
}

const resolveNodeOpacity = (node: VenusNodeBase) => {
  return node.visible === false ? 0 : node.opacity
}

const toEngineNode = (node: VenusNode, fallbackId: string): EngineRenderableNode => {
  const id = node.id ?? fallbackId

  if (node.type === 'group') {
    return {
      id,
      type: 'group',
      opacity: resolveNodeOpacity(node),
      blendMode: node.blendMode,
      shadow: node.shadow,
      transform: createVenusTransform(node, getNodeBounds(node) ?? undefined),
      children: node.children.map((child, index) => toEngineNode(child, `${id}-child-${index}`)),
    }
  }

  if (node.type === 'clip' || node.type === 'mask') {
    const clipPathX = 'x' in node.clipPath ? node.clipPath.x ?? 0 : 0
    const clipPathY = 'y' in node.clipPath ? node.clipPath.y ?? 0 : 0
    const clipPathWidth = 'width' in node.clipPath && typeof node.clipPath.width === 'number' ? node.clipPath.width : 160
    const clipPathHeight = 'height' in node.clipPath && typeof node.clipPath.height === 'number' ? node.clipPath.height : 120

    return {
      id,
      type: 'group',
      opacity: resolveNodeOpacity(node),
      blendMode: node.blendMode,
      transform: createVenusTransform(node, getNodeBounds(node) ?? undefined),
      clip: {
        clipShape: {
          kind: 'rect',
          rect: {
            x: clipPathX,
            y: clipPathY,
            width: clipPathWidth,
            height: clipPathHeight,
          },
          radius: node.clipPath.type === 'ellipse'
            ? 999
            : node.clipPath.type === 'rect'
              ? node.clipPath.cornerRadius
              : undefined,
        },
      },
      children: node.children.map((child, index) => toEngineNode(child, `${id}-clip-child-${index}`)),
    }
  }

  if (node.type === 'text') {
    return {
      id,
      type: 'text',
      x: node.x ?? 0,
      y: node.y ?? 0,
      width: node.width,
      height: node.height,
      opacity: resolveNodeOpacity(node),
      blendMode: node.blendMode,
      transform: createVenusTransform(node, {x: node.x ?? 0, y: node.y ?? 0, width: node.width ?? 0, height: node.height ?? 0}),
      text: node.text,
      runs: node.runs,
      lineCount: node.text.split('\n').length,
      style: {
        fontFamily: 'Inter, ui-sans-serif, system-ui',
        fontSize: node.fontSize ?? 24,
        fontWeight: node.fontWeight ?? 700,
        lineHeight: node.lineHeight,
        fill: node.fill ?? '#0f172a',
        shadow: node.shadow,
      },
    }
  }

  if (node.type === 'line') {
    return {
      id,
      type: 'shape',
      shape: 'line',
      x: node.x ?? 0,
      y: node.y ?? 0,
      width: node.width,
      height: node.height,
      opacity: resolveNodeOpacity(node),
      blendMode: node.blendMode,
      shadow: node.shadow,
      transform: createVenusTransform(node, {x: node.x ?? 0, y: node.y ?? 0, width: node.width, height: node.height}),
      stroke: node.stroke ?? '#475569',
      strokeWidth: node.strokeWidth ?? 4,
    }
  }

  if (node.type === 'rect' || node.type === 'ellipse') {
    return {
      id,
      type: 'shape',
      shape: node.type,
      x: node.x ?? 0,
      y: node.y ?? 0,
      width: node.width,
      height: node.height,
      opacity: resolveNodeOpacity(node),
      blendMode: node.blendMode,
      shadow: node.shadow,
      transform: createVenusTransform(node, {x: node.x ?? 0, y: node.y ?? 0, width: node.width, height: node.height}),
      fill: node.fill,
      stroke: node.stroke,
      strokeWidth: node.strokeWidth,
      cornerRadius: node.type === 'rect' ? node.cornerRadius : undefined,
      cornerRadii: node.type === 'rect' ? node.cornerRadii : undefined,
      ellipseStartAngle: node.type === 'ellipse' ? node.ellipseStartAngle : undefined,
      ellipseEndAngle: node.type === 'ellipse' ? node.ellipseEndAngle : undefined,
    }
  }

  throw new Error(`unsupported Venus node type: ${node.type}`)
}

export class Venus {
  private readonly parameters: VenusParameters
  private canvas: HTMLCanvasElement | null = null
  private engine: Engine | null = null
  private nodes: EngineRenderableNode[] = []
  private documentNodes: VenusNode[] = []
  private readonly nodeById = new Map<string, VenusNode>()
  private readonly parentById = new Map<string, string | null>()
  private revision = 1
  private nodeIndex = 0
  private readonly listeners = new Map<VenusEventName, Set<VenusEventHandler>>()

  readonly document = {
    add: (node: VenusNode) => {
      const engineNode = toEngineNode(node, `node-${this.nodeIndex}`)
      this.nodeIndex += 1
      this.documentNodes = [...this.documentNodes, node]
      this.indexNodeTree(node, engineNode.id, null)
      this.nodes = [...this.nodes, engineNode]
      this.revision += 1
      this.emit('document:changed', {revision: this.revision, node: engineNode})
      return engineNode
    },
    bounds: () => ({x: 0, y: 0, width: 520, height: 320}),
    children: () => this.documentNodes,
    getNodeById: (id: string) => this.nodeById.get(id) ?? null,
    getParentId: (id: string) => this.parentById.get(id) ?? null,
    snapshot: () => this.createSnapshot(),
  }

  add(node: VenusNode) {
    return this.document.add(node)
  }

  readonly camera = {
    fitBounds: () => undefined,
    zoomTo: () => undefined,
    project: (point: {x: number, y: number}) => point,
    unproject: (point: {x: number, y: number}) => point,
  }

  readonly debug = {
    enable: () => undefined,
    inspect: () => this.engine?.getDiagnostics() ?? null,
  }

  constructor(parameters: VenusParameters = {}) {
    this.parameters = parameters
  }

  private indexNodeTree(node: VenusNode, fallbackId: string, parentId: string | null) {
    const id = node.id ?? fallbackId
    this.nodeById.set(id, node)
    this.parentById.set(id, parentId)

    if (node.type === 'group') {
      node.children.forEach((child, index) => this.indexNodeTree(child, child.id ?? `${id}-child-${index}`, id))
      return
    }

    if (node.type === 'clip' || node.type === 'mask') {
      this.indexNodeTree(node.clipPath, node.clipPath.id ?? `${id}-clip-path`, id)
      node.children.forEach((child, index) => this.indexNodeTree(child, child.id ?? `${id}-clip-child-${index}`, id))
    }
  }

  on<TEventName extends VenusEventName>(
    eventName: TEventName,
    handler: VenusEventHandler<TEventName>,
  ) {
    const handlers = this.listeners.get(eventName) ?? new Set<VenusEventHandler>()
    handlers.add(handler as VenusEventHandler)
    this.listeners.set(eventName, handlers)

    return () => this.off(eventName, handler)
  }

  off<TEventName extends VenusEventName>(
    eventName: TEventName,
    handler: VenusEventHandler<TEventName>,
  ) {
    const handlers = this.listeners.get(eventName)
    if (!handlers) {
      return
    }

    handlers.delete(handler as VenusEventHandler)
    if (handlers.size === 0) {
      this.listeners.delete(eventName)
    }
  }

  mount(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.engine = createEngine({
      canvas,
      initialScene: this.createSnapshot(),
      culling: this.parameters.culling ?? false,
      lod: this.parameters.lod ? {enabled: true} : {enabled: false},
      render: {
        backend: this.parameters.render?.backend === 'webgl' ? 'webgl' : 'canvas2d',
        quality: this.parameters.render?.quality ?? 'full',
        webglAntialias: this.parameters.render?.antialias ?? true,
      },
    })
    this.emit('mounted', {canvas})
  }

  resize(size: {width: number, height: number}) {
    if (!this.canvas || !this.engine) {
      return
    }

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
    this.canvas.width = Math.round(size.width * pixelRatio)
    this.canvas.height = Math.round(size.height * pixelRatio)
    this.engine.resize({
      viewportWidth: size.width,
      viewportHeight: size.height,
      outputWidth: this.canvas.width,
      outputHeight: this.canvas.height,
    })
    this.engine.setViewport({
      viewportWidth: size.width,
      viewportHeight: size.height,
      scale: Math.min(size.width / 520, size.height / 320) * 0.88,
      offsetX: size.width * 0.08,
      offsetY: size.height * 0.08,
    })
    this.emit('resized', size)
  }

  async render() {
    if (!this.engine) {
      return
    }

    this.emit('render:before', {revision: this.revision})
    this.engine.loadScene(this.createSnapshot())
    await this.engine.renderFrame()
    this.emit('render:after', {revision: this.revision})
  }

  hitTest(point: {x: number, y: number}) {
    const result = this.engine?.hitTest(point) ?? null
    this.emit('hit', {point, result})
    return result
  }

  animate() {
    return {
      cancel: () => undefined,
    }
  }

  snapshot() {
    return this.createSnapshot()
  }

  destroy() {
    this.engine?.dispose()
    this.engine = null
    this.canvas = null
    this.emit('destroyed', {})
    this.listeners.clear()
  }

  private createSnapshot(): EngineSceneSnapshot {
    return {
      ...createEmptySnapshot(this.revision),
      nodes: this.nodes,
    }
  }

  private emit<TEventName extends VenusEventName>(
    eventName: TEventName,
    event: VenusEventMap[TEventName],
  ) {
    const handlers = this.listeners.get(eventName)
    if (!handlers) {
      return
    }

    handlers.forEach((handler) => handler(event))
  }
}
