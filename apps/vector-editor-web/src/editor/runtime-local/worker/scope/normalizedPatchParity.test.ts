import assert from 'node:assert/strict'
import test from 'node:test'

import type {EditorDocument} from '@vector/model'
import {createLocalHistoryEntry} from './localHistoryEntry.ts'
import {createRemotePatches} from './remotePatches.ts'
import {createLocalOperation} from './operationPayload.ts'
import {cloneDocument} from './model.ts'
import {
  attachSceneMemory,
  createSceneMemory,
  writeDocumentToScene,
  type SceneMemory,
} from '../../shared-memory/index.ts'

/**
 * Creates a deterministic worker scene memory snapshot for patch-planning tests.
 */
function createSceneFixture(document: EditorDocument): SceneMemory {
  const buffer = createSceneMemory(Math.max(16, document.shapes.length + 8))
  const scene = attachSceneMemory(buffer, Math.max(16, document.shapes.length + 8))
  writeDocumentToScene(scene, document)
  return scene
}

/**
 * Creates one compact document fixture where all target nodes share one parent group.
 */
function createFlatGroupFixture(): EditorDocument {
  return {
    id: 'doc-1',
    name: 'fixture',
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
        width: 300,
        height: 100,
      },
      {
        id: 'rect-a',
        type: 'rectangle',
        name: 'A',
        parentId: 'group-root',
        x: 0,
        y: 0,
        width: 50,
        height: 50,
      },
      {
        id: 'rect-b',
        type: 'rectangle',
        name: 'B',
        parentId: 'group-root',
        x: 80,
        y: 0,
        width: 50,
        height: 50,
      },
      {
        id: 'rect-c',
        type: 'rectangle',
        name: 'C',
        parentId: 'group-root',
        x: 160,
        y: 0,
        width: 50,
        height: 50,
      },
    ],
  }
}

/**
 * Creates one grouped fixture for ungroup parity validation.
 */
function createGroupedFixture(): EditorDocument {
  return {
    id: 'doc-2',
    name: 'grouped',
    width: 1000,
    height: 1000,
    shapes: [
      {
        id: 'group-root',
        type: 'group',
        name: 'Root',
        parentId: null,
        childIds: ['group-temp', 'rect-c'],
        x: 0,
        y: 0,
        width: 400,
        height: 200,
      },
      {
        id: 'group-temp',
        type: 'group',
        name: 'Temp',
        parentId: 'group-root',
        childIds: ['rect-a', 'rect-b'],
        x: 0,
        y: 0,
        width: 150,
        height: 80,
      },
      {
        id: 'rect-a',
        type: 'rectangle',
        name: 'A',
        parentId: 'group-temp',
        x: 0,
        y: 0,
        width: 50,
        height: 50,
      },
      {
        id: 'rect-b',
        type: 'rectangle',
        name: 'B',
        parentId: 'group-temp',
        x: 80,
        y: 0,
        width: 50,
        height: 50,
      },
      {
        id: 'rect-c',
        type: 'rectangle',
        name: 'C',
        parentId: 'group-root',
        x: 220,
        y: 0,
        width: 50,
        height: 50,
      },
    ],
  }
}

/**
 * Creates one nested-parent fixture for reorder parity checks inside grouped subtrees.
 */
function createNestedReorderFixture(): EditorDocument {
  return {
    id: 'doc-3',
    name: 'nested reorder',
    width: 1000,
    height: 1000,
    shapes: [
      {
        id: 'group-root',
        type: 'group',
        name: 'Root',
        parentId: null,
        childIds: ['group-a', 'group-b'],
        x: 0,
        y: 0,
        width: 500,
        height: 300,
      },
      {
        id: 'group-a',
        type: 'group',
        name: 'Group A',
        parentId: 'group-root',
        childIds: ['rect-a', 'rect-b', 'rect-c'],
        x: 0,
        y: 0,
        width: 260,
        height: 120,
      },
      {
        id: 'rect-a',
        type: 'rectangle',
        name: 'A',
        parentId: 'group-a',
        x: 0,
        y: 0,
        width: 40,
        height: 40,
      },
      {
        id: 'rect-b',
        type: 'rectangle',
        name: 'B',
        parentId: 'group-a',
        x: 80,
        y: 0,
        width: 40,
        height: 40,
      },
      {
        id: 'rect-c',
        type: 'rectangle',
        name: 'C',
        parentId: 'group-a',
        x: 160,
        y: 0,
        width: 40,
        height: 40,
      },
      {
        id: 'group-b',
        type: 'group',
        name: 'Group B',
        parentId: 'group-root',
        childIds: ['rect-d'],
        x: 300,
        y: 0,
        width: 120,
        height: 120,
      },
      {
        id: 'rect-d',
        type: 'rectangle',
        name: 'D',
        parentId: 'group-b',
        x: 320,
        y: 20,
        width: 40,
        height: 40,
      },
    ],
  }
}

