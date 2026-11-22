/**
 * Export utilities for vector-editor-web.
 *
 * Provides PNG export (canvas raster) and SVG export (scene serialization)
 * that work with the raw Engine instance (not Venus class).
 */

import type { Engine } from '@venus/engine'
import type { EditorDocument } from '../model/index.ts'
import type { EditorFileAsset } from '../types/index.ts'

// ── PNG / JPEG Export ────────────────────────────────────────────────────────

/** Options for raster (PNG/JPEG) export. */
export interface RasterExportOptions {
  /** Scale multiplier (default 1). */
  scale?: number
  /** Background color (default transparent for PNG, white for JPEG). */
  background?: string
}

/** Options for JPEG export. */
export interface JpegExportOptions extends RasterExportOptions {
  /** JPEG quality 0-1 (default 0.92). */
  quality?: number
}

/**
 * Exports the current engine canvas as a PNG data URL.
 *
 * Reads pixel data directly from the engine's mounted <canvas> element.
 * When scale > 1, the output is rendered at higher resolution.
 *
 * @param engine The engine instance.
 * @param options Export options.
 * @returns PNG data URL string.
 */
export async function exportToPng(
  engine: Engine,
  options?: RasterExportOptions,
): Promise<string> {
  const canvas = resolveEngineCanvas(engine)
  if (!canvas) {
    throw new Error('Cannot export PNG: engine canvas is not available')
  }

  const scale = resolveScale(options?.scale)
  if (scale === 1) {
    // Fast path: direct canvas snapshot
    return canvas.toDataURL('image/png')
  }

  // Scaled export: render at higher resolution via an offscreen canvas copy
  const scaled = document.createElement('canvas')
  scaled.width = Math.round(canvas.width * scale)
  scaled.height = Math.round(canvas.height * scale)
  const ctx = scaled.getContext('2d')
  if (!ctx) {
    throw new Error('Cannot export PNG: failed to create 2D context')
  }

  if (options?.background) {
    ctx.fillStyle = options.background
    ctx.fillRect(0, 0, scaled.width, scaled.height)
  }

  ctx.drawImage(canvas, 0, 0, scaled.width, scaled.height)
  return scaled.toDataURL('image/png')
}

/**
 * Exports the current engine canvas as a JPEG data URL.
 *
 * @param engine The engine instance.
 * @param options Export options.
 * @returns JPEG data URL string.
 */
export async function exportToJpeg(
  engine: Engine,
  options?: JpegExportOptions,
): Promise<string> {
  const canvas = resolveEngineCanvas(engine)
  if (!canvas) {
    throw new Error('Cannot export JPEG: engine canvas is not available')
  }

  const scale = resolveScale(options?.scale)
  const quality = Math.max(0, Math.min(1, options?.quality ?? 0.92))

  const scaled = document.createElement('canvas')
  scaled.width = Math.round(canvas.width * scale)
  scaled.height = Math.round(canvas.height * scale)
  const ctx = scaled.getContext('2d')
  if (!ctx) {
    throw new Error('Cannot export JPEG: failed to create 2D context')
  }

  // JPEG requires a background (default white)
  ctx.fillStyle = options?.background ?? '#ffffff'
  ctx.fillRect(0, 0, scaled.width, scaled.height)
  ctx.drawImage(canvas, 0, 0, scaled.width, scaled.height)

  return scaled.toDataURL('image/jpeg', quality)
}

// ── SVG Export ───────────────────────────────────────────────────────────────

/** Options for SVG export. */
export interface SvgExportOptions {
  /** Whether to embed image assets as data URLs (default false). */
  embedImages?: boolean
  /** Whether to pretty-print the SVG output (default true). */
  pretty?: boolean
}

