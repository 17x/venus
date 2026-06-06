import assert from 'node:assert/strict'
import test from 'node:test'

import {createEditorRuntimeCommandController} from '../../../product/runtime/createEditorRuntimeCommandController.ts'
import {
  resolveVector2DCommandContract,
  resolveVector2DCommandEnvelopeSource,
  VECTOR2D_COMMAND_FAMILIES,
  type Vector2DCommandFamily,
} from '../../../product/runtime/commandContract.ts'
import type {EditorRuntimeInteractionEvent, EditorRuntimeLastCommandMeta} from '../../../product/runtime/useEditorRuntimeInteractionBridge.ts'
import {createRuntimeEditingModeController} from '../../../runtime/editing-modes/controller.ts'
import {createSelectionDragController, createTransformSessionManager} from '../../../runtime/interaction/index.ts'
import {createMatrixFirstNodeTransform} from '../../../runtime/interaction/transformSessionGeometry.ts'
import type {EditorRuntimeCommand} from '../../../runtime/worker/index.ts'

const EXPECTED_FAMILIES: Vector2DCommandFamily[] = [
  'file',
  'history',
  'selection',
  'transform',
  'style',
  'path',
  'text',
  'layer',
  'shape',
  'group',
  'mask',
  'boolean',
  'viewport',
  'tool',
  'snapping',
  'export',
]

function createNoopSetter<TValue>() {
  return (_next: TValue | ((current: TValue) => TValue)) => {}
}

function createTransformFixture(x: number, y: number) {
  return createMatrixFirstNodeTransform({
    shapeId: 'shape-1',
    x,
    y,
    width: 10,
    height: 10,
    rotation: 0,
    flipX: false,
    flipY: false,
  })
}

function createRuntimeCommandSamples(): EditorRuntimeCommand[] {
  const shape = {
    id: 'shape-inserted',
    type: 'rectangle' as const,
    name: 'Inserted',
    parentId: null,
    x: 0,
    y: 0,
    width: 10,
    height: 10,
  }

  return [
    {type: 'history.undo'},
    {type: 'history.redo'},
    {type: 'snapping.pause'},
    {type: 'snapping.resume'},
    {type: 'group.enter-isolation', groupId: 'group-1'},
    {type: 'group.exit-isolation'},
    {type: 'mask.create'},
    {type: 'mask.release'},
    {type: 'mask.select-host'},
    {type: 'mask.select-source'},
    {type: 'selection.cycle-hit-target'},
    {type: 'viewport.fit'},
    {type: 'viewport.zoomIn'},
    {type: 'viewport.zoomOut'},
    {type: 'selection.delete'},
    {type: 'selection.set', shapeIds: ['shape-1', 'shape-2'], mode: 'replace'},
    {type: 'tool.select', tool: 'select', toolName: 'selector'},
    {type: 'shape.rename', shapeId: 'shape-1', name: 'Renamed'},
    {type: 'shape.move', shapeId: 'shape-1', x: 1, y: 2},
    {type: 'shape.resize', shapeId: 'shape-1', width: 11, height: 12},
    {type: 'shape.rotate', shapeId: 'shape-1', rotation: 15},
    {type: 'shape.rotate.batch', rotations: [{shapeId: 'shape-1', rotation: 15}]},
    {
      type: 'shape.transform.batch',
      transforms: [{id: 'shape-1', fromMatrix: createTransformFixture(0, 0), toMatrix: createTransformFixture(4, 6)}],
    },
    {type: 'shape.patch', shapeId: 'shape-1', patch: {cornerRadius: 4}},
    {type: 'shape.set-clip', shapeId: 'shape-1', clipPathId: 'shape-mask', clipRule: 'nonzero'},
    {type: 'shape.reorder', shapeId: 'shape-1', toIndex: 2},
    {type: 'shape.insert', shape},
    {type: 'shape.insert.batch', shapes: [shape]},
    {type: 'shape.remove', shapeId: 'shape-1'},
    {type: 'shape.group', shapeIds: ['shape-1', 'shape-2'], groupId: 'group-1'},
    {type: 'shape.ungroup', groupId: 'group-1'},
    {type: 'shape.convert-to-path', shapeIds: ['shape-1']},
    {type: 'shape.boolean', shapeIds: ['shape-1', 'shape-2'], mode: 'union'},
    {type: 'shape.align', shapeIds: ['shape-1', 'shape-2'], mode: 'left'},
    {type: 'shape.distribute', shapeIds: ['shape-1', 'shape-2'], mode: 'hspace'},
  ]
}

