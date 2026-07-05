/**
 * Export module implementation.
 *
 * The module consumes the mounted canvas for raster exports and the engine
 * scene snapshot for SVG exports. It intentionally stays independent from
 * renderer backends and editor document semantics.
 */
import type {
  EngineClipShape,
  EngineFillConfig,
  EngineGroupNode,
  EngineImageNode,
  EnginePaint,
  EnginePoint,
  EngineRect,
  EngineRenderableNode,
  EngineSceneSnapshot,
  EngineShapeNode,
  EngineStrokeConfig,
  EngineTextNode,
  EngineTextRun,
  EngineTransform2D,
  EngineVisualEffects,
} from '../../../../scene/types/types.ts'
import type {
  VenusExportApi,
  VenusJpegExportOptions,
  VenusPngExportOptions,
  VenusSvgExportOptions,
} from './api.ts'
import type { VenusModule, VenusModuleContext } from '../../Venus.ts'

/** Minimal shape of a Venus instance needed by the export module. */
interface ExportVenus {
  snapshot(): EngineSceneSnapshot
  _getMountedCanvas(): HTMLCanvasElement | null
}

/** Mutable state shared by one SVG serialization run. */
interface SvgExportContext {
  defs: string[]
  nextId: number
  options: {
    embedImages: boolean
    pretty: boolean
    viewBox?: EngineRect
  }
}

/** Normalizes raster scale and rejects values that would create invalid output canvases. */
function resolveExportScale(scale: number | undefined): number {
  const resolved = scale ?? 1
  if (!Number.isFinite(resolved) || resolved <= 0) {
    throw new Error('Export scale must be a positive finite number')
  }
  return resolved
}

/** Creates an offscreen canvas using the source canvas document. */
function createExportCanvas(source: HTMLCanvasElement, width: number, height: number): HTMLCanvasElement {
  const ownerDocument = source.ownerDocument ?? globalThis.document
  if (!ownerDocument?.createElement) {
    throw new Error('Cannot create export canvas in this environment')
  }

  const canvas = ownerDocument.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

/** Copies a mounted canvas into an optional scaled/background-filled export canvas. */
function createRasterExportCanvas(
  source: HTMLCanvasElement,
  options: { scale?: number; background?: string },
): HTMLCanvasElement {
  const scale = resolveExportScale(options.scale)
  const width = Math.max(1, Math.round(source.width * scale))
  const height = Math.max(1, Math.round(source.height * scale))
  const needsCopy = scale !== 1 || Boolean(options.background)

  if (!needsCopy) {
    return source
  }

  const canvas = createExportCanvas(source, width, height)
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Cannot create 2D context for export canvas')
  }

  if (options.background) {
    context.fillStyle = options.background
    context.fillRect(0, 0, width, height)
  }

  context.drawImage(source, 0, 0, width, height)
  return canvas
}

/** Clamps JPEG quality into the browser-supported [0, 1] range. */
function resolveJpegQuality(quality: number | undefined): number {
  if (quality === undefined) {
    return 0.92
  }
  if (!Number.isFinite(quality)) {
    throw new Error('JPEG quality must be a finite number')
  }
  return Math.max(0, Math.min(1, quality))
}

