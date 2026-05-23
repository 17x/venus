import assert from 'node:assert/strict'
import test from 'node:test'

import {createEditorDocumentFromFile, createFileElementsFromDocument} from '../fileDocument/fileDocument.ts'
import {createRuntimeSceneFromVisionFile} from '../fileFormatScene.ts'
import {normalizeFile} from '../readFileNormalize.ts'

/**
 * Creates one deterministic persisted-file fixture shared by adapter snapshot governance checks.
 * @param overrides Optional partial overrides for fixture specialization.
 */
function createAdapterGovernanceFixture(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'adapter-file-1',
    name: 'Adapter Governance Fixture',
    version: '1.0.0',
    createdAt: 100,
    updatedAt: 101,
    schema: {name: 'venus.vector.document', version: 1, major: 1, minor: 0},
    config: {
      page: {unit: 'px', width: 960, height: 540, dpi: 72},
      editor: {
        crashRecoveryReplayMode: 'merged',
      },
    },
    pages: [{id: 'page-main', name: 'Main', width: 960, height: 540}],
    activePageId: 'page-main',
    lifecycle: {
      state: 'opened',
      dirty: false,
    },
    elements: [
      {
        id: 'group-1',
        type: 'group',
        name: 'Group 1',
        x: 10,
        y: 10,
        width: 320,
        height: 220,
      },
      {
        id: 'image-1',
        type: 'image',
        name: 'Image 1',
        parentId: 'group-1',
        x: 30,
        y: 30,
        width: 200,
        height: 120,
        asset: 'asset-1',
      },
      {
        id: 'rect-1',
        type: 'rectangle',
        name: 'Rect 1',
        parentId: 'group-1',
        x: 250,
        y: 80,
        width: 60,
        height: 60,
      },
    ],
    assets: [{id: 'asset-1', name: 'Image Asset', type: 'image', mimeType: 'image/png', objectUrl: 'blob:asset-1'}],
    ...overrides,
  }
}

/**
 * Verifies adapter snapshot governance matrix by aggregating normalize/fileDocument/fileFormatScene outputs.
 */
test('adapter snapshot governance matrix aggregates normalize/fileDocument/fileFormatScene outputs deterministically', () => {
  const sourceFile = createAdapterGovernanceFixture()
  const normalizedFile = normalizeFile(sourceFile)
  const document = createEditorDocumentFromFile(normalizedFile)
  const scene = createRuntimeSceneFromVisionFile(normalizedFile)
  const roundTripElements = createFileElementsFromDocument(document)

  const governanceMatrix = {
    normalize: {
      schema: normalizedFile.schema,
      lifecycleState: normalizedFile.lifecycle?.state,
      pageSize: `${normalizedFile.config.page.width}x${normalizedFile.config.page.height}`,
      elementCount: normalizedFile.elements.length,
      assetCount: normalizedFile.assets?.length ?? 0,
    },
    fileDocument: {
      shapeIds: document.shapes.map((shape) => shape.id),
      imageAssetUrls: document.shapes
        .filter((shape) => shape.type === 'image')
        .map((shape) => shape.assetUrl ?? null),
    },
    fileFormatScene: {
      canvasSize: `${scene.canvasWidth}x${scene.canvasHeight}`,
      rootNodeIds: scene.nodes.map((node) => node.id),
      groupedChildIds: scene.nodes.find((node) => node.id === 'group-1')?.children.map((child) => child.id) ?? [],
    },
    roundTrip: {
      elementIds: roundTripElements.map((element) => element.id),
      elementTypes: roundTripElements.map((element) => element.type),
    },
  }

  assert.deepEqual(governanceMatrix, {
    normalize: {
      schema: {name: 'venus.vector.document', version: 1, major: 1, minor: 0},
      lifecycleState: 'opened',
      pageSize: '960x540',
      elementCount: 3,
      assetCount: 1,
    },
    fileDocument: {
      shapeIds: ['group-1', 'image-1', 'rect-1'],
      imageAssetUrls: ['blob:asset-1'],
    },
    fileFormatScene: {
      canvasSize: '960x540',
      rootNodeIds: ['group-1'],
      groupedChildIds: ['image-1', 'rect-1'],
    },
    roundTrip: {
      elementIds: ['group-1', 'image-1', 'rect-1'],
      elementTypes: ['group', 'image', 'rectangle'],
    },
  })
})
