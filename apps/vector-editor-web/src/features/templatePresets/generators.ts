import {Unit} from '@venus/document-core'
import type {ElementProps, TextRun} from '@lite-u/editor/types'
import {VISION_VERSION} from '../../shared/constants/version.ts'
import type {VisionFileAsset, VisionFileType} from '../../editor/hooks/useEditorRuntime.types.ts'
import {createSeededRandom, type SeededRandom} from './seededRandom.ts'
import {getTemplatePresetById} from './presets.ts'
import type {
  TemplateFileGenerator,
  TemplateGeneratorContext,
  TemplatePresetDefinition,
} from './types.ts'

interface GenerationState {
  nextId: number
}

interface GridPoint {
  x: number
  y: number
}

const DEFAULT_PAGE = {
  unit: Unit.PX,
  width: 4096,
  height: 4096,
  dpi: 72,
}

const MIXED_IMAGE_ASSETS = createImageAssetPool('mixed', 12)
const IMAGE_HEAVY_ASSETS = createImageAssetPool('heavy', 24)

const PRESET_GENERATORS: Record<string, TemplateFileGenerator> = {
  'demo-basic-shapes': createBasicShapesDemo,
  'demo-welcome-board': createWelcomeBoardDemo,
  'demo-wireframe': createWireframeDemo,
  'test-text-dense': createLargeMixedTemplate,
  'test-deep-groups': createLargeMixedTemplate,
  'test-overlap-heavy': createLargeMixedTemplate,
  'mixed-10k': createLargeMixedTemplate,
  'mixed-50k': createLargeMixedTemplate,
  'mixed-100k': createLargeMixedTemplate,
  'test-sparse-large': createLargeMixedTemplate,
  'test-transform-batch': createLargeMixedTemplate,
  'images-1k': createImageHeavyTemplate,
  'images-10k': createImageHeavyTemplate,
}

export function generateTemplateFile(
  presetId: string,
  context: TemplateGeneratorContext = {},
): VisionFileType {
  const preset = getTemplatePresetById(presetId)
  if (!preset) {
    throw new Error(`template preset not found: ${presetId}`)
  }

  const generator = PRESET_GENERATORS[preset.id]
  if (!generator) {
    throw new Error(`template generator missing: ${preset.id}`)
  }

  return generator(preset, context)
}

function createBasicShapesDemo(
  preset: TemplatePresetDefinition,
  context: TemplateGeneratorContext,
): VisionFileType {
  const rng = createSeededRandom(resolveSeed(context.seed, 12001))
  const state: GenerationState = {nextId: 1}
  const fileId = createDeterministicId('tpl', preset.id, 0)

  const elements: ElementProps[] = []
  const childIds: string[] = []
  for (let index = 0; index < 6; index += 1) {
    const rect = createRectangleElement(state, {
      x: 180 + index * 120,
      y: 180,
      width: 92,
      height: 76,
      fill: randomPastelHex(rng),
      stroke: '#334155',
    })
    rect.parentId = 'group-demo-basic'
    elements.push(rect)
    childIds.push(rect.id)
  }

  elements.push(
    createGroupElement('group-demo-basic', {
      x: 150,
      y: 140,
      width: 760,
      height: 220,
      childIds,
      name: 'Top Row Group',
    }),
  )

  for (let index = 0; index < 6; index += 1) {
    elements.push(createEllipseElement(state, {
      x: 180 + index * 130,
      y: 420,
      width: 84,
      height: 84,
      fill: randomPastelHex(rng),
      stroke: '#0f172a',
    }))
  }

  for (let index = 0; index < 4; index += 1) {
    elements.push(createPathElement(state, {
      x: 170 + index * 220,
      y: 620,
      width: 160,
      height: 74,
      color: '#1d4ed8',
      rng,
    }))
  }

  const headlineText = 'Venus Template\nMulti-line Data\nA B C'
  elements.push(createTextElement(state, {
    x: 170,
    y: 92,
    width: 720,
    height: 128,
    text: headlineText,
    fill: '#0f172a',
    fontSize: 34,
    lineHeight: 42,
    textRuns: [
      {
        start: 0,
        end: 1,
        style: {
          fontSize: 46,
          fontWeight: 700,
          color: '#0f172a',
          shadow: {
            color: 'rgba(30, 64, 175, 0.45)',
            offsetX: 2,
            offsetY: 2,
            blur: 6,
          },
        },
      },
      {
        start: 1,
        end: 2,
        style: {
          fontSize: 24,
          fontWeight: 600,
          color: '#0f172a',
        },
      },
      {
        start: 2,
        end: 14,
        style: {
          fontSize: 34,
          fontWeight: 600,
          color: '#0f172a',
        },
      },
      {
        start: 15,
        end: 30,
        style: {
          fontSize: 24,
          color: '#1f2937',
        },
      },
      {
        start: 31,
        end: 36,
        style: {
          fontSize: 28,
          color: '#1e40af',
          shadow: {
            color: 'rgba(30, 64, 175, 0.35)',
            offsetX: 1,
            offsetY: 1,
            blur: 4,
          },
        },
      },
    ],
  }))

  elements.push(createTextElement(state, {
    x: 170,
    y: 740,
    width: 760,
    height: 32,
    text: 'Tip: drag-select the top group and test transform interactions.',
    fill: '#334155',
  }))

  return buildVisionFile({
    id: fileId,
    name: preset.label,
    width: 1280,
    height: 900,
    elements,
  })
}

