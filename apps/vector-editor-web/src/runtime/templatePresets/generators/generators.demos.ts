/**
 * Demo-scene generators: basic shapes showcase and welcome board.
 *
 * These two generators are designed for quick onboarding — they produce small,
 * visually informative documents without heavy element counts.
 */
import type {ElementProps} from '../../types/index.ts'
import type {EditorFileDocument} from '../../types/index.ts'
import type {TemplatePresetDefinition, TemplateGeneratorContext} from '../types.ts'
import {createSeededRandom} from '../seededRandom.ts'
import {
  buildVisionFile,
  createDeterministicId,
  createEllipseElement,
  createGroupElement,
  createPathElement,
  createRectangleElement,
  createTextElement,
  randomPastelHex,
  resolveSeed,
  type GenerationState,
} from './generators.helpers.ts'

/**
 * Produces the "demo-basic-shapes" preset document: a top group of colored
 * rectangles, a row of ellipses, a row of random paths, and a headline text.
 * @param preset Preset metadata (id, label, dimensions).
 * @param context Optional seed override for deterministic variation.
 */
export function createBasicShapesDemo(
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

/**
 * Produces the "demo-welcome-board" preset: a full-bleed card grid with a
 * headline and a row of decorative paths at the bottom.
 * @param preset Preset metadata (id, label, dimensions).
 * @param context Optional seed override for deterministic variation.
 */
export function createWelcomeBoardDemo(
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
