import assert from 'node:assert/strict'
import test from 'node:test'

import {createLocalHistoryEntry} from '../localHistoryEntry/localHistoryEntry.ts'
import {createRemotePatches} from '../remotePatches/remotePatches.ts'
import {createLocalOperation} from '../operationPayload.ts'
import {cloneDocument} from '../model.ts'
import {
  createCrossParentFixture,
  createFlatGroupFixture,
  createGroupedFixture,
  createMaskLinkedFixture,
  createMaskLinkedGroupedFixture,
  createNestedReorderFixture,
  createNestedUngroupFixture,
  createSceneFixture,
} from './normalizedPatchParity.fixtures.ts'
import {canonicalizePatches, withoutSelectionPatches} from './normalizedPatchParity.utils.ts'

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

/**
 * Verifies mask-linked reorder keeps local/remote parity while moving host/source as one block.
 */
test('mask-linked reorder command local and remote patch planners stay structurally equivalent', () => {
  const document = createMaskLinkedFixture()
  const scene = createSceneFixture(document)
  const command = {
    type: 'shape.reorder' as const,
    shapeId: 'image-host',
    toIndex: 3,
  }

  const localForward = createLocalHistoryEntry(command, scene, cloneDocument(document)).forward
  const remoteOperation = createLocalOperation(command, 'actor-1')
  const remotePatches = createRemotePatches(remoteOperation, scene, cloneDocument(document))

  assert.deepEqual(
    canonicalizePatches(localForward as Array<Record<string, unknown>>),
    canonicalizePatches(remotePatches as Array<Record<string, unknown>>),
  )

  const siblingPatch = localForward.find(
    (patch): patch is Extract<typeof patch, {type: 'set-group-children'}> => patch.type === 'set-group-children',
  )
  assert.ok(siblingPatch)
  assert.equal((siblingPatch?.nextChildIds ?? []).includes('image-host'), true)
  assert.equal((siblingPatch?.nextChildIds ?? []).includes('mask-source'), true)
})

/**
 * Verifies grouping from a mask host selection expands to linked source and keeps local/remote parity.
 */
test('mask-linked group command local and remote patch planners stay structurally equivalent', () => {
  const document = createMaskLinkedFixture()
  const scene = createSceneFixture(document)
  const command = {
    type: 'shape.group' as const,
    shapeIds: ['image-host', 'rect-a'],
    groupId: 'group-mask-new',
    name: 'Mask Group New',
  }

  const localForward = createLocalHistoryEntry(command, scene, cloneDocument(document)).forward
  const remoteOperation = createLocalOperation(command, 'actor-1')
  const remotePatches = createRemotePatches(remoteOperation, scene, cloneDocument(document))

  assert.deepEqual(
    canonicalizePatches(withoutSelectionPatches(localForward) as Array<Record<string, unknown>>),
    canonicalizePatches(remotePatches as Array<Record<string, unknown>>),
  )

  const groupedParentPatches = remotePatches
    .filter((patch): patch is Extract<typeof patch, {type: 'set-shape-parent'}> => patch.type === 'set-shape-parent')
    .map((patch) => patch.shapeId)
  assert.equal(groupedParentPatches.includes('image-host'), true)
  assert.equal(groupedParentPatches.includes('mask-source'), true)
})

/**
 * Verifies ungrouping a group that contains mask-linked children keeps local/remote parity.
 */
test('mask-linked ungroup command local and remote patch planners stay structurally equivalent', () => {
  const document = createMaskLinkedGroupedFixture()
  const scene = createSceneFixture(document)
  const command = {
    type: 'shape.ungroup' as const,
    groupId: 'group-mask',
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
 * Verifies isolation-scope mismatches are treated as full no-op on both local and remote reorder planners.
 */
test('out-of-scope isolation reorder stays no-op with local and remote parity', () => {
  const document = createFlatGroupFixture()
  const scene = createSceneFixture(document)
  const command = {
    type: 'shape.reorder' as const,
    shapeId: 'rect-a',
    toIndex: 2,
    isolationGroupId: 'group-out-of-scope',
  }

  const localForward = createLocalHistoryEntry(command, scene, cloneDocument(document)).forward
  const remoteOperation = createLocalOperation(command, 'actor-1')
  const remotePatches = createRemotePatches(remoteOperation, scene, cloneDocument(document))

  assert.equal(localForward.length, 0)
  assert.equal(remotePatches.length, 0)
  assert.deepEqual(
    canonicalizePatches(localForward as Array<Record<string, unknown>>),
    canonicalizePatches(remotePatches as Array<Record<string, unknown>>),
  )
})