/**
 * Creates one cross-parent fixture used to validate regroup parity across different source groups.
 */
function createCrossParentFixture(): EditorDocument {
  return {
    id: 'doc-4',
    name: 'cross parent',
    width: 1200,
    height: 800,
    shapes: [
      {
        id: 'group-root',
        type: 'group',
        name: 'Root',
        parentId: null,
        childIds: ['group-left', 'group-right'],
        x: 0,
        y: 0,
        width: 600,
        height: 240,
      },
      {
        id: 'group-left',
        type: 'group',
        name: 'Left',
        parentId: 'group-root',
        childIds: ['rect-a', 'rect-b'],
        x: 0,
        y: 0,
        width: 220,
        height: 120,
      },
      {
        id: 'group-right',
        type: 'group',
        name: 'Right',
        parentId: 'group-root',
        childIds: ['rect-c', 'rect-d'],
        x: 260,
        y: 0,
        width: 220,
        height: 120,
      },
      {
        id: 'rect-a',
        type: 'rectangle',
        name: 'A',
        parentId: 'group-left',
        x: 10,
        y: 10,
        width: 40,
        height: 40,
      },
      {
        id: 'rect-b',
        type: 'rectangle',
        name: 'B',
        parentId: 'group-left',
        x: 90,
        y: 10,
        width: 40,
        height: 40,
      },
      {
        id: 'rect-c',
        type: 'rectangle',
        name: 'C',
        parentId: 'group-right',
        x: 280,
        y: 10,
        width: 40,
        height: 40,
      },
      {
        id: 'rect-d',
        type: 'rectangle',
        name: 'D',
        parentId: 'group-right',
        x: 360,
        y: 10,
        width: 40,
        height: 40,
      },
    ],
  }
}

/**
 * Creates one nested temporary-group fixture for ungroup parity checks.
 */
function createNestedUngroupFixture(): EditorDocument {
  const document = createCrossParentFixture()
  document.shapes.push({
    id: 'group-temp',
    type: 'group',
    name: 'Temp',
    parentId: 'group-root',
    childIds: ['rect-a', 'rect-c'],
    x: 0,
    y: 0,
    width: 400,
    height: 80,
  })
  document.shapes.find((shape) => shape.id === 'rect-a')!.parentId = 'group-temp'
  document.shapes.find((shape) => shape.id === 'rect-c')!.parentId = 'group-temp'
  document.shapes.find((shape) => shape.id === 'group-left')!.childIds = ['rect-b']
  document.shapes.find((shape) => shape.id === 'group-right')!.childIds = ['rect-d']
  document.shapes.find((shape) => shape.id === 'group-root')!.childIds = ['group-left', 'group-temp', 'group-right']
  return document
}

/**
 * Canonicalizes patches for stable local-vs-remote parity assertions.
 */
function canonicalizePatches(input: Array<Record<string, unknown>>) {
  return input
    .map((patch) => normalizeValue(patch))
    .map((patch) => JSON.stringify(patch))
    .sort()
}

/**
 * Recursively normalizes arrays/objects so JSON serialization remains deterministic.
 */
function normalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeValue(entry))
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .map(([key, nestedValue]) => [key, normalizeValue(nestedValue)] as const)

    return Object.fromEntries(entries)
  }

  return value
}

/**
 * Filters out selection-only patches because remote collaboration payloads never include local selection updates.
 */
function withoutSelectionPatches<T extends {type: string}>(patches: T[]): T[] {
  return patches.filter((patch) => patch.type !== 'set-selected-index')
}