/** Escapes text for XML element content. */
function escapeXmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** Escapes text for XML attribute values. */
function escapeXmlAttribute(value: string): string {
  return escapeXmlText(value).replace(/"/g, '&quot;')
}

/** Creates one SVG attribute string when the value is present. */
function attr(name: string, value: string | number | boolean | null | undefined): string {
  if (value === undefined || value === null || value === false) {
    return ''
  }
  return ` ${name}="${escapeXmlAttribute(String(value))}"`
}

/** Formats a number compactly while avoiding scientific notation noise for normal canvas values. */
function num(value: number | undefined, fallback = 0): string {
  const resolved = Number.isFinite(value) ? value as number : fallback
  return Number.parseFloat(resolved.toFixed(4)).toString()
}

/** Returns whether a transform matrix is identity. */
function isIdentityTransform(transform: EngineTransform2D | undefined): boolean {
  const matrix = transform?.matrix
  return !matrix || (
    matrix[0] === 1
    && matrix[1] === 0
    && matrix[2] === 0
    && matrix[3] === 1
    && matrix[4] === 0
    && matrix[5] === 0
  )
}

/** Converts an engine transform matrix into an SVG matrix attribute. */
function transformAttr(transform: EngineTransform2D | undefined): string {
  if (isIdentityTransform(transform)) {
    return ''
  }
  const matrix = transform?.matrix ?? [1, 0, 0, 1, 0, 0]
  return attr('transform', `matrix(${matrix.map((value) => num(value)).join(' ')})`)
}

/** Resolves deprecated flat visual fields and structured visual fields into one object. */
function resolveVisual(node: EngineRenderableNode): EngineVisualEffects {
  return {
    opacity: node.visual?.opacity ?? node.opacity,
    blendMode: node.visual?.blendMode ?? node.blendMode,
    shadow: node.visual?.shadow ?? node.shadow,
    innerShadow: node.visual?.innerShadow ?? node.innerShadow,
    layerBlur: node.visual?.layerBlur ?? node.layerBlur,
  }
}

/** Adds an SVG definition and returns its generated id. */
function addDef(context: SvgExportContext, body: string, prefix: string): string {
  const id = `venus-${prefix}-${context.nextId++}`
  context.defs.push(body.replace(/__ID__/g, id))
  return id
}

/** Serializes node-level visual effects that have SVG equivalents. */
function visualAttrs(node: EngineRenderableNode, context: SvgExportContext): string {
  const visual = resolveVisual(node)
  const filterParts: string[] = []

  if (visual.shadow) {
    filterParts.push(
      `<feDropShadow dx="${num(visual.shadow.offsetX)}" dy="${num(visual.shadow.offsetY)}" stdDeviation="${num((visual.shadow.blur ?? 0) / 2)}" flood-color="${escapeXmlAttribute(visual.shadow.color ?? '#000000')}"/>`,
    )
  }

  if (visual.layerBlur && visual.layerBlur.amount > 0) {
    filterParts.push(`<feGaussianBlur stdDeviation="${num(visual.layerBlur.amount)}"/>`)
  }

  const filter = filterParts.length > 0
    ? attr('filter', `url(#${addDef(context, `<filter id="__ID__" x="-50%" y="-50%" width="200%" height="200%">${filterParts.join('')}</filter>`, 'filter')})`)
    : ''

  const blendStyle = visual.blendMode ? attr('style', `mix-blend-mode:${visual.blendMode}`) : ''
  return attr('opacity', visual.opacity) + blendStyle + filter
}

/** Serializes the first supported paint from a paint list. */
function paintValue(
  paints: readonly EnginePaint[] | undefined,
  fallback: string | undefined,
  context: SvgExportContext,
  prefix: 'fill' | 'stroke',
): string | undefined {
  const paint = paints?.[0]
  if (!paint) {
    return fallback
  }

  if (paint.type === 'solid') {
    return paint.color
  }

  const gradient = paint.gradient
  const stops = gradient.stops.map((stop) => (
    `<stop offset="${num(stop.offset * 100)}%" stop-color="${escapeXmlAttribute(stop.color)}"${attr('stop-opacity', stop.opacity)}/>`
  )).join('')

  const body = gradient.type === 'linear'
    ? `<linearGradient id="__ID__" gradientUnits="userSpaceOnUse" x1="${num(gradient.startX)}" y1="${num(gradient.startY)}" x2="${num(gradient.endX)}" y2="${num(gradient.endY)}">${stops}</linearGradient>`
    : `<radialGradient id="__ID__" gradientUnits="userSpaceOnUse" cx="${num(gradient.centerX)}" cy="${num(gradient.centerY)}" r="${num(gradient.radius)}">${stops}</radialGradient>`

  return `url(#${addDef(context, body, prefix)})`
}

/** Resolves fill attributes for a shape-like SVG element. */
function fillAttrs(
  fillConfig: EngineFillConfig | undefined,
  paints: readonly EnginePaint[] | undefined,
  color: string | undefined,
  context: SvgExportContext,
  fallback = 'none',
): string {
  return attr('fill', paintValue(fillConfig?.paints ?? paints, fillConfig?.color ?? color, context, 'fill') ?? fallback)
}

/** Resolves stroke attributes for a shape-like SVG element. */
function strokeAttrs(
  strokeConfig: EngineStrokeConfig | undefined,
  paints: readonly EnginePaint[] | undefined,
  color: string | undefined,
  width: number | undefined,
  node: Pick<EngineShapeNode, 'strokeDashArray' | 'strokeCap' | 'strokeJoin' | 'strokeStartArrowhead' | 'strokeEndArrowhead'>,
  context: SvgExportContext,
): string {
  const strokeWidth = strokeConfig?.width ?? width
  const stroke = paintValue(strokeConfig?.paints ?? paints, strokeConfig?.color ?? color, context, 'stroke')
  if (!stroke || strokeWidth === 0) {
    return attr('stroke', 'none')
  }

  const dashArray = strokeConfig?.dashArray ?? node.strokeDashArray
  return attr('stroke', stroke)
    + attr('stroke-width', strokeWidth)
    + attr('stroke-dasharray', dashArray?.join(' '))
    + attr('stroke-linecap', strokeConfig?.cap ?? node.strokeCap)
    + attr('stroke-linejoin', strokeConfig?.join ?? node.strokeJoin)
}

/** Converts point arrays into SVG point-list text. */
function pointsText(points: readonly EnginePoint[] | undefined): string {
  return (points ?? []).map((point) => `${num(point.x)},${num(point.y)}`).join(' ')
}

/** Serializes a point list as an SVG path data string. */
function pointPath(points: readonly EnginePoint[] | undefined, closed: boolean | undefined): string {
  if (!points || points.length === 0) {
    return ''
  }

  const [first, ...rest] = points
  const commands = [`M ${num(first.x)} ${num(first.y)}`]
  commands.push(...rest.map((point) => `L ${num(point.x)} ${num(point.y)}`))
  if (closed) {
    commands.push('Z')
  }
  return commands.join(' ')
}

/** Serializes anchor-point path geometry with cubic handles when present. */
function anchorPath(node: EngineShapeNode): string {
  const anchors = node.anchorPoints
  if (!anchors || anchors.length === 0) {
    return ''
  }

  const commands = [`M ${num(anchors[0].x)} ${num(anchors[0].y)}`]
  for (let index = 1; index < anchors.length; index += 1) {
    const previous = anchors[index - 1]
    const current = anchors[index]
    const cp1 = previous.cp2 ?? previous
    const cp2 = current.cp1 ?? current
    const hasCurve = cp1 !== previous || cp2 !== current
    commands.push(hasCurve
      ? `C ${num(cp1.x)} ${num(cp1.y)} ${num(cp2.x)} ${num(cp2.y)} ${num(current.x)} ${num(current.y)}`
      : `L ${num(current.x)} ${num(current.y)}`)
  }

  if (node.closed) {
    commands.push('Z')
  }
  return commands.join(' ')
}

/** Serializes bezier-point path geometry with cubic handles when present. */
function bezierPath(node: EngineShapeNode): string {
  const points = node.bezierPoints
  if (!points || points.length === 0) {
    return ''
  }

  const commands = [`M ${num(points[0].anchor.x)} ${num(points[0].anchor.y)}`]
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]
    const current = points[index]
    const cp1 = previous.cp2 ?? previous.anchor
    const cp2 = current.cp1 ?? current.anchor
    const hasCurve = cp1 !== previous.anchor || cp2 !== current.anchor
    commands.push(hasCurve
      ? `C ${num(cp1.x)} ${num(cp1.y)} ${num(cp2.x)} ${num(cp2.y)} ${num(current.anchor.x)} ${num(current.anchor.y)}`
      : `L ${num(current.anchor.x)} ${num(current.anchor.y)}`)
  }

  if (node.closed) {
    commands.push('Z')
  }
  return commands.join(' ')
}

