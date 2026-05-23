import assert from 'node:assert/strict'
import test from 'node:test'

import type {EditorDocument} from '../../../model/index.ts'

import {createSceneMemory} from '../../../shared-memory/index.ts'
import type {EditorWorkerMessage, SceneUpdateMessage} from '../../protocol.ts'
import {bindEditorWorkerScope} from '../bindEditorWorkerScope.ts'
import {resetRuntimeV2DualWriteDiagnostics} from '../operations/operations.ts'

/**
 * Creates one persisted crash-recovery replay fixture consumed by worker init.
 */
function createCrashRecoveryReplayFixture() {
  return {
    maxEntries: 20,
    localOnly: {
      mode: 'local-only' as const,
      entries: [
        {
          id: 'local-recovery-1',
          label: 'Move Shape',
          source: 'local' as const,
          forward: [
            {shapeId: 'rect-1', previous: {x: 10}, next: {x: 20}},
          ],
          backward: [
            {shapeId: 'rect-1', previous: {x: 20}, next: {x: 10}},
          ],
          transactionId: 'tx-local-1',
          issuedAt: 100,
        },
      ],
    },
    merged: {
      mode: 'merged' as const,
      entries: [
        {
          id: 'local-recovery-1',
          label: 'Move Shape',
          source: 'local' as const,
          forward: [
            {shapeId: 'rect-1', previous: {x: 10}, next: {x: 20}},
          ],
          backward: [
            {shapeId: 'rect-1', previous: {x: 20}, next: {x: 10}},
          ],
          transactionId: 'tx-local-1',
          issuedAt: 100,
        },
        {
          id: 'remote-recovery-1',
          label: 'Remote Resize',
          source: 'remote' as const,
          forward: [
            {shapeId: 'rect-2', previous: {width: 80}, next: {width: 96}},
          ],
          backward: [
            {shapeId: 'rect-2', previous: {width: 96}, next: {width: 80}},
          ],
          issuedAt: 101,
        },
      ],
    },
  }
}

/**
 * Creates one compact document fixture with sibling shapes for structural command tests.
 */
function createWorkerFixtureDocument(): EditorDocument {
  return {
    id: 'doc-worker',
    name: 'worker fixture',
    width: 1000,
    height: 1000,
    shapes: [
      {
        id: 'rect-1',
        type: 'rectangle',
        name: 'Rect 1',
        parentId: null,
        x: 10,
        y: 10,
        width: 80,
        height: 60,
      },
      {
        id: 'rect-2',
        type: 'rectangle',
        name: 'Rect 2',
        parentId: null,
        x: 110,
        y: 10,
        width: 80,
        height: 60,
      },
    ],
  }
}

/**
 * Creates a minimal worker-scope mock that can capture postMessage output and replay message events.
 */
function createWorkerScopeMock() {
  const postedMessages: SceneUpdateMessage[] = []
  let messageListener: ((event: MessageEvent<EditorWorkerMessage>) => void) | null = null

  const scope = {
    // Capture one message listener because bindEditorWorkerScope only registers on the message channel.
    addEventListener(type: string, listener: (event: MessageEvent<EditorWorkerMessage>) => void) {
      if (type === 'message') {
        messageListener = listener
      }
    },
    // Collect scene-ready/scene-update payloads so tests can assert runtimeV2 diagnostics forwarding.
    postMessage(message: SceneUpdateMessage) {
      postedMessages.push(message)
    },
  }

  return {
    scope,
    postedMessages,
    // Replay one worker inbound message through the captured listener.
    emitMessage(message: EditorWorkerMessage) {
      if (!messageListener) {
        throw new Error('worker message listener was not registered')
      }
      messageListener({data: message} as MessageEvent<EditorWorkerMessage>)
    },
  }
}

/**
 * Returns the last posted scene update message, or null when none was posted yet.
 */
function getLastPostedMessage(messages: SceneUpdateMessage[]): SceneUpdateMessage | null {
  // Use index math instead of Array.at to stay compatible with current TS lib target.
  return messages.length > 0 ? messages[messages.length - 1] : null
}

/**
 * Asserts scene-ready payload includes runtime-v2 diagnostics defaults right after worker init.
 */
test('bindEditorWorkerScope posts runtimeV2 diagnostics on scene-ready after init', () => {
  // Reset shared diagnostics singleton so expected counters start from zero.
  resetRuntimeV2DualWriteDiagnostics()

  const workerMock = createWorkerScopeMock()
  bindEditorWorkerScope(workerMock.scope as unknown as DedicatedWorkerGlobalScope)

  const document = createWorkerFixtureDocument()
  workerMock.emitMessage({
    type: 'init',
    buffer: createSceneMemory(32),
    capacity: 32,
    document,
  })

  const sceneReadyMessage = getLastPostedMessage(workerMock.postedMessages)
  assert.ok(sceneReadyMessage)
  assert.equal(sceneReadyMessage?.type, 'scene-ready')
  assert.deepEqual(sceneReadyMessage?.runtimeV2, {
    checks: 0,
    mismatches: 0,
    lastCommandType: null,
    lastIssues: [],
    frameBoundaryChecks: 1,
    frameBoundaryMismatches: 0,
    lastFrameBoundaryIssues: [],
    strictModeEnabled: false,
  })
})

/**
 * Asserts worker startup consumes crash-recovery replay entries into history stacks.
 */