function createWelcomeBoardDemo(
  preset: TemplatePresetDefinition,
  context: TemplateGeneratorContext,
): VisionFileType {
  const rng = createSeededRandom(resolveSeed(context.seed, 13001))
  const state: GenerationState = {nextId: 1}
  const elements: ElementProps[] = []

  elements.push(createRectangleElement(state, {
    x: 120,
    y: 120,
    width: 1440,
    height: 880,
    fill: '#f8fafc',
    stroke: '#cbd5e1',
  }))

  elements.push(createTextElement(state, {
    x: 180,
    y: 190,
    width: 900,
    height: 62,
    text: 'Welcome to Vector Template',
    fill: '#0f172a',
  }))

  for (let index = 0; index < 8; index += 1) {
    elements.push(createRectangleElement(state, {
      x: 180 + (index % 4) * 330,
      y: 320 + Math.floor(index / 4) * 220,
      width: 280,
      height: 160,
      fill: randomPastelHex(rng),
      stroke: '#334155',
    }))

    elements.push(createTextElement(state, {
      x: 198 + (index % 4) * 330,
      y: 360 + Math.floor(index / 4) * 220,
      width: 220,
      height: 26,
      text: `Card ${index + 1}`,
      fill: '#0f172a',
    }))
  }

  for (let index = 0; index < 6; index += 1) {
    elements.push(createPathElement(state, {
      x: 180 + index * 220,
      y: 790,
      width: 170,
      height: 90,
      color: '#0369a1',
      rng,
    }))
  }

  elements.push(createGroupElement('group-welcome-cards', {
    x: 160,
    y: 296,
    width: 1370,
    height: 458,
    childIds: elements
      .filter((element) => element.type === 'rectangle' || element.type === 'text')
      .slice(2)
      .map((element) => element.id),
    name: 'Card Section Group',
  }))

  return buildVisionFile({
    id: createDeterministicId('tpl', preset.id, 0),
    name: preset.label,
    width: 1800,
    height: 1200,
    elements,
  })
}

