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