test('group command local and remote patch planners stay structurally equivalent', () => {
  const document = createFlatGroupFixture()
  const scene = createSceneFixture(document)
  const command = {
    type: 'shape.group' as const,
    shapeIds: ['rect-a', 'rect-b'],
    groupId: 'group-new',
    name: 'Group New',
  }

  const localForward = createLocalHistoryEntry(command, scene, cloneDocument(document)).forward
  const remoteOperation = createLocalOperation(command, 'actor-1')
  const remotePatches = createRemotePatches(remoteOperation, scene, cloneDocument(document))

  assert.deepEqual(
    canonicalizePatches(withoutSelectionPatches(localForward) as Array<Record<string, unknown>>),
    canonicalizePatches(remotePatches as Array<Record<string, unknown>>),
  )
})

test('ungroup command local and remote patch planners stay structurally equivalent', () => {
  const document = createGroupedFixture()
  const scene = createSceneFixture(document)
  const command = {
    type: 'shape.ungroup' as const,
    groupId: 'group-temp',
  }

  const localForward = createLocalHistoryEntry(command, scene, cloneDocument(document)).forward
  const remoteOperation = createLocalOperation(command, 'actor-1')
  const remotePatches = createRemotePatches(remoteOperation, scene, cloneDocument(document))

  assert.deepEqual(
    canonicalizePatches(withoutSelectionPatches(localForward) as Array<Record<string, unknown>>),
    canonicalizePatches(remotePatches as Array<Record<string, unknown>>),
  )
})

test('reorder command local and remote patch planners emit equivalent reorder and sibling patches', () => {
  const document = createFlatGroupFixture()
  const scene = createSceneFixture(document)
  const command = {
    type: 'shape.reorder' as const,
    shapeId: 'rect-a',
    toIndex: 2,
  }

  const localForward = createLocalHistoryEntry(command, scene, cloneDocument(document)).forward
  const remoteOperation = createLocalOperation(command, 'actor-1')
  const remotePatches = createRemotePatches(remoteOperation, scene, cloneDocument(document))

  assert.deepEqual(
    canonicalizePatches(localForward as Array<Record<string, unknown>>),
    canonicalizePatches(remotePatches as Array<Record<string, unknown>>),
  )
})

/**
 * Verifies nested-group reorder planning stays equivalent between local and remote normalized planners.
 */
test('nested reorder command local and remote patch planners stay structurally equivalent', () => {
  const document = createNestedReorderFixture()
  const scene = createSceneFixture(document)
  const command = {
    type: 'shape.reorder' as const,
    shapeId: 'rect-c',
    toIndex: 0,
  }

  const localForward = createLocalHistoryEntry(command, scene, cloneDocument(document)).forward
  const remoteOperation = createLocalOperation(command, 'actor-1')
  const remotePatches = createRemotePatches(remoteOperation, scene, cloneDocument(document))

  assert.deepEqual(
    canonicalizePatches(localForward as Array<Record<string, unknown>>),
    canonicalizePatches(remotePatches as Array<Record<string, unknown>>),
  )
})

/**
 * Verifies regroup across different parent groups stays equivalent between local and remote planners.
 */
test('cross-parent group command local and remote patch planners stay structurally equivalent', () => {
  const document = createCrossParentFixture()
  const scene = createSceneFixture(document)
  const command = {
    type: 'shape.group' as const,
    shapeIds: ['rect-a', 'rect-c'],
    groupId: 'group-merge',
    name: 'Group Merge',
  }

  const localForward = createLocalHistoryEntry(command, scene, cloneDocument(document)).forward
  const remoteOperation = createLocalOperation(command, 'actor-1')
  const remotePatches = createRemotePatches(remoteOperation, scene, cloneDocument(document))

  assert.deepEqual(
    canonicalizePatches(withoutSelectionPatches(localForward) as Array<Record<string, unknown>>),
    canonicalizePatches(remotePatches as Array<Record<string, unknown>>),
  )
})

/**
 * Verifies nested ungroup planning stays equivalent between local and remote planners.
 */
test('nested ungroup command local and remote patch planners stay structurally equivalent', () => {
  const document = createNestedUngroupFixture()
  const scene = createSceneFixture(document)
  const command = {
    type: 'shape.ungroup' as const,
    groupId: 'group-temp',
  }

  const localForward = createLocalHistoryEntry(command, scene, cloneDocument(document)).forward
  const remoteOperation = createLocalOperation(command, 'actor-1')
  const remotePatches = createRemotePatches(remoteOperation, scene, cloneDocument(document))

  assert.deepEqual(
    canonicalizePatches(withoutSelectionPatches(localForward) as Array<Record<string, unknown>>),
    canonicalizePatches(remotePatches as Array<Record<string, unknown>>),
  )
})


