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
  'test-feature-matrix': createFeatureMatrixTemplate,
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

/**
 * Builds one deterministic high-coverage feature matrix used for render-detail regression.
 * @param preset Preset metadata used by the template selector.
 * @param context Optional generator seed override for deterministic variation.
 */
function createFeatureMatrixTemplate(
  preset: TemplatePresetDefinition,
  context: TemplateGeneratorContext,
): EditorFileDocument {
  const rng = createSeededRandom(resolveSeed(context.seed, 71001))
  const state: GenerationState = {nextId: 1}
  const assets = createImageAssetPool('matrix', 8)
  const elements: ElementProps[] = []
  const depthGroupIds = Array.from({length: 8}, (_, index) => `matrix-group-depth-${index + 1}`)
  const leafParentId = depthGroupIds[depthGroupIds.length - 1]

  elements.push({
    id: 'matrix-root-frame',
    type: 'frame',
    name: 'Feature Matrix Root Frame',
    x: 40,
    y: 40,
    width: 1840,
    height: 1240,
    parentId: null,
    childIds: [depthGroupIds[0], 'matrix-overlay-lane'],
    fill: {
      enabled: true,
      color: '#ffffff',
    },
    stroke: {
      enabled: true,
      color: '#94a3b8',
      weight: 1,
    },
    extensions: {
      matrix: {
        role: 'frame-root',
      },
    },
  })

  depthGroupIds.forEach((groupId, index) => {
    const nextGroupId = depthGroupIds[index + 1]
    const depth = index + 1
    elements.push({
      id: groupId,
      type: 'group',
      name: `Depth Group ${depth}`,
      x: 80 + depth * 24,
      y: 90 + depth * 18,
      width: 1500 - depth * 60,
      height: 1020 - depth * 48,
      parentId: index === 0 ? 'matrix-root-frame' : depthGroupIds[index - 1],
      childIds: nextGroupId
        ? [nextGroupId]
        : [
            'matrix-rect-main',
            'matrix-ellipse-arc',
            'matrix-polygon',
            'matrix-star',
            'matrix-line',
            'matrix-path-curve',
            'matrix-text-rich',
            'matrix-image-host',
            'matrix-mask-source',
            'matrix-image-plain',
            'matrix-path-outline',
          ],
      rotation: depth % 2 === 0 ? 0.5 : -0.5,
      extensions: {
        matrix: {
          depth,
          role: 'nested-group',
        },
      },
    })
  })

  elements.push({
    id: 'matrix-overlay-lane',
    type: 'group',
    name: 'Overlay State Lane',
    x: 96,
    y: 1120,
    width: 1720,
    height: 120,
    parentId: 'matrix-root-frame',
    childIds: ['matrix-overlay-selected', 'matrix-overlay-hover', 'matrix-overlay-marquee'],
  })

  elements.push({
    id: 'matrix-overlay-selected',
    type: 'rectangle',
    name: 'Overlay Selected Marker',
    x: 130,
    y: 1142,
    width: 280,
    height: 70,
    parentId: 'matrix-overlay-lane',
    fill: {
      enabled: true,
      color: '#dbeafe',
    },
    stroke: {
      enabled: true,
      color: '#1d4ed8',
      weight: 2,
      dashed: true,
    },
    extensions: {
      matrix: {
        interactionState: 'selected+handles',
        cursor: 'move',
      },
    },
  })

  elements.push({
    id: 'matrix-overlay-hover',
    type: 'ellipse',
    name: 'Overlay Hover Marker',
    x: 470,
    y: 1144,
    width: 94,
    height: 66,
    parentId: 'matrix-overlay-lane',
    fill: {
      enabled: true,
      color: '#cffafe',
      gradient: {
        type: 'radial',
        centerX: 0.45,
        centerY: 0.45,
        radius: 0.8,
        stops: [
          {offset: 0, color: '#ecfeff'},
          {offset: 1, color: '#67e8f9'},
        ],
      },
    },
    stroke: {
      enabled: true,
      color: '#0e7490',
      weight: 2,
    },
    extensions: {
      matrix: {
        interactionState: 'hover',
        cursor: 'pointer',
      },
    },
  })

  elements.push({
    id: 'matrix-overlay-marquee',
    type: 'path',
    name: 'Overlay Marquee Marker',
    x: 610,
    y: 1148,
    width: 220,
    height: 56,
    parentId: 'matrix-overlay-lane',
    points: [
      {x: 610, y: 1148},
      {x: 830, y: 1148},
      {x: 830, y: 1204},
      {x: 610, y: 1204},
      {x: 610, y: 1148},
    ],
    fill: {
      enabled: true,
      color: 'rgba(59,130,246,0.08)',
    },
    stroke: {
      enabled: true,
      color: '#2563eb',
      weight: 2,
      dashed: true,
    },
    extensions: {
      matrix: {
        interactionState: 'marquee',
        cursor: 'crosshair',
      },
    },
  })

  elements.push({
    id: 'matrix-rect-main',
    type: 'rectangle',
    name: 'Rectangle Gradient + Stroke Gradient',
    x: 280,
    y: 230,
    width: 290,
    height: 184,
    parentId: leafParentId,
    rotation: 8,
    fill: {
      enabled: true,
      color: '#e0f2fe',
      gradient: {
        type: 'linear',
        angle: 132,
        stops: [
          {offset: 0, color: '#dbeafe'},
          {offset: 0.55, color: '#bfdbfe'},
          {offset: 1, color: '#93c5fd'},
        ],
      },
    },
    stroke: {
      enabled: true,
      color: '#1d4ed8',
      weight: 3,
      gradient: {
        type: 'linear',
        angle: 90,
        stops: [
          {offset: 0, color: '#1d4ed8'},
          {offset: 1, color: '#1e40af'},
        ],
      },
    },
    shadow: {
      enabled: true,
      color: 'rgba(30,64,175,0.24)',
      offsetX: 0,
      offsetY: 10,
      blur: 20,
    },
    cornerRadii: {
      topLeft: 22,
      topRight: 8,
      bottomRight: 22,
      bottomLeft: 8,
    },
    extensions: {
      matrix: {
        interactionState: 'selected',
        handles: ['nw', 'ne', 'se', 'sw', 'rotate'],
        cursor: 'nwse-resize',
      },
    },
  })

  elements.push({
    id: 'matrix-ellipse-arc',
    type: 'ellipse',
    name: 'Ellipse Arc + Flip',
    x: 642,
    y: 240,
    width: 188,
    height: 150,
    parentId: leafParentId,
    flipX: true,
    ellipseStartAngle: 36,
    ellipseEndAngle: 312,
    fill: {
      enabled: true,
      color: '#fef3c7',
      gradient: {
        type: 'radial',
        centerX: 0.45,
        centerY: 0.4,
        radius: 0.8,
        stops: [
          {offset: 0, color: '#fef9c3'},
          {offset: 1, color: '#f59e0b'},
        ],
      },
    },
    stroke: {
      enabled: true,
      color: '#92400e',
      weight: 2,
    },
    extensions: {
      matrix: {
        interactionState: 'hover',
        cursor: 'pointer',
      },
    },
  })

  elements.push({
    id: 'matrix-polygon',
    type: 'polygon',
    name: 'Polygon Rotated',
    x: 866,
    y: 244,
    width: 206,
    height: 164,
    parentId: leafParentId,
    rotation: -12,
    points: [
      {x: 930, y: 244},
      {x: 1066, y: 286},
      {x: 1032, y: 408},
      {x: 892, y: 402},
      {x: 866, y: 302},
    ],
    fill: {
      enabled: true,
      color: '#ede9fe',
    },
    stroke: {
      enabled: true,
      color: '#5b21b6',
      weight: 2,
    },
  })

  elements.push({
    id: 'matrix-star',
    type: 'star',
    name: 'Star Shape',
    x: 1110,
    y: 256,
    width: 132,
    height: 132,
    parentId: leafParentId,
    points: [
      {x: 1176, y: 256},
      {x: 1194, y: 302},
      {x: 1242, y: 306},
      {x: 1204, y: 336},
      {x: 1218, y: 388},
      {x: 1176, y: 360},
      {x: 1134, y: 388},
      {x: 1148, y: 336},
      {x: 1110, y: 306},
      {x: 1158, y: 302},
    ],
    fill: {
      enabled: true,
      color: '#fde68a',
    },
    stroke: {
      enabled: true,
      color: '#a16207',
      weight: 2,
    },
  })

  elements.push({
    id: 'matrix-line',
    type: 'lineSegment',
    name: 'Line Segment Arrowheads',
    x: 294,
    y: 484,
    width: 302,
    height: 118,
    parentId: leafParentId,
    points: [
      {x: 294, y: 484},
      {x: 596, y: 602},
    ],
    strokeStartArrowhead: 'circle',
    strokeEndArrowhead: 'triangle',
    fill: {
      enabled: false,
      color: '#00000000',
    },
    stroke: {
      enabled: true,
      color: '#0f172a',
      weight: 4,
    },
    extensions: {
      matrix: {
        interactionState: 'handles',
        cursor: 'crosshair',
      },
    },
  })

  elements.push({
    id: 'matrix-path-curve',
    type: 'path',
    name: 'Bezier Path Multi Segment',
    x: 632,
    y: 462,
    width: 438,
    height: 198,
    parentId: leafParentId,
    points: [
      {x: 646, y: 540},
      {x: 768, y: 468},
      {x: 920, y: 622},
      {x: 1052, y: 496},
    ],
    bezierPoints: [
      {
        anchor: {x: 646, y: 540},
        cp2: {x: 704, y: 470},
      },
      {
        anchor: {x: 768, y: 468},
        cp1: {x: 730, y: 470},
        cp2: {x: 850, y: 478},
      },
      {
        anchor: {x: 920, y: 622},
        cp1: {x: 874, y: 652},
        cp2: {x: 978, y: 590},
      },
      {
        anchor: {x: 1052, y: 496},
        cp1: {x: 1010, y: 462},
      },
    ],
    strokeStartArrowhead: 'none',
    strokeEndArrowhead: 'diamond',
    fill: {
      enabled: false,
      color: '#00000000',
    },
    stroke: {
      enabled: true,
      color: '#0f766e',
      weight: 3,
    },
  })

  elements.push({
    id: 'matrix-path-outline',
    type: 'path',
    name: 'Closed Path Outline',
    x: 1112,
    y: 466,
    width: 198,
    height: 170,
    parentId: leafParentId,
    points: [
      {x: 1112, y: 466},
      {x: 1310, y: 486},
      {x: 1276, y: 636},
      {x: 1138, y: 620},
      {x: 1112, y: 466},
    ],
    fill: {
      enabled: true,
      color: 'rgba(56,189,248,0.16)',
    },
    stroke: {
      enabled: true,
      color: '#0284c7',
      weight: 2,
      dashed: true,
    },
  })

  elements.push({
    id: 'matrix-text-rich',
    type: 'text',
    name: 'Rich Text Matrix',
    text: 'Feature Matrix\nHover Marquee Selected\nHandles Cursor Sync',
    x: 284,
    y: 662,
    width: 520,
    height: 166,
    parentId: leafParentId,
    fill: {
      enabled: true,
      color: '#111827',
    },
    textRuns: [
      {
        start: 0,
        end: 14,
        style: {
          color: '#0f172a',
          fontFamily: 'Arial, sans-serif',
          fontSize: 30,
          fontWeight: 700,
          lineHeight: 36,
          letterSpacing: -0.2,
          shadow: {
            color: 'rgba(30,64,175,0.30)',
            offsetX: 1,
            offsetY: 2,
            blur: 4,
          },
        },
      },
      {
        start: 15,
        end: 39,
        style: {
          color: '#0369a1',
          fontFamily: 'Arial, sans-serif',
          fontSize: 22,
          fontWeight: 600,
          lineHeight: 30,
        },
      },
      {
        start: 40,
        end: 59,
        style: {
          color: '#0f766e',
          fontFamily: 'Arial, sans-serif',
          fontSize: 20,
          fontWeight: 500,
          lineHeight: 28,
          paragraphIndentFirst: 12,
          paragraphSpaceBeforeLine: 4,
        },
      },
    ],
    extensions: {
      matrix: {
        interactionState: 'selected+hover',
        cursor: 'text',
      },
    },
  })

  elements.push({
    id: 'matrix-mask-source',
    type: 'path',
    name: 'Mask Source Path',
    x: 866,
    y: 694,
    width: 278,
    height: 194,
    parentId: leafParentId,
    points: [
      {x: 930, y: 694},
      {x: 1144, y: 736},
      {x: 1108, y: 878},
      {x: 906, y: 888},
      {x: 866, y: 772},
      {x: 930, y: 694},
    ],
    fill: {
      enabled: true,
      color: '#e2e8f0',
    },
    stroke: {
      enabled: true,
      color: '#64748b',
      weight: 2,
    },
    maskGroupId: 'matrix-mask-01',
    maskRole: 'source',
    extensions: {
      matrix: {
        role: 'mask-source',
      },
    },
  })

  elements.push({
    id: 'matrix-image-host',
    type: 'image',
    name: 'Masked Host Image',
    x: 842,
    y: 678,
    width: 332,
    height: 228,
    parentId: leafParentId,
    asset: assets[0]?.id,
    assetUrl: assets[0]?.objectUrl,
    clipPathId: 'matrix-mask-source',
    clipRule: 'evenodd',
    maskGroupId: 'matrix-mask-01',
    maskRole: 'host',
    fill: {
      enabled: false,
      color: '#ffffff',
    },
    stroke: {
      enabled: false,
      color: '#111827',
      weight: 0,
    },
    extensions: {
      matrix: {
        interactionState: 'hover',
        cursor: 'move',
      },
    },
  })

  elements.push({
    id: 'matrix-image-plain',
    type: 'image',
    name: 'Plain Image Control',
    x: 1206,
    y: 708,
    width: 214,
    height: 164,
    parentId: leafParentId,
    asset: assets[1]?.id,
    assetUrl: assets[1]?.objectUrl,
    shadow: {
      enabled: true,
      color: 'rgba(15,23,42,0.26)',
      offsetX: 0,
      offsetY: 6,
      blur: 12,
    },
    extensions: {
      matrix: {
        interactionState: 'cursor',
        cursor: 'grab',
      },
    },
  })

  for (let index = 0; index < 10; index += 1) {
    elements.push(createRectangleElement(state, {
      x: 126 + index * 154,
      y: 950,
      width: 124,
      height: 44,
      fill: randomPastelHex(rng),
      stroke: '#334155',
    }))
  }

  const file = buildVisionFile({
    id: createDeterministicId('tpl', preset.id, 0),
    name: preset.label,
    width: 1920,
    height: 1300,
    elements,
    assets,
  })

  file.extensions = {
    ...(file.extensions ?? {}),
    matrix: {
      purpose: 'render-detail-regression',
      depthGroupLevels: 8,
      featureCoverage: [
        'frame',
        'group-depth-1-8',
        'rectangle-gradient-stroke-shadow',
        'ellipse-arc',
        'polygon',
        'star',
        'line-arrowheads',
        'path-bezier',
        'text-runs',
        'image-mask-clip',
        'rotation-flip',
      ],
      interactionStateCoverage: [
        'hover',
        'marquee',
        'selected',
        'handles',
        'cursor',
      ],
      seed: resolveSeed(context.seed, 71001),
    },
  }

  return file
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

