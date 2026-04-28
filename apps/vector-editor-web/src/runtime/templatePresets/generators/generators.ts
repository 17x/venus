import type {ElementProps} from '../../types/index.ts'
import type {EditorFileDocument} from '../../types/index.ts'
import {createSeededRandom} from '../seededRandom.ts'
import {getTemplatePresetById} from '../presets.ts'
import type {
  TemplateFileGenerator,
  TemplateGeneratorContext,
  TemplatePresetDefinition,
} from '../types.ts'
import {
  buildVisionFile,
  createDeterministicId,
  createEllipseElement,
  createGroupElement,
  createImageAssetPool,
  createImageElement,
  createPathElement,
  createRectangleElement,
  createTextElement,
  nextElementId,
  randomPastelHex,
  resolveGridPoint,
  resolveSeed,
  type GenerationState,
} from './generators.helpers.ts'
import {createWireframeDemo} from './generators.wireframe.ts'

const MIXED_IMAGE_ASSETS = createImageAssetPool('mixed', 12)
const IMAGE_HEAVY_ASSETS = createImageAssetPool('heavy', 24)

const PRESET_GENERATORS: Record<string, TemplateFileGenerator> = {
  'demo-basic-shapes': createBasicShapesDemo,
  'demo-welcome-board': createWelcomeBoardDemo,
  'demo-wireframe': createWireframeDemo,
  'test-text-dense': createTextDenseTemplate,
  'test-deep-groups': createLargeMixedTemplate,
  'test-overlap-heavy': createLargeMixedTemplate,
  'mixed-10k': createLargeMixedTemplate,
  'mixed-50k': createLargeMixedTemplate,
  'mixed-100k': createLargeMixedTemplate,
  'mixed-200k': createLargeMixedTemplate,
  'mixed-300k': createLargeMixedTemplate,
  'test-sparse-large': createLargeMixedTemplate,
  'test-transform-batch': createLargeMixedTemplate,
  'images-1k': createImageHeavyTemplate,
  'images-10k': createImageHeavyTemplate,
  'images-50k': createImageHeavyTemplate,
  'text-10k': createTextDenseTemplate,
}

export function generateTemplateFile(
  presetId: string,
  context: TemplateGeneratorContext = {},
): EditorFileDocument {
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
): EditorFileDocument {
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
): EditorFileDocument {
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

function createLargeMixedTemplate(
  preset: TemplatePresetDefinition,
  context: TemplateGeneratorContext,
): EditorFileDocument {
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
): EditorFileDocument {
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

function createTextDenseTemplate(
  preset: TemplatePresetDefinition,
  context: TemplateGeneratorContext,
): EditorFileDocument {
  const rng = createSeededRandom(resolveSeed(context.seed, preset.targetElementCount + 6001))
  const state: GenerationState = {nextId: 1}
  const count = preset.targetElementCount
  const elements: ElementProps[] = []
  const columns = Math.max(1, Math.ceil(Math.sqrt(count)))
  const cellSize = count > 5000 ? 78 : 92
  const sceneWidth = Math.max(4096, columns * cellSize + 320)
  const rows = Math.ceil(count / columns)
  const sceneHeight = Math.max(4096, rows * cellSize + 320)

  for (let index = 0; index < count; index += 1) {
    const point = resolveGridPoint(index, columns, cellSize, rng)
    const lineA = `Text-${index}`
    const lineB = `Node-${rng.nextInt(100, 999)}`
    const text = index % 5 === 0 ? `${lineA}\n${lineB}` : lineA
    const baseFontSize = index % 7 === 0 ? 16 : 13
    const lineHeight = Math.round(baseFontSize * 1.35)

    elements.push(createTextElement(state, {
      x: point.x,
      y: point.y,
      width: rng.nextInt(72, 180),
      height: text.includes('\n') ? lineHeight * 2 + 6 : lineHeight + 6,
      text,
      fill: '#111827',
      fontSize: baseFontSize,
      lineHeight,
    }))
  }

  return buildVisionFile({
    id: createDeterministicId('tpl', preset.id, 0),
    name: preset.label,
    width: sceneWidth,
    height: sceneHeight,
    elements,
  })
}