/** Serializes per-corner rounded rectangle geometry as path data. */
function roundedRectPath(node: EngineShapeNode): string {
  const x = node.x ?? 0
  const y = node.y ?? 0
  const width = node.width ?? 0
  const height = node.height ?? 0
  const radii = node.cornerRadii
  const topLeft = Math.min(radii?.topLeft ?? node.cornerRadius ?? 0, width / 2, height / 2)
  const topRight = Math.min(radii?.topRight ?? node.cornerRadius ?? 0, width / 2, height / 2)
  const bottomRight = Math.min(radii?.bottomRight ?? node.cornerRadius ?? 0, width / 2, height / 2)
  const bottomLeft = Math.min(radii?.bottomLeft ?? node.cornerRadius ?? 0, width / 2, height / 2)

  return [
    `M ${num(x + topLeft)} ${num(y)}`,
    `H ${num(x + width - topRight)}`,
    topRight ? `A ${num(topRight)} ${num(topRight)} 0 0 1 ${num(x + width)} ${num(y + topRight)}` : '',
    `V ${num(y + height - bottomRight)}`,
    bottomRight ? `A ${num(bottomRight)} ${num(bottomRight)} 0 0 1 ${num(x + width - bottomRight)} ${num(y + height)}` : '',
    `H ${num(x + bottomLeft)}`,
    bottomLeft ? `A ${num(bottomLeft)} ${num(bottomLeft)} 0 0 1 ${num(x)} ${num(y + height - bottomLeft)}` : '',
    `V ${num(y + topLeft)}`,
    topLeft ? `A ${num(topLeft)} ${num(topLeft)} 0 0 1 ${num(x + topLeft)} ${num(y)}` : '',
    'Z',
  ].filter(Boolean).join(' ')
}