test('Vector2D command taxonomy exposes commercial command families', () => {
  assert.deepEqual(VECTOR2D_COMMAND_FAMILIES.map((item) => item.family), EXPECTED_FAMILIES)
  assert.equal(VECTOR2D_COMMAND_FAMILIES.find((item) => item.family === 'file')?.requiresRuntimeDispatch, false)
  assert.equal(VECTOR2D_COMMAND_FAMILIES.find((item) => item.family === 'selection')?.ownsDocumentMutation, true)
  assert.equal(VECTOR2D_COMMAND_FAMILIES.find((item) => item.family === 'export')?.ownsDocumentMutation, false)
})

test('Vector2D runtime command contract classifies current worker commands', () => {
  const contracts = createRuntimeCommandSamples().map((command) => resolveVector2DCommandContract(command))
  const familyByType = new Map(contracts.map((contract) => [contract.commandType, contract.family]))

  assert.equal(familyByType.get('selection.set'), 'selection')
  assert.equal(familyByType.get('shape.transform.batch'), 'transform')
  assert.equal(familyByType.get('shape.patch'), 'style')
  assert.equal(familyByType.get('shape.convert-to-path'), 'path')
  assert.equal(familyByType.get('shape.rename'), 'text')
  assert.equal(familyByType.get('shape.reorder'), 'layer')
  assert.equal(familyByType.get('shape.group'), 'group')
  assert.equal(familyByType.get('shape.set-clip'), 'mask')
  assert.equal(familyByType.get('shape.boolean'), 'boolean')
  assert.equal(familyByType.get('viewport.fit'), 'viewport')
  assert.equal(familyByType.get('tool.select'), 'tool')
  assert.equal(familyByType.get('snapping.pause'), 'snapping')

  contracts.forEach((contract) => {
    assert.equal(contract.diagnostics.includes(`v2d.command.family.${contract.family}`), true)
    assert.equal(contract.diagnostics.includes(`v2d.command.beforeAfter.${contract.beforeAfterPolicy}`), true)
    assert.equal(contract.diagnostics.includes(`v2d.command.merge.${contract.mergePolicy}`), true)
  })
})

test('Vector2D command contract resolves target ids and policies for representative commands', () => {
  assert.deepEqual(resolveVector2DCommandContract({type: 'selection.set', shapeIds: ['a', 'b']}).targetIds, ['a', 'b'])
  assert.deepEqual(resolveVector2DCommandContract({type: 'shape.move', shapeId: 'a', x: 1, y: 2}).targetIds, ['a'])
  assert.deepEqual(
    resolveVector2DCommandContract({type: 'shape.rotate.batch', rotations: [{shapeId: 'a', rotation: 1}]}).targetIds,
    ['a'],
  )
  assert.equal(resolveVector2DCommandContract({type: 'shape.move', shapeId: 'a', x: 1, y: 2}).mergePolicy, 'continuous')
  assert.equal(resolveVector2DCommandContract({type: 'shape.boolean', shapeIds: ['a', 'b'], mode: 'union'}).mergePolicy, 'transaction')
  assert.equal(resolveVector2DCommandContract({type: 'viewport.fit'}).beforeAfterPolicy, 'viewport-state')
})

test('Vector2D command envelope source policy keeps root and derived dispatch distinct', () => {
  assert.equal(resolveVector2DCommandEnvelopeSource({dispatchDepth: 0}), 'user')
  assert.equal(resolveVector2DCommandEnvelopeSource({dispatchDepth: 1}), 'derived')
  assert.equal(resolveVector2DCommandEnvelopeSource({dispatchDepth: 3}), 'derived')
  assert.equal(resolveVector2DCommandEnvelopeSource({dispatchDepth: 0, requestedSource: 'system'}), 'system')
})

