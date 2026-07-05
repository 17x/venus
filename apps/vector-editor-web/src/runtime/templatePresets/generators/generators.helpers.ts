import {Unit} from '../../model/index.ts'
import type {ElementProps, TextRun} from '../../types/index.ts'
import {VISION_VERSION} from '../version.ts'
import type {EditorFileAsset, EditorFileDocument} from '../../types/index.ts'
import type {SeededRandom} from '../seededRandom.ts'

export interface GenerationState {
  nextId: number
}

export interface GridPoint {
  x: number
  y: number
}

const DEFAULT_PAGE = {
  unit: Unit.PX,
  width: 4096,
  height: 4096,
  dpi: 72,
}

export function resolveSeed(seed: number | undefined, fallback: number) {
  if (typeof seed === 'number' && Number.isFinite(seed)) {
    return seed
  }

  return fallback
}

export function resolveGridPoint(
  index: number,
  columns: number,
  cellSize: number,
  rng: SeededRandom,
): GridPoint {
  const column = index % columns
  const row = Math.floor(index / columns)
  const jitterX = rng.nextInt(-14, 15)
  const jitterY = rng.nextInt(-14, 15)

  return {
    x: 120 + column * cellSize + jitterX,
    y: 120 + row * cellSize + jitterY,
  }
}

export function buildVisionFile(options: {
  id: string
  name: string
  width: number
  height: number
  elements: ElementProps[]
  assets?: EditorFileAsset[]
}): EditorFileDocument {
  const now = Date.now()
  const elements = enrichElementsForDocumentModel(options.elements)

  return {
    id: options.id,
    name: options.name,
    version: VISION_VERSION,
    createdAt: now,
    updatedAt: now,
    config: {
      page: {
        ...DEFAULT_PAGE,
        width: options.width,
        height: options.height,
      },
    },
    elements,
    assets: options.assets ?? [],
  }
}

function enrichElementsForDocumentModel(elements: ElementProps[]): ElementProps[] {
  return elements.map((element, index) => {
    const next = {
      ...element,
      parentId: element.parentId ?? null,
      childIds:
        element.type === 'group'
          ? (element.childIds ?? [])
          : element.childIds,
      rotation: element.rotation ?? 0,
      flipX: element.flipX ?? false,
      flipY: element.flipY ?? false,
      opacity: element.opacity ?? 1,
      fill: element.fill ?? {
        enabled: element.type !== 'image' && element.type !== 'group',
        color: element.type === 'text' ? '#111827' : '#e2e8f0',
      },
      stroke: element.stroke ?? {
        enabled: element.type !== 'group',
        color: '#334155',
        weight: 1,
      },
      shadow: element.shadow ?? {
        enabled: false,
        color: 'rgba(15,23,42,0.24)',
        offsetX: 0,
        offsetY: 0,
        blur: 0,
      },
      cornerRadius:
        element.type === 'rectangle'
          ? (element.cornerRadius ?? 0)
          : element.cornerRadius,
      cornerRadii:
        element.type === 'rectangle'
          ? (element.cornerRadii ?? {
              topLeft: 0,
              topRight: 0,
              bottomRight: 0,
              bottomLeft: 0,
            })
          : element.cornerRadii,
      ellipseStartAngle:
        element.type === 'ellipse'
          ? (element.ellipseStartAngle ?? 0)
          : element.ellipseStartAngle,
      ellipseEndAngle:
        element.type === 'ellipse'
          ? (element.ellipseEndAngle ?? 360)
          : element.ellipseEndAngle,
      strokeStartArrowhead:
        (element.type === 'path' || element.type === 'lineSegment')
          ? (element.strokeStartArrowhead ?? 'none')
          : element.strokeStartArrowhead,
      strokeEndArrowhead:
        (element.type === 'path' || element.type === 'lineSegment')
          ? (element.strokeEndArrowhead ?? 'none')
          : element.strokeEndArrowhead,
      clipRule:
        element.clipPathId
          ? (element.clipRule ?? 'nonzero')
          : element.clipRule,
    } as ElementProps

    if (next.type === 'text') {
      const content = typeof next.text === 'string' ? next.text : next.name ?? ''
      next.text = content
      if (!next.textRuns || next.textRuns.length === 0) {
        next.textRuns = [{
          start: 0,
          end: content.length,
          style: {
            color: next.fill?.color ?? '#111827',
            fontFamily: 'Arial, sans-serif',
            fontSize: 16,
            fontWeight: 500,
            fontStyle: 'normal',
            lineHeight: 22,
            letterSpacing: 0,
          },
        }]
      }
    }

    if ((next.type === 'path' || next.type === 'lineSegment') && next.points && next.points.length >= 2 && !next.bezierPoints) {
      next.bezierPoints = next.points.map((point) => {
        const resolvedPoint = point as {x: number; y: number}
        return {
          anchor: {x: resolvedPoint.x, y: resolvedPoint.y},
        }
      })
    }

    if (next.type === 'rectangle' && next.fill?.enabled !== false && index % 17 === 0) {
      next.fill = {
        ...next.fill,
        gradient: {
          type: 'linear',
          angle: 135,
          stops: [
            {offset: 0, color: next.fill?.color ?? '#dbeafe'},
            {offset: 1, color: '#eff6ff'},
          ],
        },
      }
      next.shadow = {
        enabled: true,
        color: 'rgba(30,41,59,0.22)',
        offsetX: 0,
        offsetY: 5,
        blur: 10,
      }
    }

    if (next.type === 'ellipse' && next.fill?.enabled !== false && index % 23 === 0) {
      next.fill = {
        ...next.fill,
        gradient: {
          type: 'radial',
          centerX: 0.45,
          centerY: 0.45,
          radius: 0.8,
          stops: [
            {offset: 0, color: next.fill?.color ?? '#ede9fe'},
            {offset: 1, color: '#ddd6fe'},
          ],
        },
      }
    }

    return next
  })
}

