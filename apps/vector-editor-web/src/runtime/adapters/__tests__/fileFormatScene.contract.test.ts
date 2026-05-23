import assert from 'node:assert/strict'
import test from 'node:test'

import {createRuntimeSceneFromVisionFile} from '../fileFormatScene.ts'

/**
 * Creates one file fixture containing page selection and parent-child element topology.
 */
function createFileFormatSceneFixture() {
  return {
    id: 'file-scene-1',
    name: 'Scene Fixture',
    version: '1.0.0',
    createdAt: 1,
    updatedAt: 2,
    schema: {name: 'venus.vector.document', version: 1, major: 1, minor: 0},
    config: {
      page: {unit: 'px', width: 320, height: 200, dpi: 72},
    },
    pages: [
      {id: 'page-a', name: 'A', width: 320, height: 200},
      {id: 'page-b', name: 'B', width: 960, height: 540},
    ],
    activePageId: 'page-b',
    elements: [
      {
        id: 'group-1',
        type: 'group',
        name: 'Group 1',
        x: 10,
        y: 10,
        width: 100,
        height: 80,
      },
      {
        id: 'child-1',
        type: 'rectangle',
        name: 'Child 1',
        parentId: 'group-1',
        x: 12,
        y: 14,
        width: 30,
        height: 20,
      },
      {
        id: 'root-2',
        type: 'text',
        name: 'Root 2',
        text: 'hello',
        x: 200,
        y: 100,
        width: 120,
        height: 30,
      },
    ],
    assets: [],
  }
}

/**
 * Asserts adapter output keeps active page geometry and deterministic hierarchy snapshot.
 */
test('createRuntimeSceneFromVisionFile keeps active page dimensions and deterministic node hierarchy snapshot', () => {
  const scene = createRuntimeSceneFromVisionFile(createFileFormatSceneFixture())

  assert.equal(scene.canvasWidth, 960)
  assert.equal(scene.canvasHeight, 540)
  assert.equal(scene.documentId, 'file-scene-1')

  const hierarchySnapshot = scene.nodes.map((node) => ({
    id: node.id,
    parentId: node.parentId,
    nodeKind: node.nodeKind,
    childIds: node.children.map((child) => child.id),
  }))

  assert.deepEqual(hierarchySnapshot, [
    {
      id: 'group-1',
      parentId: null,
      nodeKind: 'group',
      childIds: ['child-1'],
    },
    {
      id: 'root-2',
      parentId: null,
      nodeKind: 'text',
      childIds: [],
    },
  ])
})
