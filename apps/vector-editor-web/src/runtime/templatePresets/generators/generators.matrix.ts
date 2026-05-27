/**
 * Feature-matrix template generator.
 *
 * Produces one deterministic high-coverage document used for render-detail
 * regression testing. Leaf element layers are delegated to focused builder
 * functions in generators.matrix-elements.ts; this file owns:
 *   - Frame + depth-group structure builders
 *   - Overlay-lane marker builder
 metadata
 */
import type {ElementProps} from '../../types/index.ts'
import type {EditorFileDocument} from '../../types/index.ts'
import type {TemplateFileGenerator, TemplatePresetDefinition, TemplateGeneratorContext} from '../types.ts'
import {createSeededRandom} from '../seededRandom.ts'
import {
  buildVisionFile,
  createDeterministicId,
  createImageAssetPool,
  createRectangleElement,
  randomPastelHex,
  resolveSeed,
  type GenerationState,
} from './generators.helpers.ts'
import {
  buildMatrixBasicShapes,
  buildMatrixRichElements,
} from './generators.matrix-elements.ts'

// ---------------------------------------------------------------------------
// Frame + depth-group skeleton
// ---------------------------------------------------------------------------

/**
 * Builds the root frame and 8 nested depth-groups that form the structural
 * skeleton of the feature-matrix document.
 * @param depthGroupIds Ordered IDs for the 8 depth groups; the last ID is the leaf parent.
 */
function buildMatrixFrameAndGroups(depthGroupIds: string[]): ElementProps[] {
  const elements: ElementProps[] = []

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

  return elements
}

// ---------------------------------------------------------------------------
// Overlay lane (interaction-state markers)
// ---------------------------------------------------------------------------

/**
 * Builds the overlay-state lane that demonstrates hover / selected / marquee
 * interaction states. These elements sit at the bottom of the root frame.
 */
function buildMatrixOverlayLane(): ElementProps[] {
  const elements: ElementProps[] = []

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

  return elements
}

// ---------------------------------------------------------------------------
// Feature-matrix generator
// ---------------------------------------------------------------------------

/**
 * Exported generator entry-point consumed by the PRESET_GENERATORS registry
 * in generators.ts.
 */
export const createFeatureMatrixTemplate: TemplateFileGenerator = (
  preset: TemplatePresetDefinition,
  context: TemplateGeneratorContext,
): EditorFileDocument => {
  const rng = createSeededRandom(resolveSeed(context.seed, 71001))
  const state: GenerationState = {nextId: 1}
  const assets = createImageAssetPool('matrix', 8)
  const depthGroupIds = Array.from({length: 8}, (_, index) => `matrix-group-depth-${index + 1}`)
  const leafParentId = depthGroupIds[depthGroupIds.length - 1]

  // Concatenate each layer slice produced by the builder helpers.
  const elements: ElementProps[] = [
    ...buildMatrixFrameAndGroups(depthGroupIds),
    ...buildMatrixOverlayLane(),
    ...buildMatrixBasicShapes(leafParentId),
    ...buildMatrixRichElements(assets, leafParentId),
  ]

  // Filler row: 10 deterministic rectangles at the bottom of the matrix.
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

  // Attach feature-coverage metadata for tooling and diagnostics consumers.
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