/** Serializes ellipse arcs and wedges as path data. */
function ellipseArcPath(node: EngineShapeNode): string {
  const geometry = node.ellipseGeometry
  const cx = geometry?.cx ?? (node.x ?? 0) + (node.width ?? 0) / 2
  const cy = geometry?.cy ?? (node.y ?? 0) + (node.height ?? 0) / 2
  const rx = geometry?.rx ?? (node.width ?? 0) / 2
  const ry = geometry?.ry ?? (node.height ?? 0) / 2
  const start = node.ellipseStartAngle ?? 0
  const end = node.ellipseEndAngle ?? 360
  const delta = Math.abs(end - start)
  const startRad = (start * Math.PI) / 180
  const endRad = (end * Math.PI) / 180
  const startPoint = { x: cx + rx * Math.cos(startRad), y: cy + ry * Math.sin(startRad) }
  const endPoint = { x: cx + rx * Math.cos(endRad), y: cy + ry * Math.sin(endRad) }
  const largeArc = delta % 360 > 180 ? 1 : 0

  if (node.ellipseDrawWedgeLine) {
    return `M ${num(cx)} ${num(cy)} L ${num(startPoint.x)} ${num(startPoint.y)} A ${num(rx)} ${num(ry)} 0 ${largeArc} 1 ${num(endPoint.x)} ${num(endPoint.y)} Z`
  }

  return `M ${num(startPoint.x)} ${num(startPoint.y)} A ${num(rx)} ${num(ry)} 0 ${largeArc} 1 ${num(endPoint.x)} ${num(endPoint.y)}`
}

/** Serializes inline clip metadata as an SVG clip-path attribute. */
function clipAttrs(node: EngineRenderableNode, context: SvgExportContext): string {
  const clipShape = node.clip?.clipShape
  if (!clipShape) {
    return ''
  }

  const body = clipShapeToSvg(clipShape)
  if (!body) {
    return ''
  }

  const id = addDef(context, `<clipPath id="__ID__">${body}</clipPath>`, 'clip')
  return attr('clip-path', `url(#${id})`)
}

/** Serializes one inline clip shape into SVG geometry. */
function clipShapeToSvg(clipShape: EngineClipShape): string {
  if (clipShape.kind === 'rect') {
    return `<rect${attr('x', clipShape.rect.x)}${attr('y', clipShape.rect.y)}${attr('width', clipShape.rect.width)}${attr('height', clipShape.rect.height)}${attr('rx', clipShape.radius)}/>`
  }

  const d = pointPath(clipShape.points, clipShape.closed)
  return d ? `<path${attr('d', d)}/>` : ''
}

/** Serializes common node attributes shared by all SVG renderable elements. */
function commonAttrs(node: EngineRenderableNode, context: SvgExportContext): string {
  return attr('id', node.id)
    + transformAttr(node.transform)
    + visualAttrs(node, context)
    + clipAttrs(node, context)
}

