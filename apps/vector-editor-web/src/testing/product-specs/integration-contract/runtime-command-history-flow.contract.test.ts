import assert from 'node:assert/strict'
import test from 'node:test'

import {resolveVector2DCommandContract} from '../../../product/runtime/commandContract.ts'
import {createCollaborationManager} from '../../../runtime/worker/collaboration.ts'
import {createHistoryManager} from '../../../runtime/worker/history.ts'
import {createLocalHistoryEntry} from '../../../runtime/worker/scope/localHistoryEntry/localHistoryEntry.ts'
import {createSceneFixture} from '../../../runtime/worker/scope/normalizedPatchParity/normalizedPatchParity.fixtures.ts'
import {handleLocalCommand} from '../../../runtime/worker/scope/operations/operations.ts'
import {createWorkerSpatialIndex} from '../../../runtime/worker/scope/types.ts'
import type {EditorDocument} from '../../../runtime/model/index.ts'
import type {EditorRuntimeCommand, RuntimeCommandEnvelopeMeta} from '../../../runtime/worker/protocol.ts'
import {createCanonicalDocumentModelFixture} from '../document-structure/canonicalDocumentFixture.ts'

function createReplayDocument(): EditorDocument {
  return {
    id: 'history-replay-document',
    name: 'History Replay Document',
    width: 800,
    height: 600,
    shapes: [
      {
        id: 'rect-a',
        type: 'rectangle',
        name: 'Rectangle A',
        parentId: null,
        x: 10,
        y: 20,
        width: 100,
        height: 80,
        rotation: 0,
        flipX: false,
        flipY: false,
        fill: {enabled: true, color: '#2563eb'},
      },
      {
        id: 'text-a',
        type: 'text',
        name: 'Text A',
        text: 'Text A',
        parentId: null,
        x: 160,
        y: 40,
        width: 180,
        height: 48,
        rotation: 0,
      },
    ],
  }
}

function createCommandMeta(index: number, transactionId: string, source: RuntimeCommandEnvelopeMeta['commandSource'] = 'user') {
  return {
    commandId: `history-command-${index}`,
    transactionId,
    commandSource: source,
    issuedAt: 1000 + index,
  } satisfies RuntimeCommandEnvelopeMeta
}

function createDocumentSignature(document: EditorDocument) {
  return JSON.stringify(document)
}