test('bindEditorWorkerScope hydrates history from crash recovery replay on init', () => {
  resetRuntimeV2DualWriteDiagnostics()

  const workerMock = createWorkerScopeMock()
  bindEditorWorkerScope(workerMock.scope as unknown as DedicatedWorkerGlobalScope)

  workerMock.emitMessage({
    type: 'init',
    buffer: createSceneMemory(32),
    capacity: 32,
    document: createWorkerFixtureDocument(),
    crashRecoveryReplay: createCrashRecoveryReplayFixture(),
  })

  const sceneReadyMessage = getLastPostedMessage(workerMock.postedMessages)
  assert.ok(sceneReadyMessage)
  assert.equal(sceneReadyMessage?.type, 'scene-ready')
  assert.deepEqual(
    sceneReadyMessage?.history.entries.map((entry) => entry.id),
    ['init', 'local-recovery-1', 'remote-recovery-1'],
  )
  assert.equal(sceneReadyMessage?.history.entries.some((entry) => entry.id === 'scene-ready'), false)
  assert.equal(sceneReadyMessage?.history.recoveryReplay.localOnly.entries.length >= 1, true)
  assert.equal(sceneReadyMessage?.history.recoveryReplay.merged.entries.length >= 2, true)
})

/**
 * Asserts startup replay mode local-only excludes remote replay entries from worker hydration.
 */
test('bindEditorWorkerScope hydrates local-only replay mode without remote history entries', () => {
  resetRuntimeV2DualWriteDiagnostics()

  const workerMock = createWorkerScopeMock()
  bindEditorWorkerScope(workerMock.scope as unknown as DedicatedWorkerGlobalScope)

  workerMock.emitMessage({
    type: 'init',
    buffer: createSceneMemory(32),
    capacity: 32,
    document: createWorkerFixtureDocument(),
    crashRecoveryReplayMode: 'local-only',
    crashRecoveryReplay: createCrashRecoveryReplayFixture(),
  })

  const sceneReadyMessage = getLastPostedMessage(workerMock.postedMessages)
  assert.ok(sceneReadyMessage)
  assert.equal(sceneReadyMessage?.type, 'scene-ready')
  assert.deepEqual(
    sceneReadyMessage?.history.entries.map((entry) => entry.id),
    ['init', 'local-recovery-1'],
  )
  assert.equal(sceneReadyMessage?.history.entries.some((entry) => entry.id === 'remote-recovery-1'), false)
})

/**
 * Asserts scene-update payload includes incremented runtime-v2 diagnostics after migration-sensitive command handling.
 */
test('bindEditorWorkerScope posts runtimeV2 diagnostics on scene-update after structural command', () => {
  // Reset singleton diagnostics so this test can assert exact counter deltas.
  resetRuntimeV2DualWriteDiagnostics()

  const workerMock = createWorkerScopeMock()
  bindEditorWorkerScope(workerMock.scope as unknown as DedicatedWorkerGlobalScope)

  const document = createWorkerFixtureDocument()
  workerMock.emitMessage({
    type: 'init',
    buffer: createSceneMemory(32),
    capacity: 32,
    document,
  })

  workerMock.emitMessage({
    type: 'command',
    command: {
      type: 'shape.group',
      shapeIds: ['rect-1', 'rect-2'],
      groupId: 'group-1',
      name: 'Group 1',
    },
  })

  const sceneUpdateMessage = getLastPostedMessage(workerMock.postedMessages)
  assert.ok(sceneUpdateMessage)
  assert.equal(sceneUpdateMessage?.type, 'scene-update')
  // Group command is migration-sensitive, so diagnostics checks should be incremented.
  assert.equal((sceneUpdateMessage?.runtimeV2?.checks ?? 0) >= 1, true)
  assert.equal(sceneUpdateMessage?.runtimeV2?.mismatches, 0)
  // Frame-boundary invariant checks run for every scene post, including command updates.
  assert.equal((sceneUpdateMessage?.runtimeV2?.frameBoundaryChecks ?? 0) >= 2, true)
  assert.equal(sceneUpdateMessage?.runtimeV2?.strictModeEnabled, false)
})

/**
 * Asserts collaboration structural operations also update runtime-v2 diagnostics counters in scene-update payloads.
 */
test('bindEditorWorkerScope posts runtimeV2 diagnostics on scene-update after collaboration remove', () => {
  // Reset singleton diagnostics so remote structural operation check count starts from zero.
  resetRuntimeV2DualWriteDiagnostics()

  const workerMock = createWorkerScopeMock()
  bindEditorWorkerScope(workerMock.scope as unknown as DedicatedWorkerGlobalScope)

  const document = createWorkerFixtureDocument()
  workerMock.emitMessage({
    type: 'init',
    buffer: createSceneMemory(32),
    capacity: 32,
    document,
  })

  workerMock.emitMessage({
    type: 'collaboration.receive',
    operation: {
      id: 'remote-remove-1',
      type: 'shape.remove',
      actorId: 'remote-user',
      payload: {
        shapeId: 'rect-2',
      },
    },
  })

  const sceneUpdateMessage = getLastPostedMessage(workerMock.postedMessages)
  assert.ok(sceneUpdateMessage)
  assert.equal(sceneUpdateMessage?.type, 'scene-update')
  // Remote remove is now tracked as migration-sensitive structural ownership change.
  assert.equal((sceneUpdateMessage?.runtimeV2?.checks ?? 0) >= 1, true)
  // Frame-boundary invariant checks run for both init scene-ready and collaboration scene-update posts.
  assert.equal((sceneUpdateMessage?.runtimeV2?.frameBoundaryChecks ?? 0) >= 2, true)
})