/** Serializes one shape node into SVG geometry. */
function shapeToSvg(node: EngineShapeNode, context: SvgExportContext): string {
  const fill = fillAttrs(node.fillConfig, node.fills, node.fill, context, node.shape === 'line' ? 'none' : undefined)
  const stroke = strokeAttrs(node.strokeConfig, node.strokes, node.stroke, node.strokeWidth, node, context)
  const common = commonAttrs(node, context)

  if (node.shape === 'rect') {
    if (node.cornerRadii) {
      return `<path${common}${attr('d', roundedRectPath(node))}${fill}${stroke}/>`
    }
    return `<rect${common}${attr('x', node.x ?? 0)}${attr('y', node.y ?? 0)}${attr('width', node.width ?? 0)}${attr('height', node.height ?? 0)}${attr('rx', node.cornerRadius)}${fill}${stroke}/>`
  }

  if (node.shape === 'ellipse') {
    const hasArc = node.ellipseStartAngle !== undefined || node.ellipseEndAngle !== undefined || node.ellipseDrawWedgeLine
    if (hasArc) {
      return `<path${common}${attr('d', ellipseArcPath(node))}${fill}${stroke}/>`
    }
    const geometry = node.ellipseGeometry
    const cx = geometry?.cx ?? (node.x ?? 0) + (node.width ?? 0) / 2
    const cy = geometry?.cy ?? (node.y ?? 0) + (node.height ?? 0) / 2
    const rx = geometry?.rx ?? (node.width ?? 0) / 2
    const ry = geometry?.ry ?? (node.height ?? 0) / 2
    return `<ellipse${common}${attr('cx', cx)}${attr('cy', cy)}${attr('rx', rx)}${attr('ry', ry)}${fill}${stroke}/>`
  }

  if (node.shape === 'line') {
    const start = node.points?.[0] ?? { x: node.x ?? 0, y: node.y ?? 0 }
    const end = node.points?.[node.points.length - 1] ?? { x: (node.x ?? 0) + (node.width ?? 0), y: (node.y ?? 0) + (node.height ?? 0) }
    return `<line${common}${attr('x1', start.x)}${attr('y1', start.y)}${attr('x2', end.x)}${attr('y2', end.y)}${stroke}/>`
  }

  if (node.shape === 'polygon') {
    return `<polygon${common}${attr('points', pointsText(node.points))}${fill}${stroke}/>`
  }

  const d = anchorPath(node) || bezierPath(node) || pointPath(node.points, node.closed)
  return `<path${common}${attr('d', d)}${fill}${stroke}/>`
}

/** Serializes text content into SVG text/tspan elements. */
function textToSvg(node: EngineTextNode, context: SvgExportContext): string {
  const style = node.style
  const fontSize = style.fontSize ?? 16
  const fill = fillAttrs(style.fillConfig, style.fills, style.fill, context, '#000000')
  const stroke = strokeAttrs(style.strokeConfig, undefined, style.stroke, style.strokeWidth, {}, context)
  const tspans = node.runs && node.runs.length > 0
    ? textRunsToSvgTspans(node, context)
    : plainTextToSvgTspans(node)

  return `<text${commonAttrs(node, context)}${attr('x', node.x)}${attr('y', node.y + fontSize)}${attr('font-family', style.fontFamily)}${attr('font-size', fontSize)}${attr('font-weight', style.fontWeight)}${attr('font-style', style.fontStyle)}${attr('letter-spacing', style.letterSpacing)}${fill}${stroke}>${tspans}</text>`
}

function plainTextToSvgTspans(node: EngineTextNode): string {
  const style = node.style
  const fontSize = style.fontSize ?? 16
  const text = node.text ?? ''
  const lines = text.split('\n')
  return lines.map((line, index) => (
    `<tspan${attr('x', node.x)}${attr('dy', index === 0 ? 0 : fontSize * (style.lineHeight ?? 1.2))}>${escapeXmlText(line)}</tspan>`
  )).join('')
}

function textRunsToSvgTspans(node: EngineTextNode, context: SvgExportContext): string {
  const style = node.style
  const lineAdvance = (style.fontSize ?? 16) * (style.lineHeight ?? 1.2)
  const tspans: string[] = []
  let wroteAnyTspan = false
  let pendingLineBreaks = 0

  node.runs?.forEach((run) => {
    const parts = run.text.split('\n')
    parts.forEach((part, index) => {
      if (index > 0) {
        pendingLineBreaks += 1
      }
      if (part.length === 0) {
        return
      }

      const position = !wroteAnyTspan || pendingLineBreaks > 0
        ? attr('x', node.x) + attr('dy', wroteAnyTspan ? pendingLineBreaks * lineAdvance : 0)
        : ''
      tspans.push(`<tspan${position}${textRunStyleAttrs(run.style, context)}>${escapeXmlText(part)}</tspan>`)
      wroteAnyTspan = true
      pendingLineBreaks = 0
    })
  })

  return tspans.join('')
}

function textRunStyleAttrs(style: EngineTextRun['style'], context: SvgExportContext): string {
  if (!style) {
    return ''
  }

  return attr('font-family', style.fontFamily)
    + attr('font-size', style.fontSize)
    + attr('font-weight', style.fontWeight)
    + attr('font-style', style.fontStyle)
    + attr('letter-spacing', style.letterSpacing)
    + textRunFillAttrs(style, context)
    + textRunStrokeAttrs(style, context)
}