function createWireframeDemo(
  preset: TemplatePresetDefinition,
  context: TemplateGeneratorContext,
): VisionFileType {
  const rng = createSeededRandom(resolveSeed(context.seed, 14001))
  const state: GenerationState = {nextId: 1}
  const elements: ElementProps[] = []

  elements.push(createRectangleElement(state, {
    x: 80,
    y: 80,
    width: 1360,
    height: 880,
    fill: '#ffffff',
    stroke: '#94a3b8',
  }))

  elements.push(createRectangleElement(state, {
    x: 80,
    y: 80,
    width: 1360,
    height: 90,
    fill: '#e2e8f0',
    stroke: '#94a3b8',
  }))

  elements.push(createTextElement(state, {
    x: 124,
    y: 116,
    width: 300,
    height: 30,
    text: 'Wireframe Navigation',
    fill: '#1e293b',
  }))

  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      elements.push(createRectangleElement(state, {
        x: 130 + col * 430,
        y: 220 + row * 220,
        width: 360,
        height: 170,
        fill: randomPastelHex(rng),
        stroke: '#64748b',
      }))
      elements.push(createEllipseElement(state, {
        x: 156 + col * 430,
        y: 248 + row * 220,
        width: 36,
        height: 36,
        fill: '#475569',
        stroke: '#334155',
      }))
      elements.push(createTextElement(state, {
        x: 206 + col * 430,
        y: 258 + row * 220,
        width: 250,
        height: 26,
        text: `Module ${row * 3 + col + 1}`,
        fill: '#0f172a',
      }))
    }
  }

  return buildVisionFile({
    id: createDeterministicId('tpl', preset.id, 0),
    name: preset.label,
    width: 1600,
    height: 1100,
    elements,
  })
}

function createLargeMixedTemplate(
  preset: TemplatePresetDefinition,
  context: TemplateGeneratorContext,
): VisionFileType {
  const rng = createSeededRandom(resolveSeed(context.seed, preset.targetElementCount + 2017))
  const state: GenerationState = {nextId: 1}
  const elements: ElementProps[] = []
  const count = preset.targetElementCount
  const columns = Math.max(1, Math.ceil(Math.sqrt(count)))
  const cellSize = 92
  const sceneWidth = Math.max(4096, columns * cellSize + 360)
  const rows = Math.ceil(count / columns)
  const sceneHeight = Math.max(4096, rows * cellSize + 360)

  for (let index = 0; index < count; index += 1) {
    const point = resolveGridPoint(index, columns, cellSize, rng)
    const kind = index % 8

    if (kind === 0) {
      elements.push(createRectangleElement(state, {
        x: point.x,
        y: point.y,
        width: rng.nextInt(28, 108),
        height: rng.nextInt(22, 94),
        fill: randomPastelHex(rng),
        stroke: '#334155',
      }))
      continue
    }

    if (kind === 1) {
      elements.push(createEllipseElement(state, {
        x: point.x,
        y: point.y,
        width: rng.nextInt(26, 110),
        height: rng.nextInt(26, 116),
        fill: randomPastelHex(rng),
        stroke: '#1e293b',
      }))
      continue
    }

    if (kind === 2) {
      elements.push(createPathElement(state, {
        x: point.x,
        y: point.y,
        width: rng.nextInt(48, 140),
        height: rng.nextInt(20, 96),
        color: '#0f766e',
        rng,
      }))
      continue
    }

    if (kind === 3) {
      elements.push(createTextElement(state, {
        x: point.x,
        y: point.y,
        width: rng.nextInt(64, 180),
        height: 24,
        text: `N-${index}`,
        fill: '#111827',
      }))
      continue
    }

    if (kind === 4) {
      elements.push(createGroupElement(nextElementId(state, 'group'), {
        x: point.x,
        y: point.y,
        width: rng.nextInt(58, 180),
        height: rng.nextInt(58, 160),
        name: `Group ${index}`,
      }))
      continue
    }

    if (kind === 5) {
      elements.push(createImageElement(state, {
        x: point.x,
        y: point.y,
        width: rng.nextInt(34, 156),
        height: rng.nextInt(30, 170),
        assetId: rng.pick(MIXED_IMAGE_ASSETS).id,
        name: `Image ${index}`,
      }))
      continue
    }

    if (kind === 6) {
      elements.push(createRectangleElement(state, {
        x: point.x,
        y: point.y,
        width: rng.nextInt(36, 120),
        height: rng.nextInt(28, 106),
        fill: '#fef3c7',
        stroke: '#854d0e',
      }))
      continue
    }

    elements.push(createEllipseElement(state, {
      x: point.x,
      y: point.y,
      width: rng.nextInt(32, 120),
      height: rng.nextInt(18, 90),
      fill: '#ede9fe',
      stroke: '#4c1d95',
    }))
  }

  return buildVisionFile({
    id: createDeterministicId('tpl', preset.id, 0),
    name: preset.label,
    width: sceneWidth,
    height: sceneHeight,
    elements,
    assets: MIXED_IMAGE_ASSETS,
  })
}