export function nextElementId(state: GenerationState, prefix: string) {
  const value = state.nextId
  state.nextId += 1
  return `${prefix}-${String(value).padStart(7, '0')}`
}

export function createDeterministicId(prefix: string, slug: string, index: number) {
  return `${prefix}-${slug}-${String(index).padStart(4, '0')}`
}

export function createRectangleElement(
  state: GenerationState,
  input: {x: number; y: number; width: number; height: number; fill: string; stroke: string},
): ElementProps {
  return {
    id: nextElementId(state, 'rect'),
    type: 'rectangle',
    name: 'Rectangle',
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
    rotation: 0,
    fill: {
      enabled: true,
      color: input.fill,
    },
    stroke: {
      enabled: true,
      color: input.stroke,
      weight: 1,
    },
  }
}

export function createEllipseElement(
  state: GenerationState,
  input: {x: number; y: number; width: number; height: number; fill: string; stroke: string},
): ElementProps {
  return {
    id: nextElementId(state, 'ellipse'),
    type: 'ellipse',
    name: 'Ellipse',
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
    rotation: 0,
    fill: {
      enabled: true,
      color: input.fill,
    },
    stroke: {
      enabled: true,
      color: input.stroke,
      weight: 1,
    },
  }
}

export function createPathElement(
  state: GenerationState,
  input: {x: number; y: number; width: number; height: number; color: string; rng: SeededRandom},
): ElementProps {
  const startX = input.x
  const startY = input.y + input.rng.nextInt(0, Math.max(1, Math.floor(input.height * 0.5)))
  const midX = input.x + Math.floor(input.width * 0.5)
  const midY = input.y + input.rng.nextInt(0, input.height)
  const endX = input.x + input.width
  const endY = input.y + input.rng.nextInt(0, input.height)

  return {
    id: nextElementId(state, 'path'),
    type: 'path',
    name: 'Path',
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
    points: [
      {x: startX, y: startY},
      {x: midX, y: midY},
      {x: endX, y: endY},
    ],
    stroke: {
      enabled: true,
      color: input.color,
      weight: 1,
    },
    fill: {
      enabled: false,
      color: '#00000000',
    },
  }
}

