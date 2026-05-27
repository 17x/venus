/**
 * Stress-test template generators: large mixed scene, image-heavy scene, and
 * text-dense scene.
 *
 * All three generators use seeded-random layout so benchmark runs are
 * deterministic across machines. Element counts are driven by
 * `preset.targetElementCount`.
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

// ---------------------------------------------------------------------------
// Shared asset pools (initialized once so that all preset variants share the
// same deterministic URL set)
// ---------------------------------------------------------------------------

/** 12-slot pool for mixed-element large scenes. */
export const MIXED_IMAGE_ASSETS = createImageAssetPool('mixed', 12)

/** 24-slot pool for image-heavy stress scenes. */
export const IMAGE_HEAVY_ASSETS = createImageAssetPool('heavy', 24)

// ---------------------------------------------------------------------------
// Large mixed-element template
// ---------------------------------------------------------------------------

/**
 * Produces a large scene with 8 element types (rect / ellipse / path / text /
 * group / image / tinted-rect / ellipse-alt) distributed in a grid layout.
 * Used by mixed-*, test-deep-groups, test-overlap-heavy, test-sparse-large,
 * and test-transform-batch presets.
 * @param preset Preset metadata including `targetElementCount`.
 * @param context Optional seed override for deterministic variation.
 */
export function createLargeMixedTemplate(
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
    // Cycle through 8 element kinds to ensure type diversity at any scale.
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

// ---------------------------------------------------------------------------
// Image-heavy template
// ---------------------------------------------------------------------------

/**
 * Produces a scene filled exclusively with image elements placed at random
 * positions. Designed to stress-test image rendering throughput.
 * @param preset Preset metadata including `targetElementCount`.
 * @param context Optional seed override for deterministic variation.
 */
export function createImageHeavyTemplate(
  preset: TemplatePresetDefinition,
  context: TemplateGeneratorContext,
): EditorFileDocument {
  const rng = createSeededRandom(resolveSeed(context.seed, preset.targetElementCount + 4001))
  const state: GenerationState = {nextId: 1}
  const count = preset.targetElementCount
  const elements: ElementProps[] = []
  // Larger scenes need more canvas space to avoid severe overlap.
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

// ---------------------------------------------------------------------------
// Text-dense template
// ---------------------------------------------------------------------------

/**
 * Produces a grid-layout scene of text-only elements, some with two-line
 * content. Used to stress-test text layout and caching paths.
 * @param preset Preset metadata including `targetElementCount`.
 * @param context Optional seed override for deterministic variation.
 */
export function createTextDenseTemplate(
  preset: TemplatePresetDefinition,
  context: TemplateGeneratorContext,
): EditorFileDocument {
  const rng = createSeededRandom(resolveSeed(context.seed, preset.targetElementCount + 6001))
  const state: GenerationState = {nextId: 1}
  const count = preset.targetElementCount
  const elements: ElementProps[] = []
  const columns = Math.max(1, Math.ceil(Math.sqrt(count)))
  // Tighter grid spacing for very large text scenes.
  const cellSize = count > 5000 ? 78 : 92
  const sceneWidth = Math.max(4096, columns * cellSize + 320)
  const rows = Math.ceil(count / columns)
  const sceneHeight = Math.max(4096, rows * cellSize + 320)

  for (let index = 0; index < count; index += 1) {
    const point = resolveGridPoint(index, columns, cellSize, rng)
    const lineA = `Text-${index}`
    const lineB = `Node-${rng.nextInt(100, 999)}`
    // Every 5th element gets a two-line variant to exercise line-break paths.
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