function createImageHeavyTemplate(
  preset: TemplatePresetDefinition,
  context: TemplateGeneratorContext,
): VisionFileType {
  const rng = createSeededRandom(resolveSeed(context.seed, preset.targetElementCount + 4001))
  const state: GenerationState = {nextId: 1}
  const count = preset.targetElementCount
  const elements: ElementProps[] = []
  const sceneWidth = count <= 1000 ? 10000 : 30000
  const sceneHeight = count <= 1000 ? 10000 : 30000

  for (let index = 0; index < count; index += 1) {
    const width = rng.nextInt(22, 240)
    const height = rng.nextInt(18, 280)
    const x = rng.nextInt(24, Math.max(25, sceneWidth - width - 24))
    const y = rng.nextInt(24, Math.max(25, sceneHeight - height - 24))

    elements.push(createImageElement(state, {
      x,
      y,
      width,
      height,
      assetId: rng.pick(IMAGE_HEAVY_ASSETS).id,
      name: `Image-${index}`,
    }))
  }

  return buildVisionFile({
    id: createDeterministicId('tpl', preset.id, 0),
    name: preset.label,
    width: sceneWidth,
    height: sceneHeight,
    elements,
    assets: IMAGE_HEAVY_ASSETS,
  })
}

function resolveSeed(seed: number | undefined, fallback: number) {
  if (typeof seed === 'number' && Number.isFinite(seed)) {
    return seed
  }

  return fallback
}

function resolveGridPoint(
  index: number,
  columns: number,
  cellSize: number,
  rng: SeededRandom,
): GridPoint {
  const column = index % columns
  const row = Math.floor(index / columns)
  // Grid + jitter keeps elements spread over scene while avoiding strict visual bands.
  const jitterX = rng.nextInt(-14, 15)
  const jitterY = rng.nextInt(-14, 15)

  return {
    x: 120 + column * cellSize + jitterX,
    y: 120 + row * cellSize + jitterY,
  }
}

function buildVisionFile(options: {
  id: string
  name: string
  width: number
  height: number
  elements: ElementProps[]
  assets?: VisionFileAsset[]
}): VisionFileType {
  const now = Date.now()
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
    elements: options.elements,
    assets: options.assets ?? [],
  }
}

function nextElementId(state: GenerationState, prefix: string) {
  const value = state.nextId
  state.nextId += 1
  return `${prefix}-${String(value).padStart(7, '0')}`
}

function createDeterministicId(prefix: string, slug: string, index: number) {
  return `${prefix}-${slug}-${String(index).padStart(4, '0')}`
}

function createRectangleElement(
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

function createEllipseElement(
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

function createPathElement(
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

function createTextElement(
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

function createGroupElement(
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

function createImageElement(
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
    opacity: 1,
  }
}

function randomPastelHex(rng: SeededRandom) {
  const red = 160 + rng.nextInt(0, 80)
  const green = 160 + rng.nextInt(0, 80)
  const blue = 160 + rng.nextInt(0, 80)

  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`
}

function toHex(value: number) {
  return Math.max(0, Math.min(255, value)).toString(16).padStart(2, '0')
}

function createImageAssetPool(prefix: string, count: number): VisionFileAsset[] {
  const assets: VisionFileAsset[] = []

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
