import {createSeededRandom} from '../seededRandom.ts'
import type {EditorFileDocument} from '../../types/index.ts'
import type {TemplateGeneratorContext, TemplatePresetDefinition} from '../types.ts'
import {
  buildVisionFile,
  createDeterministicId,
  createEllipseElement,
  createRectangleElement,
  createTextElement,
  randomPastelHex,
  resolveSeed,
  type GenerationState,
} from './generators.helpers.ts'

/**
 * Generates one wireframe-focused demo template.
 * @param preset Template preset metadata.
 * @param context Generator context containing optional seed.
 */
export function createWireframeDemo(
  preset: TemplatePresetDefinition,
  context: TemplateGeneratorContext,
): EditorFileDocument {
  const rng = createSeededRandom(resolveSeed(context.seed, 14001))
  const state: GenerationState = {nextId: 1}
  const elements = []

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
