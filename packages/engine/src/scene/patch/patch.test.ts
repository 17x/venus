import assert from 'node:assert/strict'
import {describe, it} from 'node:test'
import type {EngineRenderableNode} from '../types/types.ts'
import {
  applyEngineScenePatch,
  createMutableEngineSceneState,
} from './patch.ts'

const rect = (id: string, x = 0): EngineRenderableNode => ({
  id,
  type: 'shape',
  shape: 'rect',
  x,
  y: 0,
  width: 10,
  height: 10,
})

const group = (
  id: string,
  children: readonly EngineRenderableNode[],
): EngineRenderableNode => ({
  id,
  type: 'group',
  children,
})

describe('engine scene patch', () => {
  it('replaces nested nodes in place while preserving parent order', () => {
    const state = createMutableEngineSceneState({
      revision: 1,
      width: 100,
      height: 100,
      nodes: [
        {
          id: 'group',
          type: 'group',
          children: [rect('child-a'), rect('child-b')],
        },
        rect('sibling'),
      ],
    })

    const result = applyEngineScenePatch(state, {
      revision: 2,
      upsertNodes: [rect('child-b', 42)],
    })

    assert.equal(result.structureDirty, false)
    assert.deepEqual(result.dirtyNodeIds, ['child-b'])
    assert.equal(state.nodes.length, 2)
    assert.equal(state.nodes[0]?.type, 'group')
    const group = state.nodes[0]
    assert.equal(group.type === 'group' ? group.children[1]?.id : null, 'child-b')
    assert.equal(
      group.type === 'group' && group.children[1]?.type === 'shape'
        ? group.children[1].x
        : null,
      42,
    )
    assert.equal(state.nodeMap.get('child-b')?.id, 'child-b')
    const indexedGroup = state.nodeMap.get('group')
    assert.equal(indexedGroup?.type, 'group')
    assert.equal(
      indexedGroup?.type === 'group' && indexedGroup.children[1]?.type === 'shape'
        ? indexedGroup.children[1].x
        : null,
      42,
    )
  })

  it('removes nested nodes from their parent children list', () => {
    const state = createMutableEngineSceneState({
      revision: 1,
      width: 100,
      height: 100,
      nodes: [
        {
          id: 'group',
          type: 'group',
          children: [rect('child-a'), rect('child-b')],
        },
      ],
    })

    const result = applyEngineScenePatch(state, {
      revision: 2,
      removeNodeIds: ['child-a'],
    })

    assert.equal(result.structureDirty, true)
    assert.deepEqual(result.removedNodeIds, ['child-a'])
    const group = state.nodes[0]
    assert.equal(group.type, 'group')
    assert.deepEqual(group.type === 'group' ? group.children.map((node) => node.id) : [], ['child-b'])
    assert.equal(state.nodeMap.has('child-a'), false)
  })

  it('inserts new nodes into a target parent at the requested index', () => {
    const state = createMutableEngineSceneState({
      revision: 1,
      width: 100,
      height: 100,
      nodes: [
        {
          id: 'group',
          type: 'group',
          children: [rect('child-a'), rect('child-c')],
        },
      ],
    })

    const result = applyEngineScenePatch(state, {
      revision: 2,
      upsertParentId: 'group',
      upsertIndex: 1,
      upsertNodes: [rect('child-b', 20)],
    })

    assert.equal(result.structureDirty, true)
    assert.deepEqual(result.dirtyNodeIds, ['child-b'])
    const group = state.nodes[0]
    assert.deepEqual(
      group.type === 'group' ? group.children.map((node) => node.id) : [],
      ['child-a', 'child-b', 'child-c'],
    )
    assert.equal(state.nodeMap.get('child-b')?.id, 'child-b')
  })

  it('replaces existing nodes without structure dirtiness when parent and index are unchanged', () => {
    const state = createMutableEngineSceneState({
      revision: 1,
      width: 100,
      height: 100,
      nodes: [
        {
          id: 'group',
          type: 'group',
          children: [rect('child-a'), rect('child-b')],
        },
      ],
    })

    const result = applyEngineScenePatch(state, {
      revision: 2,
      upsertParentId: 'group',
      upsertIndex: 1,
      upsertNodes: [rect('child-b', 42)],
    })

    assert.equal(result.structureDirty, false)
    assert.deepEqual(result.dirtyNodeIds, ['child-b'])
    const group = state.nodes[0]
    assert.deepEqual(
      group.type === 'group' ? group.children.map((node) => node.id) : [],
      ['child-a', 'child-b'],
    )
    assert.equal(
      group.type === 'group' && group.children[1]?.type === 'shape'
        ? group.children[1].x
        : null,
      42,
    )
  })

  it('reparents existing nodes between nested parents without reporting removal', () => {
    const state = createMutableEngineSceneState({
      revision: 1,
      width: 100,
      height: 100,
      nodes: [
        {
          id: 'group-a',
          type: 'group',
          children: [rect('child-a'), rect('child-b')],
        },
        {
          id: 'group-b',
          type: 'group',
          children: [rect('child-c')],
        },
      ],
    })

    const result = applyEngineScenePatch(state, {
      revision: 2,
      upsertParentId: 'group-b',
      upsertIndex: 0,
      upsertNodes: [rect('child-b', 42)],
    })

    assert.equal(result.structureDirty, true)
    assert.deepEqual(result.removedNodeIds, [])
    const groupA = state.nodes[0]
    const groupB = state.nodes[1]
    assert.deepEqual(groupA.type === 'group' ? groupA.children.map((node) => node.id) : [], ['child-a'])
    assert.deepEqual(groupB.type === 'group' ? groupB.children.map((node) => node.id) : [], ['child-b', 'child-c'])
    assert.equal(
      groupB.type === 'group' && groupB.children[0]?.type === 'shape'
        ? groupB.children[0].x
        : null,
      42,
    )
    assert.equal(state.nodeMap.get('child-b')?.id, 'child-b')
  })

  it('keeps same-parent upserts in place when no index override is provided', () => {
    const state = createMutableEngineSceneState({
      revision: 1,
      width: 100,
      height: 100,
      nodes: [
        {
          id: 'group',
          type: 'group',
          children: [rect('child-a'), rect('child-b'), rect('child-c')],
        },
      ],
    })

    applyEngineScenePatch(state, {
      revision: 2,
      upsertParentId: 'group',
      upsertNodes: [rect('child-b', 99)],
    })

    const group = state.nodes[0]
    assert.deepEqual(
      group.type === 'group' ? group.children.map((node) => node.id) : [],
      ['child-a', 'child-b', 'child-c'],
    )
    assert.equal(
      group.type === 'group' && group.children[1]?.type === 'shape'
        ? group.children[1].x
        : null,
      99,
    )
  })

  it('rejects reparent to a missing parent without mutating the scene', () => {
    const state = createMutableEngineSceneState({
      revision: 1,
      width: 100,
      height: 100,
      nodes: [
        {
          id: 'group',
          type: 'group',
          children: [rect('child')],
        },
      ],
    })

    assert.throws(
      () => applyEngineScenePatch(state, {
        revision: 2,
        upsertParentId: 'missing',
        upsertNodes: [rect('child', 42)],
      }),
      /parent "missing"/,
    )

    assert.equal(state.revision, 1)
    const group = state.nodes[0]
    assert.deepEqual(group.type === 'group' ? group.children.map((node) => node.id) : [], ['child'])
    assert.equal(
      group.type === 'group' && group.children[0]?.type === 'shape'
        ? group.children[0].x
        : null,
      0,
    )
  })

  it('rejects reparenting a node into its own descendant', () => {
    const state = createMutableEngineSceneState({
      revision: 1,
      width: 100,
      height: 100,
      nodes: [
        {
          id: 'group-a',
          type: 'group',
          children: [
            {
              id: 'group-b',
              type: 'group',
              children: [rect('child')],
            },
          ],
        },
      ],
    })

    assert.throws(
      () => applyEngineScenePatch(state, {
        revision: 2,
        upsertParentId: 'group-b',
        upsertNodes: [{
          id: 'group-a',
          type: 'group',
          children: [],
        }],
      }),
      /own descendant/,
    )
  })
})