function textRunFillAttrs(style: EngineTextRun['style'], context: SvgExportContext): string {
  return fillAttrs(style?.fillConfig, style?.fills, style?.fill, context, undefined)
}

function textRunStrokeAttrs(style: EngineTextRun['style'], context: SvgExportContext): string {
  if (!style) {
    return ''
  }

  const strokeWidth = style.strokeConfig?.width ?? style.strokeWidth
  const stroke = paintValue(style.strokeConfig?.paints, style.strokeConfig?.color ?? style.stroke, context, 'stroke')
  if (!stroke && strokeWidth === undefined) {
    return ''
  }
  if (!stroke || strokeWidth === 0) {
    return attr('stroke', 'none')
  }

  return attr('stroke', stroke) + attr('stroke-width', strokeWidth)
}

/**
 * Serializes an image node into an SVG image element.
 * @param node Image node to serialize.
 * @param context SVG serialization context and options.
 */
function imageToSvg(node: EngineImageNode, context: SvgExportContext): string {
  const href = node.assetUrl ?? (context.options.embedImages || /^(data:|https?:|blob:)/.test(node.assetId) ? node.assetId : '')
  return `<image${commonAttrs(node, context)}${attr('x', node.x)}${attr('y', node.y)}${attr('width', node.width)}${attr('height', node.height)}${attr('href', href)}${attr('data-asset-id', node.assetId)}${attr('data-asset-url', node.assetUrl)}/>`
}

/** Serializes a group node and its children. */
function groupToSvg(node: EngineGroupNode, context: SvgExportContext): string {
  const children = node.children.map((child) => nodeToSvg(child, context)).filter(Boolean).join('\n')
  return `<g${commonAttrs(node, context)}>\n${children}\n</g>`
}

/** Serializes one renderable node to SVG. */
function nodeToSvg(node: EngineRenderableNode, context: SvgExportContext): string {
  if (node.type === 'shape') {
    return shapeToSvg(node, context)
  }
  if (node.type === 'text') {
    return textToSvg(node, context)
  }
  if (node.type === 'image') {
    return imageToSvg(node, context)
  }
  return groupToSvg(node, context)
}

/** Serializes an engine scene snapshot into standalone SVG markup. */
function sceneToSvg(snapshot: EngineSceneSnapshot, options: VenusSvgExportOptions = {}): string {
  const context: SvgExportContext = {
    defs: [],
    nextId: 1,
    options: {
      embedImages: options.embedImages ?? false,
      pretty: options.pretty ?? true,
      viewBox: options.viewBox,
    },
  }
  const body = snapshot.nodes.map((node) => nodeToSvg(node, context)).filter(Boolean)
  const defs = context.defs.length > 0 ? [`<defs>`, ...context.defs, `</defs>`] : []
  const content = [...defs, ...body]
  const separator = context.options.pretty ? '\n  ' : ''
  const inner = content.length > 0 ? `${separator}${content.join(separator)}${context.options.pretty ? '\n' : ''}` : ''
  const viewBox = options.viewBox ?? {x: 0, y: 0, width: snapshot.width, height: snapshot.height}

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${num(viewBox.width)}" height="${num(viewBox.height)}" viewBox="${num(viewBox.x)} ${num(viewBox.y)} ${num(viewBox.width)} ${num(viewBox.height)}">${inner}</svg>`
}

/** Creates the export module definition. */
export function createVenusExportModule(): VenusModule {
  return {
    name: 'export' as const,

    install(context: VenusModuleContext): VenusExportApi {
      const venus = context.venus as ExportVenus
      const requireCanvas = () => {
        const canvas = venus._getMountedCanvas()
        if (!canvas) {
          throw new Error('Cannot export: Venus is not mounted to a canvas')
        }
        return canvas
      }

      return {
        async toPNG(options: VenusPngExportOptions = {}) {
          const canvas = createRasterExportCanvas(requireCanvas(), options)
          return canvas.toDataURL('image/png')
        },

        async toJPEG(options: VenusJpegExportOptions = {}) {
          const { background = '#ffffff' } = options
          const canvas = createRasterExportCanvas(requireCanvas(), {...options, background})
          return canvas.toDataURL('image/jpeg', resolveJpegQuality(options.quality))
        },

        async toSVG(options: VenusSvgExportOptions = {}) {
          return sceneToSvg(venus.snapshot(), options)
        },

        async toSVGSnapshot(snapshot: EngineSceneSnapshot, options: VenusSvgExportOptions = {}) {
          return sceneToSvg(snapshot, options)
        },
      }
    },
  }
}