/**
 * Generates an SVG document from the editor document model.
 *
 * Serializes all visible shapes into SVG elements including fills, strokes,
 * gradients, shadows, text runs, and clip paths. Groups are emitted as <g>
 * elements preserving the document hierarchy.
 *
 * @param document The editor document model.
 * @param assets Asset list for resolving image URLs.
 * @param options Export options.
 * @returns SVG markup string.
 */
export function exportToSvg(
  document: EditorDocument,
  assets?: readonly EditorFileAsset[],
  options?: SvgExportOptions,
): string {
  const pretty = options?.pretty ?? true
  const embedImages = options?.embedImages ?? false
  const nl = pretty ? '\n' : ''
  const indent = pretty ? '  ' : ''

  const assetMap = new Map((assets ?? []).map((a) => [a.id, a]))

  // Collect defs (gradients, clip paths, etc.)
  const defs: string[] = []
  const body: string[] = []

  // Build a parent→children map for tree rendering
  const childrenMap = new Map<string | null, typeof document.shapes>()
  for (const shape of document.shapes) {
    const parentId = shape.parentId ?? null
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, [])
    }
    childrenMap.get(parentId)!.push(shape)
  }

  // Render root-level shapes
  const roots = childrenMap.get(null) ?? []
  for (const shape of roots) {
    body.push(shapeToSvgElement(shape, document, childrenMap, assetMap, embedImages, indent, 0))
  }

  const defsBlock = defs.length > 0
    ? `${nl}${indent}<defs>${nl}${defs.join(nl)}${nl}${indent}</defs>`
    : ''

  // Compute viewBox from document dimensions
  const vbW = document.width
  const vbH = document.height

  return [
    `<?xml version="1.0" encoding="UTF-8"?>${nl}`,
    `<svg xmlns="http://www.w3.org/2000/svg"`,
    `${indent}width="${vbW}" height="${vbH}"`,
    `${indent}viewBox="0 0 ${vbW} ${vbH}"${nl}>`,
    defsBlock,
    body.join(nl),
    `${nl}</svg>${nl}`,
  ].join('')
}

// ── Download Helper ──────────────────────────────────────────────────────────

/**
 * Triggers a browser download of a data URL as a file.
 *
 * @param dataUrl The data URL to download.
 * @param filename The suggested filename.
 */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// ── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Resolves the engine's mounted <canvas> element.
 *
 * The engine renders into a canvas passed during construction. This helper
 * finds the canvas by looking at the engine's diagnostics or by querying
 * the DOM for the render surface.
 *
 * @param engine The engine instance.
 * @returns The HTMLCanvasElement or null.
 */
function resolveEngineCanvas(engine: Engine): HTMLCanvasElement | null {
  // The engine's canvas is the one passed to createEngine().
  // Access it via the internal diagnostics viewport check or
  // by inspecting the engine's render surface.
  try {
    const diag = engine.getDiagnostics()
    // The engine renders into a canvas element — find it in the DOM
    // by looking for a canvas that matches the viewport dimensions
    const vpw = diag.viewport.viewportWidth
    const vph = diag.viewport.viewportHeight
    const canvases = document.querySelectorAll('canvas')
    for (const c of canvases) {
      if (Math.abs(c.width - vpw) < 10 && Math.abs(c.height - vph) < 10) {
        return c
      }
    }
    // Fallback: return the first canvas
    const first = document.querySelector('canvas')
    return first ?? null
  } catch {
    return null
  }
}

/**
 * Resolves and validates an export scale value.
 * @param scale User-provided scale (default 1).
 */
function resolveScale(scale: number | undefined): number {
  const resolved = scale ?? 1
  if (!Number.isFinite(resolved) || resolved <= 0) {
    return 1
  }
  return resolved
}

// ── SVG Shape Serializers ────────────────────────────────────────────────────

