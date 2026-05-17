import assert from 'node:assert/strict'
import test from 'node:test'

import type {EditorDocument} from '../../model/index.ts'
import type {SceneShapeSnapshot} from '../../shared-memory/index.ts'
import {createEngineSceneFromRuntimeSnapshot} from './engineSceneAdapter.ts'

/**
 * Creates one minimal document fixture for scene-adapter contract tests.
 */
function createMinimalDocument(): EditorDocument {
  return {
    id: 'doc-1',
    name: 'Document',
    width: 1200,
    height: 800,
    shapes: [{
      id: 'shape-1',
      type: 'rectangle',
      name: 'Rectangle',
      x: 100,
      y: 120,
      width: 240,
      height: 180,
    }],
  }
}

/**
 * Creates one minimal shared-memory snapshot aligned with the fixture document.
 */
function createMinimalShapeSnapshot(): SceneShapeSnapshot[] {
  return [{
    id: 'shape-1',
    name: 'Rectangle',
    type: 'rectangle',
    x: 100,
    y: 120,
    width: 240,
    height: 180,
    isHovered: false,
    isSelected: false,
  }]
}

test('scene adapter applies compatibility defaults for lighting and material', () => {
  const scene = createEngineSceneFromRuntimeSnapshot({
    document: createMinimalDocument(),
    shapes: createMinimalShapeSnapshot(),
    revision: 1,
    compatibility: {
      dimensionMode: 'hybrid-2d3d',
      defaultLightingMode: 'lit',
      defaultMaterialId: 'material/vector-default',
    },
  })

  const node = scene.nodes.find((item) => item.id === 'shape-1')
  assert.ok(node)
  assert.equal(node?.lightingMode, 'lit')
  assert.equal(node?.materialId, 'material/vector-default')
})