test('runtime command controller publishes command contract metadata with dispatch events', () => {
  const dispatchedCommands: Array<{command: EditorRuntimeCommand; meta: unknown}> = []
  const dispatchedEvents: EditorRuntimeInteractionEvent[] = []
  const lastCommandMetaRecords: EditorRuntimeLastCommandMeta[] = []

  const controller = createEditorRuntimeCommandController({
    add: () => {},
    canvasRuntime: {
      dispatchCommand: (command: EditorRuntimeCommand, meta: unknown) => {
        dispatchedCommands.push({command, meta})
      },
      document: {id: 'doc', name: 'Doc', width: 100, height: 100, shapes: []},
      viewport: {scale: 1, viewportWidth: 100, viewportHeight: 100},
      requestEngineGeometry: () => ({pointHitNodeIds: []}),
    } as unknown as Parameters<typeof createEditorRuntimeCommandController>[0]['canvasRuntime'],
    selectedNode: null,
    interactionDocument: {id: 'doc', name: 'Doc', width: 100, height: 100, shapes: []},
    previewShapes: [],
    currentTool: 'selector',
    selectedShapeIds: [],
    getLastCanvasPoint: () => null,
    clearTransformPreview: () => {},
    transformManagerRef: {current: createTransformSessionManager()},
    selectionDragControllerRef: {current: createSelectionDragController()},
    setActiveTransformHandle: createNoopSetter(),
    setHoveredTransformHandle: createNoopSetter(),
    setDraftPrimitive: createNoopSetter(),
    setPathHandleDrag: createNoopSetter(),
    setShapeStyleHandleDrag: createNoopSetter(),
    setSelectorOverlayItems: createNoopSetter(),
    setSnappingEnabled: createNoopSetter(),
    setSnapGuides: createNoopSetter(),
    setIsolationGroupId: createNoopSetter(),
    runtimeEditingModeControllerRef: {current: createRuntimeEditingModeController('idle')},
    setLastCommandType: () => {},
    setLastCommandMeta: (next) => {
      if (next) {
        lastCommandMetaRecords.push(next)
      }
    },
    dispatchRuntimeEvent: (event) => {
      dispatchedEvents.push(event)
    },
  })

  controller.handleRuntimeCommand({type: 'shape.move', shapeId: 'shape-1', x: 10, y: 12})

  assert.equal(dispatchedCommands.length, 1)
  const lastCommandMeta = lastCommandMetaRecords[lastCommandMetaRecords.length - 1]
  assert.ok(lastCommandMeta, 'controller should publish last command metadata')
  assert.equal(lastCommandMeta?.commandFamily, 'transform')
  assert.equal(lastCommandMeta?.beforeAfterPolicy, 'document-patch')
  assert.equal(lastCommandMeta?.mergePolicy, 'continuous')

  const event = dispatchedEvents.find((item) => item.type === 'runtime.command.dispatched')
  assert.equal(event?.type, 'runtime.command.dispatched')
  if (event?.type === 'runtime.command.dispatched') {
    assert.equal(event.commandFamily, 'transform')
    assert.equal(event.beforeAfterPolicy, 'document-patch')
    assert.equal(event.mergePolicy, 'continuous')
    assert.equal(event.commandSource, 'user')
  }
})

test('runtime command controller keeps transaction ids monotonic across controller recreation', () => {
  const transactionIds: string[] = []
  const createController = () => createEditorRuntimeCommandController({
    add: () => {},
    canvasRuntime: {
      dispatchCommand: (_command: EditorRuntimeCommand, meta: {transactionId: string}) => {
        transactionIds.push(meta.transactionId)
      },
      document: {id: 'doc', name: 'Doc', width: 100, height: 100, shapes: []},
      viewport: {scale: 1, viewportWidth: 100, viewportHeight: 100},
      requestEngineGeometry: () => ({pointHitNodeIds: []}),
    } as unknown as Parameters<typeof createEditorRuntimeCommandController>[0]['canvasRuntime'],
    selectedNode: null,
    interactionDocument: {id: 'doc', name: 'Doc', width: 100, height: 100, shapes: []},
    previewShapes: [],
    currentTool: 'selector',
    selectedShapeIds: [],
    getLastCanvasPoint: () => null,
    clearTransformPreview: () => {},
    transformManagerRef: {current: createTransformSessionManager()},
    selectionDragControllerRef: {current: createSelectionDragController()},
    setActiveTransformHandle: createNoopSetter(),
    setHoveredTransformHandle: createNoopSetter(),
    setDraftPrimitive: createNoopSetter(),
    setPathHandleDrag: createNoopSetter(),
    setShapeStyleHandleDrag: createNoopSetter(),
    setSelectorOverlayItems: createNoopSetter(),
    setSnappingEnabled: createNoopSetter(),
    setSnapGuides: createNoopSetter(),
    setIsolationGroupId: createNoopSetter(),
    runtimeEditingModeControllerRef: {current: createRuntimeEditingModeController('idle')},
    setLastCommandType: () => {},
    setLastCommandMeta: () => {},
    dispatchRuntimeEvent: () => {},
  })

  createController().handleRuntimeCommand({type: 'shape.move', shapeId: 'shape-1', x: 10, y: 12})
  createController().handleRuntimeCommand({type: 'shape.move', shapeId: 'shape-1', x: 20, y: 24})

  assert.equal(transactionIds.length, 2)
  assert.notEqual(transactionIds[0], transactionIds[1])
})