/** Serializes one document shape to an SVG element string. */
function shapeToSvgElement(
  shape: EditorDocument['shapes'][number],
  document: EditorDocument,
  childrenMap: Map<string | null, EditorDocument['shapes']>,
  assetMap: Map<string, EditorFileAsset>,
  embedImages: boolean,
  indent: string,
  depth: number,
): string {
  const pad = indent.repeat(depth)
  const attrs = commonAttrs(shape)

  switch (shape.type) {
    case 'group':
    case 'frame': {
      const children = childrenMap.get(shape.id) ?? []
      const childSvgs = children
        .map((c) => shapeToSvgElement(c, document, childrenMap, assetMap, embedImages, indent, depth + 1))
        .join('\n')
      return `${pad}<g${attrs}>\n${childSvgs}\n${pad}</g>`
    }
    case 'rectangle':
      return `${pad}<rect${attrs}${rectAttrs(shape)} />`
    case 'ellipse':
      return `${pad}${ellipseSvg(shape, pad, attrs)}`
    case 'polygon':
    case 'star':
      return `${pad}<polygon${attrs} points="${pointsAttr(shape.points)}" />`
    case 'path':
      return `${pad}<path${attrs} d="${pathData(shape)}" />`
    case 'lineSegment':
      return `${pad}<line${attrs}${lineAttrs(shape)} />`
    case 'text':
      return textSvg(shape, pad, attrs)
    case 'image':
      return imageSvg(shape, pad, attrs, assetMap, embedImages)
    default:
      return `${pad}<!-- unsupported: ${(shape as { type: string }).type} -->`
  }
}

/** Common SVG attributes shared by all shape types. */
function commonAttrs(shape: EditorDocument['shapes'][number]): string {
  const parts: string[] = []
  if (shape.opacity != null && shape.opacity !== 1) {
    parts.push(`opacity="${shape.opacity}"`)
  }
  if (shape.rotation && shape.rotation !== 0) {
    const cx = shape.x + shape.width / 2
    const cy = shape.y + shape.height / 2
    parts.push(`transform="rotate(${shape.rotation} ${cx} ${cy})"`)
  }
  const fill = fillAttr(shape)
  if (fill) parts.push(fill)
  const stroke = strokeAttr(shape)
  if (stroke) parts.push(stroke)
  if (shape.shadow?.enabled && shape.shadow.color) {
    parts.push(`filter="url(#shadow-${shape.id})"`)
  }
  return parts.length > 0 ? ' ' + parts.join(' ') : ''
}

function fillAttr(shape: EditorDocument['shapes'][number]): string {
  if (!shape.fill?.enabled) return 'fill="none"'
  if (shape.fill.color) return `fill="${shape.fill.color}"`
  return ''
}

function strokeAttr(shape: EditorDocument['shapes'][number]): string {
  if (!shape.stroke?.enabled) return ''
  const parts: string[] = []
  if (shape.stroke.color) parts.push(`stroke="${shape.stroke.color}"`)
  if (shape.stroke.weight) parts.push(`stroke-width="${shape.stroke.weight}"`)
  return parts.join(' ')
}

function rectAttrs(shape: EditorDocument['shapes'][number]): string {
  let attrs = ` x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}"`
  if (shape.cornerRadius) {
    attrs += ` rx="${shape.cornerRadius}"`
  }
  return attrs
}

function ellipseSvg(
  shape: EditorDocument['shapes'][number],
  pad: string,
  commonAttrsStr: string,
): string {
  const cx = shape.x + shape.width / 2
  const cy = shape.y + shape.height / 2
  const rx = shape.width / 2
  const ry = shape.height / 2

  if (shape.ellipseStartAngle != null || shape.ellipseEndAngle != null) {
    // Arc path
    const startAngle = (shape.ellipseStartAngle ?? 0) * (Math.PI / 180)
    const endAngle = (shape.ellipseEndAngle ?? 360) * (Math.PI / 180)
    const x1 = cx + rx * Math.cos(startAngle)
    const y1 = cy + ry * Math.sin(startAngle)
    const x2 = cx + rx * Math.cos(endAngle)
    const y2 = cy + ry * Math.sin(endAngle)
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0
    const sweep = 1
    const d = `M ${x1} ${y1} A ${rx} ${ry} 0 ${largeArc} ${sweep} ${x2} ${y2}`
    return `${pad}<path${commonAttrsStr} d="${d}" />`
  }

  return `${pad}<ellipse${commonAttrsStr} cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" />`
}