test('Vector2D worker history deterministically merges, rolls back, and replays representative command families', () => {
  const document = createReplayDocument()
  const scene = createSceneFixture(document)
  const spatialIndex = createWorkerSpatialIndex()
  const history = createHistoryManager()
  const collaboration = createCollaborationManager()
  const initialSignature = createDocumentSignature(document)
  const commands: Array<{command: EditorRuntimeCommand; meta: RuntimeCommandEnvelopeMeta}> = [
    {
      command: {type: 'shape.move', shapeId: 'rect-a', x: 20, y: 30},
      meta: createCommandMeta(1, 'txn-transform'),
    },
    {
      command: {type: 'shape.move', shapeId: 'rect-a', x: 40, y: 50},
      meta: createCommandMeta(2, 'txn-transform', 'derived'),
    },
    {
      command: {
        type: 'shape.patch',
        shapeId: 'rect-a',
        patch: {fill: {enabled: true, color: '#f97316'}, cornerRadius: 12},
      },
      meta: createCommandMeta(3, 'txn-style'),
    },
    {
      command: {type: 'shape.rename', shapeId: 'text-a', name: 'Renamed Text', text: 'Renamed Text'},
      meta: createCommandMeta(4, 'txn-text'),
    },
    {
      command: {
        type: 'shape.insert',
        shape: {
          id: 'ellipse-a',
          type: 'ellipse',
          name: 'Ellipse A',
          parentId: null,
          x: 360,
          y: 80,
          width: 90,
          height: 70,
        },
      },
      meta: createCommandMeta(5, 'txn-shape-insert'),
    },
    {
      command: {type: 'shape.remove', shapeId: 'ellipse-a'},
      meta: createCommandMeta(6, 'txn-shape-remove'),
    },
  ]

  commands.forEach(({command, meta}) => {
    handleLocalCommand(command, scene, document, spatialIndex, history, collaboration, meta)
  })

  const finalSignature = createDocumentSignature(document)
  const summary = history.getSummary()
  assert.notEqual(finalSignature, initialSignature)
  assert.equal(summary.entries.length, 5, 'two continuous transform commands in one transaction should merge')
  assert.deepEqual(summary.transactionGroups.map((group) => group.transactionId), [
    'txn-transform',
    'txn-style',
    'txn-text',
    'txn-shape-insert',
    'txn-shape-remove',
  ])
  assert.deepEqual(history.getRecoveryReplay().localOnly.entries.map((entry) => entry.transactionId), [
    'txn-transform',
    'txn-style',
    'txn-text',
    'txn-shape-insert',
    'txn-shape-remove',
  ])
  assert.equal(history.getRecoveryReplay().localOnly.entries[0]?.forward.length, 2)
  assert.equal(history.getRecoveryReplay().localOnly.entries[0]?.backward.length, 2)

  for (let index = 0; index < summary.entries.length; index += 1) {
    handleLocalCommand({type: 'history.undo'}, scene, document, spatialIndex, history, collaboration)
  }
  assert.equal(createDocumentSignature(document), initialSignature)
  assert.equal(history.getSummary().canUndo, false)
  assert.equal(history.getSummary().canRedo, true)

  for (let index = 0; index < summary.entries.length; index += 1) {
    handleLocalCommand({type: 'history.redo'}, scene, document, spatialIndex, history, collaboration)
  }
  assert.equal(createDocumentSignature(document), finalSignature)
  assert.equal(history.getSummary().canUndo, true)
  assert.equal(history.getSummary().canRedo, false)
})

test('Vector2D structural command families emit deterministic reversible history plans', () => {
  const commandCases: Array<{command: EditorRuntimeCommand; family: string}> = [
    {command: {type: 'shape.reorder', shapeId: 'fixture-rect', toIndex: 3}, family: 'layer'},
    {command: {type: 'shape.set-clip', shapeId: 'fixture-image', clipPathId: 'fixture-rect'}, family: 'mask'},
    {
      command: {type: 'shape.group', shapeIds: ['fixture-rect', 'fixture-ellipse'], groupId: 'history-fixture-group'},
      family: 'group',
    },
    {command: {type: 'shape.convert-to-path', shapeIds: ['fixture-rect']}, family: 'path'},
    {command: {type: 'shape.boolean', shapeIds: ['fixture-rect', 'fixture-ellipse'], mode: 'union'}, family: 'boolean'},
    {
      command: {type: 'shape.align', shapeIds: ['fixture-rect', 'fixture-ellipse'], mode: 'left', reference: 'selection'},
      family: 'transform',
    },
    {
      command: {type: 'shape.distribute', shapeIds: ['fixture-rect', 'fixture-ellipse', 'fixture-polygon'], mode: 'hspace'},
      family: 'transform',
    },
  ]

  commandCases.forEach(({command, family}) => {
    const firstDocument = createCanonicalDocumentModelFixture()
    const secondDocument = createCanonicalDocumentModelFixture()
    const firstEntry = createLocalHistoryEntry(command, createSceneFixture(firstDocument), firstDocument)
    const secondEntry = createLocalHistoryEntry(command, createSceneFixture(secondDocument), secondDocument)

    assert.equal(resolveVector2DCommandContract(command).family, family)
    assert.ok(firstEntry.forward.length > 0, `${command.type} should emit forward patches`)
    assert.ok(firstEntry.backward.length > 0, `${command.type} should emit backward patches`)
    assert.deepEqual(firstEntry.forward, secondEntry.forward, `${command.type} forward plan should be deterministic`)
    assert.deepEqual(firstEntry.backward, secondEntry.backward, `${command.type} rollback plan should be deterministic`)
  })
})
