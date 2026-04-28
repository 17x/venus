import assert from 'node:assert/strict'
import test from 'node:test'

import type {EditorDocument} from '@vector/model'
import {
  attachSceneMemory,
  createSceneMemory,
  writeDocumentToScene,
  type SceneMemory,
} from '../../shared-memory/index.ts'
import {createRemotePatches} from './remotePatches.ts'

/**
 * Creates one compact scene memory fixture for remote patch planning tests.
 */
function createSceneFixture(document: EditorDocument): SceneMemory {
  const capacity = Math.max(16, document.shapes.length + 4)
  const scene = attachSceneMemory(createSceneMemory(capacity), capacity)
  writeDocumentToScene(scene, document)
  return scene
}

/**
 * Creates one single-parent fixture to verify canonical sibling-order patch precedence.
 */
function createSiblingFixture(): EditorDocument {
  return {
    id: 'doc-reorder',
    name: 'reorder fixture',
    width: 1000,
    height: 1000,
    shapes: [
      {
        id: 'group-root',
        type: 'group',
        name: 'Root',
        parentId: null,
        childIds: ['rect-a', 'rect-b', 'rect-c'],
        x: 0,
        y: 0,
        width: 200,
        height: 60,
      },
      {
        id: 'rect-a',
        type: 'rectangle',
        name: 'A',
        parentId: 'group-root',
        x: 0,
        y: 0,
        width: 40,
        height: 40,
      },
      {
        id: 'rect-b',
        type: 'rectangle',
        name: 'B',
        parentId: 'group-root',
        x: 60,
        y: 0,
        width: 40,
        height: 40,
      },
      {
        id: 'rect-c',
        type: 'rectangle',
        name: 'C',
        parentId: 'group-root',
        x: 120,
        y: 0,
        width: 40,
        height: 40,
      },
    ],
  }
}

/**
 * Verifies remote reorder emits canonical sibling-order patch before legacy reorder compatibility patches.
 */
test('createRemotePatches emits canonical sibling patch first for shape.reorder', () => {
  const document = createSiblingFixture()
  const scene = createSceneFixture(document)

  const patches = createRemotePatches(
    {
      id: 'op-1',
      type: 'shape.reorder',
      actorId: 'remote-user',
      payload: {
        shapeId: 'rect-a',
        toIndex: 2,
      },
    },
    scene,
    document,
  )

  const firstPatch = patches[0]
  assert.ok(firstPatch)
  assert.equal(firstPatch.type, 'set-group-children')

  if (firstPatch.type === 'set-group-children') {
    assert.deepEqual(firstPatch.nextChildIds, ['rect-b', 'rect-c', 'rect-a'])
  }

  // Keep compatibility reorder patches available for flat runtime buffer ordering.
  const reorderPatchIndex = patches.findIndex((patch) => patch.type === 'reorder-shape')
  assert.equal(reorderPatchIndex > 0, true)
})

