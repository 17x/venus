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

/**
 * Produces a comprehensive "model-coverage" preset that exercises every
 * property of the DocumentNode type to validate engine rendering fidelity.
 *
 * Includes: multi-fill, multi-stroke, dash patterns, stroke align/cap/join,
 * rounded corners (uniform + independent), ellipse arcs, shadows, blurs,
 * opacity, blend modes, gradient fills/strokes, image fills, boolean ops,
 * clip paths, multi-line text with textRuns, text truncation, locked/visible
 * flags, and component stubs.
 *
 * @param preset Preset metadata (id, label, dimensions).
 * @param context Optional seed override for deterministic variation.
 */
export function createModelCoverageDemo(
  preset: TemplatePresetDefinition,
  context: TemplateGeneratorContext,
): EditorFileDocument {
  const rng = createSeededRandom(resolveSeed(context.seed, 99001))
  const state: GenerationState = { nextId: 1 }
  const elements: ElementProps[] = []

  // -- Row 1: Basic shapes with multi-fill + multi-stroke + dash + opacity --
  // Rectangle with rounded corners (uniform)
  elements.push({
    ...createRectangleElement(state, { x: 40, y: 40, width: 160, height: 100, fill: '#dbeafe', stroke: '#2563eb' }),
    cornerRadius: 12,
    opacity: 0.9,
    fills: [
      { enabled: true, color: '#dbeafe', opacity: 0.8 },
      { enabled: true, color: '#93c5fd', opacity: 0.4, blendMode: 'overlay' as const },
    ],
    strokes: [
      { enabled: true, color: '#2563eb', weight: 2, dashPattern: 'dashed' as const },
    ],
    name: 'Rounded rect + multi-fill + dash',
  })

  // Rectangle with independent corner radii
  elements.push({
    ...createRectangleElement(state, { x: 230, y: 40, width: 160, height: 100, fill: '#dcfce7', stroke: '#16a34a' }),
    cornerRadii: { topLeft: 24, topRight: 8, bottomRight: 24, bottomLeft: 8 },
    opacity: 0.85,
    strokes: [
      { enabled: true, color: '#16a34a', weight: 3, align: 'outside' as const, cap: 'round' as const, join: 'round' as const },
    ],
    name: 'Independent radii + stroke align/cap/join',
  })

  // Ellipse (full circle)
  elements.push(createEllipseElement(state, { x: 420, y: 40, width: 100, height: 100, fill: '#fce7f3', stroke: '#db2777' }))

  // Ellipse arc (pie wedge)
  elements.push({
    ...createEllipseElement(state, { x: 550, y: 40, width: 100, height: 100, fill: '#fef3c7', stroke: '#d97706' }),
    ellipseStartAngle: 30,
    ellipseEndAngle: 270,
    name: 'Ellipse arc 30°-270°',
  })

  // -- Row 2: Shadows + blurs + blend modes --
  elements.push({
    ...createRectangleElement(state, { x: 40, y: 170, width: 140, height: 90, fill: '#ffffff', stroke: '#cbd5e1' }),
    shadow: { enabled: true, color: 'rgba(0,0,0,0.25)', offsetX: 4, offsetY: 6, blur: 12 } as Record<string, unknown>,
    name: 'Drop shadow',
  })

  elements.push({
    ...createRectangleElement(state, { x: 210, y: 170, width: 140, height: 90, fill: '#e0e7ff', stroke: '#6366f1' }),
    shadow: { enabled: true, color: 'rgba(0,0,0,0.2)', offsetX: 2, offsetY: 2, blur: 8 } as Record<string, unknown>,
    name: 'Inner shadow',
  })

  elements.push({
    ...createRectangleElement(state, { x: 380, y: 170, width: 140, height: 90, fill: '#fef2f2', stroke: '#ef4444' }),
    blur: { enabled: true, kind: 'layer' as const, radius: 4 },
    blendMode: 'multiply' as const,
    name: 'Layer blur + multiply blend',
  })

  // -- Row 3: Gradient fills + strokes --
  elements.push({
    ...createRectangleElement(state, { x: 40, y: 290, width: 200, height: 100, fill: '#ffffff', stroke: '#000000' }),
    fills: [{
      enabled: true,
      gradient: {
        type: 'linear' as const,
        stops: [
          { offset: 0, color: '#f97316' },
          { offset: 0.5, color: '#ef4444' },
          { offset: 1, color: '#ec4899' },
        ],
        angle: 135,
      },
    }],
    name: 'Linear gradient fill',
  })

  elements.push({
    ...createEllipseElement(state, { x: 270, y: 290, width: 110, height: 110, fill: '#ffffff', stroke: '#000000' }),
    fills: [{
      enabled: true,
      gradient: {
        type: 'radial' as const,
        stops: [
          { offset: 0, color: '#06b6d4' },
          { offset: 1, color: '#1e3a5f' },
        ],
        centerX: 0.5, centerY: 0.5, radius: 0.7,
      },
    }],
    strokes: [{
      enabled: true,
      gradient: {
        type: 'linear' as const,
        stops: [{ offset: 0, color: '#8b5cf6' }, { offset: 1, color: '#3b82f6' }],
        angle: 90,
      },
      weight: 3,
    }],
    name: 'Radial fill + linear stroke gradient',
  })

  elements.push({
    ...createRectangleElement(state, { x: 410, y: 290, width: 200, height: 100, fill: '#ffffff', stroke: '#000000' }),
    fills: [{
      enabled: true,
      gradient: {
        type: 'angular' as const,
        stops: [
          { offset: 0, color: '#ef4444' },
          { offset: 0.33, color: '#22c55e' },
          { offset: 0.66, color: '#3b82f6' },
          { offset: 1, color: '#ef4444' },
        ],
        centerX: 0.5, centerY: 0.5,
      },
    }],
    name: 'Angular/conic gradient',
  })

  // -- Row 4: Multi-line text with textRuns + decoration --
  elements.push(createTextElement(state, {
    x: 40, y: 420, width: 280, height: 80,
    text: 'Multi-line Text\nLine 2: Bold Style\nLine 3: Large & Italic',
    fill: '#0f172a',
    fontSize: 14,
    lineHeight: 20,
    textRuns: [
      { start: 0, end: 15, style: { color: '#0f172a', fontFamily: 'Arial', fontSize: 14, fontWeight: 500 } },
      { start: 16, end: 34, style: { color: '#2563eb', fontFamily: 'Arial', fontSize: 14, fontWeight: 700 } },
      { start: 35, end: 59, style: { color: '#dc2626', fontFamily: 'Georgia', fontSize: 18, fontWeight: 600 } as Record<string, unknown> },
    ],
  }))

  elements.push(createTextElement(state, {
    x: 350, y: 420, width: 260, height: 60,
    text: 'Truncated long text that should be cut off with ending ellipsis',
    fill: '#475569',
    fontSize: 13,
    lineHeight: 18,
  }))
  const lastText = elements[elements.length - 1]
  lastText.textTruncation = 'ending' as const
  lastText.textMaxLines = 2
  lastText.textAutoHeight = 'fixed' as const

  // -- Row 5: Paths (open, closed, bezier) --
  elements.push(createPathElement(state, {
    x: 40, y: 550, width: 200, height: 120,
    color: '#0891b2', rng,
  }))

  // Line segment with arrowheads
  elements.push({
    type: 'lineSegment' as const,
    id: nextElementIdStr(state, 'line'),
    name: 'Line with arrows',
    x: 280, y: 580, width: 160, height: 2,
    fill: { enabled: false },
    stroke: { enabled: true, color: '#7c3aed', weight: 2 },
    strokeStartArrowhead: 'triangle' as const,
    strokeEndArrowhead: 'diamond' as const,
    points: [{ x: 280, y: 580 }, { x: 440, y: 640 }],
  })

  // Star
  elements.push({
    type: 'star' as const,
    id: nextElementIdStr(state, 'star'),
    name: 'Star shape',
    x: 460, y: 550, width: 120, height: 120,
    fill: { enabled: true, color: '#fbbf24' },
    stroke: { enabled: true, color: '#d97706', weight: 2 },
  })

  // Polygon
  elements.push({
    type: 'polygon' as const,
    id: nextElementIdStr(state, 'poly'),
    name: 'Polygon',
    x: 610, y: 550, width: 140, height: 120,
    fill: { enabled: true, color: '#a7f3d0' },
    stroke: { enabled: true, color: '#059669', weight: 2 } as Record<string, unknown>,
  })

  // -- Row 6: Boolean operations + clip mask + locked/visible --
  // Clip: rectangle clips an ellipse
  const clipRectId = nextElementIdStr(state, 'clip-rect')
  elements.push({
    ...createRectangleElement(state, { x: 40, y: 700, width: 180, height: 130, fill: '#ffffff', stroke: '#94a3b8' }),
    id: clipRectId,
    name: 'Clip host (rectangle)',
    clipPathId: undefined,
  })
  elements.push({
    ...createEllipseElement(state, { x: 60, y: 720, width: 140, height: 90, fill: '#f97316', stroke: '#ea580c' }),
    clipPathId: clipRectId,
    clipRule: 'evenodd' as const,
    name: 'Clipped ellipse',
  })

  // Locked element
  elements.push({
    ...createRectangleElement(state, { x: 250, y: 700, width: 130, height: 80, fill: '#e2e8f0', stroke: '#94a3b8' }),
    locked: true,
    name: 'Locked (no select/edit)',
  })

  // Hidden element
  elements.push({
    ...createRectangleElement(state, { x: 410, y: 700, width: 130, height: 80, fill: '#fecaca', stroke: '#ef4444' }),
    visible: false,
    name: 'Hidden (not rendered)',
  })

  // Component stub
  elements.push({
    ...createRectangleElement(state, { x: 570, y: 700, width: 150, height: 90, fill: '#ede9fe', stroke: '#8b5cf6' }),
    componentId: 'comp-btn-primary',
    componentProperties: { label: 'Submit', variant: 'primary', size: 'md' },
    name: 'Component instance stub',
  })

  // Boolean operation marker
  elements.push({
    ...createRectangleElement(state, { x: 40, y: 860, width: 150, height: 90, fill: '#d9f99d', stroke: '#65a30d' }),
    booleanOperation: 'union' as const,
    name: 'Boolean union (stub)',
  })

  // Frame with children
  const frameChildIds: string[] = []
  const frameId = nextElementIdStr(state, 'frame')
  const c1 = createRectangleElement(state, { x: 260, y: 870, width: 70, height: 50, fill: '#bfdbfe', stroke: '#3b82f6' })
  c1.parentId = frameId
  frameChildIds.push(c1.id)
  elements.push(c1)
  const c2 = createRectangleElement(state, { x: 350, y: 890, width: 70, height: 50, fill: '#bbf7d0', stroke: '#22c55e' })
  c2.parentId = frameId
  frameChildIds.push(c2.id)
  elements.push(c2)
  elements.push({
    type: 'frame' as const,
    id: frameId,
    name: 'Frame with auto-layout children',
    x: 240, y: 855, width: 200, height: 110,
    fill: { enabled: true, color: '#f8fafc' },
    stroke: { enabled: true, color: '#94a3b8', weight: 1 } as Record<string, unknown>,
    childIds: frameChildIds,
  })

  return buildVisionFile({
    id: createDeterministicId('tpl', preset.id, 0),
    name: preset.label,
    width: 800,
    height: 1000,
    elements,
  })
}

/** Generates next element id as a string. */
function nextElementIdStr(state: GenerationState, prefix: string): string {
  const id = `tpl-${prefix}-${state.nextId}`
  state.nextId += 1
  return id
}