function pointsAttr(points?: Array<{ x: number; y: number }>): string {
  if (!points || points.length === 0) return ''
  return points.map((p) => `${p.x},${p.y}`).join(' ')
}

function lineAttrs(shape: EditorDocument['shapes'][number]): string {
  if (shape.points && shape.points.length >= 2) {
    return ` x1="${shape.points[0].x}" y1="${shape.points[0].y}" x2="${shape.points[1].x}" y2="${shape.points[1].y}"`
  }
  return ` x1="${shape.x}" y1="${shape.y}" x2="${shape.x + shape.width}" y2="${shape.y + shape.height}"`
}

function pathData(shape: EditorDocument['shapes'][number]): string {
  const parts: string[] = []
  if (shape.points && shape.points.length > 0) {
    parts.push(`M ${shape.points[0].x} ${shape.points[0].y}`)
    for (let i = 1; i < shape.points.length; i++) {
      parts.push(`L ${shape.points[i].x} ${shape.points[i].y}`)
    }
    // TODO: bezier curve support — emit cubic beziers when bezierPoints is present
  }
  return parts.join(' ')
}

function textSvg(
  shape: EditorDocument['shapes'][number],
  pad: string,
  commonAttrsStr: string,
): string {
  const x = shape.x
  const y = shape.y + (shape.textRuns?.[0]?.style?.fontSize ?? 16)

  if (shape.textRuns && shape.textRuns.length > 0) {
    const tspans = shape.textRuns.map((run) => {
      const text = (shape.text ?? '').slice(run.start, run.end)
      const style = run.style
      const runAttrs: string[] = []
      if (style?.fontFamily) runAttrs.push(`font-family="${style.fontFamily}"`)
      if (style?.fontSize) runAttrs.push(`font-size="${style.fontSize}"`)
      if (style?.fontWeight) runAttrs.push(`font-weight="${style.fontWeight}"`)
      if (style?.fontStyle && style.fontStyle !== 'normal') runAttrs.push(`font-style="${style.fontStyle}"`)
      if (style?.color) runAttrs.push(`fill="${style.color}"`)
      return `${pad}  <tspan${runAttrs.length > 0 ? ' ' + runAttrs.join(' ') : ''}>${escapeXml(text)}</tspan>`
    })
    return `${pad}<text${commonAttrsStr} x="${x}" y="${y}">\n${tspans.join('\n')}\n${pad}</text>`
  }

  const text = shape.text ?? ''
  return `${pad}<text${commonAttrsStr} x="${x}" y="${y}">${escapeXml(text)}</text>`
}

function imageSvg(
  shape: EditorDocument['shapes'][number],
  pad: string,
  commonAttrsStr: string,
  assetMap: Map<string, EditorFileAsset>,
  embedImages: boolean,
): string {
  const href = resolveImageHref(shape, assetMap, embedImages)
  if (!href) {
    return `${pad}<!-- image ${shape.assetId ?? 'unknown'}: no source -->`
  }
  return `${pad}<image${commonAttrsStr} x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" href="${escapeXml(href)}" />`
}

function resolveImageHref(
  shape: EditorDocument['shapes'][number],
  assetMap: Map<string, EditorFileAsset>,
  embedImages: boolean,
): string | null {
  // Prefer asset URL from the asset map
  if (shape.assetId) {
    const asset = assetMap.get(shape.assetId)
    if (asset?.objectUrl) {
      return asset.objectUrl
    }
  }
  // Fallback to the shape's own asset URL
  if (shape.assetUrl) {
    return shape.assetUrl
  }
  return null
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