export function createTextElement(
  state: GenerationState,
  input: {
    x: number
    y: number
    width: number
    height: number
    text: string
    fill: string
    fontSize?: number
    lineHeight?: number
    textRuns?: TextRun[]
  },
): ElementProps {
  const baseFontSize = input.fontSize ?? 18
  const baseLineHeight = input.lineHeight ?? Math.round(baseFontSize * 1.4)
  const textRuns = input.textRuns && input.textRuns.length > 0
    ? input.textRuns
    : [
        {
          start: 0,
          end: input.text.length,
          style: {
            color: input.fill,
            fontFamily: 'Arial, sans-serif',
            fontSize: baseFontSize,
            fontWeight: 500,
            lineHeight: baseLineHeight,
          },
        },
      ]

  return {
    id: nextElementId(state, 'text'),
    type: 'text',
    name: input.text,
    text: input.text,
    textRuns,
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
    fill: {
      enabled: true,
      color: input.fill,
    },
  }
}

export function createGroupElement(
  id: string,
  input: {x: number; y: number; width: number; height: number; childIds?: string[]; name?: string},
): ElementProps {
  return {
    id,
    type: 'group',
    name: input.name ?? 'Group',
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
    childIds: input.childIds,
  }
}

export function createImageElement(
  state: GenerationState,
  input: {x: number; y: number; width: number; height: number; assetId: string; name: string},
): ElementProps {
  return {
    id: nextElementId(state, 'image'),
    type: 'image',
    name: input.name,
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
    asset: input.assetId,
    naturalSize: {width: input.width, height: input.height},
    imageSmoothing: true,
    opacity: 1,
  }
}

export function randomPastelHex(rng: SeededRandom) {
  const red = 160 + rng.nextInt(0, 80)
  const green = 160 + rng.nextInt(0, 80)
  const blue = 160 + rng.nextInt(0, 80)

  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`
}

function toHex(value: number) {
  return Math.max(0, Math.min(255, value)).toString(16).padStart(2, '0')
}

export function createImageAssetPool(prefix: string, count: number): EditorFileAsset[] {
  const assets: EditorFileAsset[] = []

  for (let index = 0; index < count; index += 1) {
    const colorA = paletteHex((index * 37) % 360)
    const colorB = paletteHex((index * 37 + 45) % 360)
    const label = `${prefix.toUpperCase()}-${index + 1}`
    const data = createImageDataUrl(label, colorA, colorB)

    assets.push({
      id: `${prefix}-asset-${String(index + 1).padStart(4, '0')}`,
      name: `${prefix}-asset-${index + 1}.svg`,
      type: 'image',
      mimeType: 'image/svg+xml',
      objectUrl: data,
    })
  }

  return assets
}

function paletteHex(hue: number) {
  const saturation = 0.72
  const lightness = 0.56
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = lightness - chroma / 2

  let red = 0
  let green = 0
  let blue = 0

  if (hue < 60) {
    red = chroma
    green = x
  } else if (hue < 120) {
    red = x
    green = chroma
  } else if (hue < 180) {
    green = chroma
    blue = x
  } else if (hue < 240) {
    green = x
    blue = chroma
  } else if (hue < 300) {
    red = x
    blue = chroma
  } else {
    red = chroma
    blue = x
  }

  return `#${toHex(Math.round((red + m) * 255))}${toHex(Math.round((green + m) * 255))}${toHex(Math.round((blue + m) * 255))}`
}

function createImageDataUrl(label: string, colorA: string, colorB: string) {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240" viewBox="0 0 320 240">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${colorA}" />
      <stop offset="100%" stop-color="${colorB}" />
    </linearGradient>
  </defs>
  <rect width="320" height="240" rx="24" fill="url(#g)" />
  <circle cx="248" cy="72" r="28" fill="rgba(255,255,255,0.26)" />
  <path d="M0 164 C 74 116, 170 236, 320 144 L 320 240 L 0 240 Z" fill="rgba(15,23,42,0.22)" />
  <text x="20" y="118" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="white">${label}</text>
</svg>`.trim()

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
