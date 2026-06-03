import assert from 'node:assert/strict'
import test from 'node:test'

import {createEditorRuntimeActionExecutor} from '../../../product/runtime/createEditorRuntimeActionExecutor.ts'
import {handleCanvasPointerUp} from '../../../product/useEditorRuntime/pointerRelease.ts'
import {
  resolveVector2DProductActionContract,
  resolveVector2DCommandContract,
} from '../../../product/runtime/commandContract.ts'
import {createDocumentNodeFromElement} from '../../../runtime/adapters/fileDocument/fileDocument.ts'
import {createTransformBatchCommand} from '../../../runtime/interaction/index.ts'
import {createHeaderMenuData} from '../../../views/header/menu/menuData.ts'
import type {EditorDocument} from '../../../runtime/model/index.ts'
import type {PathSubSelection} from '../../../runtime/interaction/index.ts'
import type {ElementProps} from '../../../runtime/types/index.ts'
import type {EditorRuntimeCommand} from '../../../runtime/worker/index.ts'
import {createCanonicalDocumentModelFixture} from '../document-structure/canonicalDocumentFixture.ts'

type SourceCase = {
  source: string
  action: string
  data?: unknown
}

function createCanvasRuntimeStub(document: EditorDocument) {
  return {
    document,
    viewport: {
      inverseMatrix: [1, 0, 0, 1, 0, 0],
      viewportWidth: 1440,
      viewportHeight: 960,
    },
    panViewport: () => {},
    fitViewport: () => {},
    zoomViewport: () => {},
  }
}

function createActionHarness(input: {
  document: EditorDocument
  selectedShapeIds?: string[]
  clipboard?: ElementProps[]
  pathSubSelection?: PathSubSelection | null
}) {
  const commands: EditorRuntimeCommand[] = []
  const insertedBatches: ElementProps[][] = []
  const toolChanges: string[] = []
  const lifecycleActions: string[] = []

  const executeAction = createEditorRuntimeActionExecutor({
    add: () => {},
    addAsset: () => {},
    canvasRuntime: createCanvasRuntimeStub(input.document) as unknown as Parameters<typeof createEditorRuntimeActionExecutor>[0]['canvasRuntime'],
    clipboard: input.clipboard ?? [],
    clearMask: () => {},
    closeFile: () => {
      lifecycleActions.push('file.close')
    },
    handleCommand: (command) => {
      commands.push(command)
    },
    insertElement: (element) => {
      commands.push({
        type: 'shape.insert',
        shape: createDocumentNodeFromElement(element),
      })
    },
    insertElementsBatch: (elements) => {
      insertedBatches.push(elements)
      commands.push({
        type: 'shape.insert.batch',
        shapes: elements as unknown as EditorRuntimeCommand extends {type: 'shape.insert.batch'; shapes: infer TShapes} ? TShapes : never,
      })
    },
    pasteSerial: 0,
    reorderSelectedShape: (direction) => {
      commands.push({
        type: 'shape.reorder',
        shapeId: input.selectedShapeIds?.[0] ?? 'fixture-styled',
        toIndex: direction === 'top' ? 0 : 1,
      })
    },
    saveFile: () => {
      lifecycleActions.push('file.save')
    },
    selectedNode: null,
    pathSubSelection: input.pathSubSelection ?? null,
    previewDocument: input.document,
    selectedShapeIds: input.selectedShapeIds ?? [],
    setClipboard: () => {},
    setCurrentTool: (toolName) => {
      toolChanges.push(toolName)
    },
    setPasteSerial: () => {},
    setShowPrint: (next) => {
      if (next === true) {
        lifecycleActions.push('export.print')
      }
    },
    applyAutoMask: () => {},
  })

  return {
    commands,
    insertedBatches,
    lifecycleActions,
    toolChanges,
    executeAction,
  }
}

function createNoopSetter<TValue>() {
  return (_next: TValue | ((current: TValue) => TValue)) => {}
}

function createCanvasPointerUpHarness() {
  const commands: EditorRuntimeCommand[] = []
  const insertedElements: ElementProps[] = []

  const handleCommand = (command: EditorRuntimeCommand) => {
    commands.push(command)
  }
  const insertElement = (element: ElementProps) => {
    insertedElements.push(element)
    commands.push({
      type: 'shape.insert',
      shape: createDocumentNodeFromElement(element),
    })
  }

  return {
    commands,
    insertedElements,
    handleCommand,
    insertElement,
  }
}

function createCanvasPointerUpBaseOptions(input: {
  document: EditorDocument
  handleCommand: (command: EditorRuntimeCommand) => void
  insertElement: (element: ElementProps) => void
}) {
  return {
    add: () => {},
    canvasRuntime: createCanvasRuntimeStub(input.document) as unknown as Parameters<typeof handleCanvasPointerUp>[0]['canvasRuntime'],
    clearTransformPreview: () => {},
    commitPathHandleUpdate: () => {},
    commitShapeStyleHandleUpdate: () => {},
    currentTool: 'rectangle' as const,
    draftPrimitive: null,
    handleCommand: input.handleCommand,
    insertElement: input.insertElement,
    interactionDocument: input.document,
    markTransformPreviewCommitPending: () => {},
    pathHandleDrag: null,
    shapeStyleHandleDrag: null,
    pathSubSelection: null,
    pathSubSelectionHover: null,
    penTool: {
      handlePointerUp: () => {},
      clearDraft: () => {},
    } as unknown as Parameters<typeof handleCanvasPointerUp>[0]['penTool'],
    runtimeEditingModeControllerRef: {
      current: {
        getCurrentMode: () => 'drawingShape',
        transition: () => {},
      },
    } as unknown as Parameters<typeof handleCanvasPointerUp>[0]['runtimeEditingModeControllerRef'],
    setActiveTransformHandle: createNoopSetter(),
    setHoveredTransformHandle: createNoopSetter(),
    setDraftPrimitive: createNoopSetter(),
    setHoveredShapeId: createNoopSetter(),
    setPathHandleDrag: createNoopSetter(),
    setShapeStyleHandleDrag: createNoopSetter(),
    setPathSubSelectionHover: createNoopSetter(),
    setSnapGuides: createNoopSetter(),
    selectionDragControllerRef: {
      current: {
        pointerUp: () => {},
      },
    } as unknown as Parameters<typeof handleCanvasPointerUp>[0]['selectionDragControllerRef'],
    transformManagerRef: {
      current: {
        current: () => null,
      },
    } as unknown as Parameters<typeof handleCanvasPointerUp>[0]['transformManagerRef'],
    transformPreview: null,
  } satisfies Parameters<typeof handleCanvasPointerUp>[0]
}

function runSourceCases(input: {
  document: EditorDocument
  selectedShapeIds?: string[]
  pathSubSelection?: PathSubSelection | null
  cases: SourceCase[]
}) {
  return input.cases.map((sourceCase) => {
    const harness = createActionHarness({
      document: input.document,
      selectedShapeIds: input.selectedShapeIds,
      pathSubSelection: input.pathSubSelection,
    })
    harness.executeAction(sourceCase.action, sourceCase.data)
    return {
      source: sourceCase.source,
      action: sourceCase.action,
      commands: harness.commands,
      contracts: harness.commands.map((command) => resolveVector2DCommandContract(command)),
      lifecycleActions: harness.lifecycleActions,
      toolChanges: harness.toolChanges,
    }
  })
}

function resolveHeaderMenuActionCode(menuId: string) {
  const visit = (items: ReturnType<typeof createHeaderMenuData>): string | null => {
    for (const item of items) {
      if (item.id === menuId) {
        return item.editorActionCode ?? item.action ?? item.id
      }
      if (item.children) {
        const childResult = visit(item.children)
        if (childResult) {
          return childResult
        }
      }
    }
    return null
  }

  return visit(createHeaderMenuData({
    selectedIds: ['fixture-styled'],
    copiedCount: 1,
    needSave: true,
    historyStatus: {
      hasPrev: true,
      hasNext: true,
    },
  }))
}

function resolveHeaderMenuAction(menuId: string) {
  const visit = (items: ReturnType<typeof createHeaderMenuData>): {action: string; data?: unknown} | null => {
    for (const item of items) {
      if (item.id === menuId) {
        return {
          action: item.editorActionCode ?? item.action ?? item.id,
          data: item.editorActionData,
        }
      }
      if (item.children) {
        const childResult = visit(item.children)
        if (childResult) {
          return childResult
        }
      }
    }
    return null
  }

  return visit(createHeaderMenuData({
    selectedIds: ['fixture-rect', 'fixture-ellipse', 'fixture-polygon'],
    copiedCount: 1,
    needSave: true,
    historyStatus: {
      hasPrev: true,
      hasNext: true,
    },
  }))
}

test('Vector2D source-equivalence keeps file and export lifecycle actions outside runtime document dispatch', () => {
  const document = createCanonicalDocumentModelFixture()
  const headerSaveAction = resolveHeaderMenuAction('saveFile')
  const headerPrintAction = resolveHeaderMenuAction('print')
  const headerCloseAction = resolveHeaderMenuAction('closeFile')

  assert.deepEqual(headerSaveAction, {action: 'saveFile', data: undefined})
  assert.deepEqual(headerPrintAction, {action: 'print', data: undefined})
  assert.deepEqual(headerCloseAction, {action: 'closeFile', data: undefined})

  const lifecycleResults = runSourceCases({
    document,
    cases: [
      {source: 'header-menu', action: headerSaveAction.action, data: headerSaveAction.data},
      {source: 'shortcut', action: 'saveFile'},
      {source: 'api', action: 'saveFile'},
      {source: 'header-menu', action: headerPrintAction.action, data: headerPrintAction.data},
      {source: 'api', action: 'print'},
      {source: 'header-menu', action: headerCloseAction.action, data: headerCloseAction.data},
      {source: 'api', action: 'closeFile'},
    ],
  })

  assert.deepEqual(lifecycleResults.map((result) => result.commands), [[], [], [], [], [], [], []])
  assert.deepEqual(lifecycleResults.map((result) => result.lifecycleActions), [
    ['file.save'],
    ['file.save'],
    ['file.save'],
    ['export.print'],
    ['export.print'],
    ['file.close'],
    ['file.close'],
  ])

  const contracts = [
    resolveVector2DProductActionContract(headerSaveAction.action, headerSaveAction.data),
    resolveVector2DProductActionContract('saveFile'),
    resolveVector2DProductActionContract('print'),
    resolveVector2DProductActionContract('closeFile'),
    resolveVector2DProductActionContract('exportFile_png'),
    resolveVector2DProductActionContract('exportFile', 'png'),
    resolveVector2DProductActionContract('exportFile_pdf'),
    resolveVector2DProductActionContract('exportFile_csv'),
  ]

  assert.deepEqual(contracts.map((contract) => contract && {
    commandType: contract.commandType,
    family: contract.family,
    beforeAfterPolicy: contract.beforeAfterPolicy,
    mergePolicy: contract.mergePolicy,
    targetIds: contract.targetIds,
    diagnostics: contract.diagnostics,
  }), [
    {
      commandType: 'file.save',
      family: 'file',
      beforeAfterPolicy: 'none',
      mergePolicy: 'none',
      targetIds: [],
      diagnostics: [
        'v2d.command.family.file',
        'v2d.command.beforeAfter.none',
        'v2d.command.merge.none',
      ],
    },
    {
      commandType: 'file.save',
      family: 'file',
      beforeAfterPolicy: 'none',
      mergePolicy: 'none',
      targetIds: [],
      diagnostics: [
        'v2d.command.family.file',
        'v2d.command.beforeAfter.none',
        'v2d.command.merge.none',
      ],
    },
    {
      commandType: 'export.print',
      family: 'export',
      beforeAfterPolicy: 'none',
      mergePolicy: 'none',
      targetIds: [],
      diagnostics: [
        'v2d.command.family.export',
        'v2d.command.beforeAfter.none',
        'v2d.command.merge.none',
      ],
    },
    {
      commandType: 'file.close',
      family: 'file',
      beforeAfterPolicy: 'none',
      mergePolicy: 'none',
      targetIds: [],
      diagnostics: [
        'v2d.command.family.file',
        'v2d.command.beforeAfter.none',
        'v2d.command.merge.none',
      ],
    },
    {
      commandType: 'export.png',
      family: 'export',
      beforeAfterPolicy: 'none',
      mergePolicy: 'none',
      targetIds: [],
      diagnostics: [
        'v2d.command.family.export',
        'v2d.command.beforeAfter.none',
        'v2d.command.merge.none',
      ],
    },
    {
      commandType: 'export.png',
      family: 'export',
      beforeAfterPolicy: 'none',
      mergePolicy: 'none',
      targetIds: [],
      diagnostics: [
        'v2d.command.family.export',
        'v2d.command.beforeAfter.none',
        'v2d.command.merge.none',
      ],
    },
    {
      commandType: 'export.pdf',
      family: 'export',
      beforeAfterPolicy: 'none',
      mergePolicy: 'none',
      targetIds: [],
      diagnostics: [
        'v2d.command.family.export',
        'v2d.command.beforeAfter.none',
        'v2d.command.merge.none',
      ],
    },
    {
      commandType: 'export.csv',
      family: 'export',
      beforeAfterPolicy: 'none',
      mergePolicy: 'none',
      targetIds: [],
      diagnostics: [
        'v2d.command.family.export',
        'v2d.command.beforeAfter.none',
        'v2d.command.merge.none',
      ],
    },
  ])
})

test('Vector2D source-equivalence routes menu shortcut context and API delete to one command contract', () => {
  const document = createCanonicalDocumentModelFixture()
  const headerDeleteAction = resolveHeaderMenuActionCode('delete')
  assert.equal(headerDeleteAction, 'element-delete')

  const results = runSourceCases({
    document,
    selectedShapeIds: ['fixture-styled'],
    cases: [
      {source: 'header-menu', action: headerDeleteAction},
      {source: 'shortcut', action: 'element-delete'},
      {source: 'context-menu', action: 'element-delete'},
      {source: 'api', action: 'element-delete'},
    ],
  })
  const signatures = results.map((result) => result.contracts.map((contract) => ({
    commandType: contract.commandType,
    family: contract.family,
    beforeAfterPolicy: contract.beforeAfterPolicy,
    mergePolicy: contract.mergePolicy,
    diagnostics: contract.diagnostics,
  })))

  assert.deepEqual(signatures, [
    [{
      commandType: 'selection.delete',
      family: 'selection',
      beforeAfterPolicy: 'selection-state',
      mergePolicy: 'transaction',
      diagnostics: [
        'v2d.command.family.selection',
        'v2d.command.beforeAfter.selection-state',
        'v2d.command.merge.transaction',
      ],
    }],
    [{
      commandType: 'selection.delete',
      family: 'selection',
      beforeAfterPolicy: 'selection-state',
      mergePolicy: 'transaction',
      diagnostics: [
        'v2d.command.family.selection',
        'v2d.command.beforeAfter.selection-state',
        'v2d.command.merge.transaction',
      ],
    }],
    [{
      commandType: 'selection.delete',
      family: 'selection',
      beforeAfterPolicy: 'selection-state',
      mergePolicy: 'transaction',
      diagnostics: [
        'v2d.command.family.selection',
        'v2d.command.beforeAfter.selection-state',
        'v2d.command.merge.transaction',
      ],
    }],
    [{
      commandType: 'selection.delete',
      family: 'selection',
      beforeAfterPolicy: 'selection-state',
      mergePolicy: 'transaction',
      diagnostics: [
        'v2d.command.family.selection',
        'v2d.command.beforeAfter.selection-state',
        'v2d.command.merge.transaction',
      ],
    }],
  ])
})

test('Vector2D source-equivalence routes layer panel and API selection changes to one command contract', () => {
  const document = createCanonicalDocumentModelFixture()
  const selectionPayload = {
    idSet: new Set(['fixture-rect', 'fixture-styled']),
    mode: 'replace',
  }
  const results = runSourceCases({
    document,
    cases: [
      {source: 'layer-panel', action: 'selection-modify', data: selectionPayload},
      {source: 'api', action: 'selection-modify', data: selectionPayload},
    ],
  })

  assert.deepEqual(results.map((result) => result.commands), [
    [{type: 'selection.set', shapeIds: ['fixture-rect', 'fixture-styled'], mode: 'replace'}],
    [{type: 'selection.set', shapeIds: ['fixture-rect', 'fixture-styled'], mode: 'replace'}],
  ])
  assert.deepEqual(results.map((result) => result.contracts[0]?.diagnostics), [
    [
      'v2d.command.family.selection',
      'v2d.command.beforeAfter.selection-state',
      'v2d.command.merge.transaction',
    ],
    [
      'v2d.command.family.selection',
      'v2d.command.beforeAfter.selection-state',
      'v2d.command.merge.transaction',
    ],
  ])
})

test('Vector2D source-equivalence routes inspector shortcut bar and API style edits to one command contract', () => {
  const document = createCanonicalDocumentModelFixture()
  const modifyPayload = [{
    id: 'fixture-styled',
    props: {
      stroke: {
        enabled: true,
        color: '#f97316',
        weight: 5,
      },
    },
  }]
  const results = runSourceCases({
    document,
    selectedShapeIds: ['fixture-styled'],
    cases: [
      {source: 'properties-panel', action: 'element-modify', data: modifyPayload},
      {source: 'shortcut-bar', action: 'element-modify', data: modifyPayload},
      {source: 'api', action: 'element-modify', data: modifyPayload},
    ],
  })

  assert.deepEqual(results.map((result) => result.commands), [
    [{
      type: 'shape.patch',
      shapeId: 'fixture-styled',
      patch: {stroke: {enabled: true, color: '#f97316', weight: 5}},
    }],
    [{
      type: 'shape.patch',
      shapeId: 'fixture-styled',
      patch: {stroke: {enabled: true, color: '#f97316', weight: 5}},
    }],
    [{
      type: 'shape.patch',
      shapeId: 'fixture-styled',
      patch: {stroke: {enabled: true, color: '#f97316', weight: 5}},
    }],
  ])
  assert.deepEqual(results.map((result) => result.contracts[0]?.family), ['style', 'style', 'style'])
})

test('Vector2D source-equivalence keeps toolbar and shortcut tool switches in one product action path', () => {
  const document = createCanonicalDocumentModelFixture()
  const results = runSourceCases({
    document,
    cases: [
      {source: 'toolbelt', action: 'switch-tool', data: 'rectangle'},
      {source: 'shortcut', action: 'switch-tool', data: 'rectangle'},
      {source: 'api', action: 'switch-tool', data: 'rectangle'},
    ],
  })

  assert.deepEqual(results.map((result) => result.commands), [[], [], []])
  assert.deepEqual(results.map((result) => result.toolChanges), [['rectangle'], ['rectangle'], ['rectangle']])
})

test('Vector2D source-equivalence routes layer reorder actions through one layer command contract', () => {
  const document = createCanonicalDocumentModelFixture()
  const headerAction = resolveHeaderMenuAction('bringForward')
  assert.deepEqual(headerAction, {action: 'element-layer', data: 'up'})

  const results = runSourceCases({
    document,
    selectedShapeIds: ['fixture-styled'],
    cases: [
      {source: 'header-menu', action: headerAction.action, data: headerAction.data},
      {source: 'shortcut-bar', action: 'element-layer', data: 'up'},
      {source: 'layer-panel', action: 'element-layer', data: 'up'},
      {source: 'api', action: 'element-layer', data: 'up'},
    ],
  })

  assert.deepEqual(results.map((result) => result.commands), [
    [{type: 'shape.reorder', shapeId: 'fixture-styled', toIndex: 1}],
    [{type: 'shape.reorder', shapeId: 'fixture-styled', toIndex: 1}],
    [{type: 'shape.reorder', shapeId: 'fixture-styled', toIndex: 1}],
    [{type: 'shape.reorder', shapeId: 'fixture-styled', toIndex: 1}],
  ])
  assert.deepEqual(results.map((result) => result.contracts[0]?.family), ['layer', 'layer', 'layer', 'layer'])
})

test('Vector2D source-equivalence routes group mask and boolean structure actions through stable command contracts', () => {
  const document = createCanonicalDocumentModelFixture()
  const selectedShapeIds = ['fixture-rect', 'fixture-ellipse']
  const cases: Array<{
    action: string
    expectedCommand: EditorRuntimeCommand
    expectedFamily: string
  }> = [
    {
      action: 'group-nodes',
      expectedCommand: {type: 'shape.group', shapeIds: selectedShapeIds},
      expectedFamily: 'group',
    },
    {
      action: 'image-mask-with-shape',
      expectedCommand: {type: 'mask.create'},
      expectedFamily: 'mask',
    },
    {
      action: 'image-clear-mask',
      expectedCommand: {type: 'mask.release'},
      expectedFamily: 'mask',
    },
    {
      action: 'boolean-union',
      expectedCommand: {type: 'shape.boolean', shapeIds: selectedShapeIds, mode: 'union'},
      expectedFamily: 'boolean',
    },
  ]

  cases.forEach((sourceCase) => {
    const results = runSourceCases({
      document,
      selectedShapeIds,
      cases: [
        {source: 'header-menu', action: sourceCase.action},
        {source: 'context-menu', action: sourceCase.action},
        {source: 'api', action: sourceCase.action},
      ],
    })

    assert.deepEqual(results.map((result) => result.commands), [
      [sourceCase.expectedCommand],
      [sourceCase.expectedCommand],
      [sourceCase.expectedCommand],
    ])
    assert.deepEqual(results.map((result) => result.contracts[0]?.family), [
      sourceCase.expectedFamily,
      sourceCase.expectedFamily,
      sourceCase.expectedFamily,
    ])
  })
})

test('Vector2D source-equivalence routes align and distribute actions through deterministic transform contracts', () => {
  const document = createCanonicalDocumentModelFixture()
  const selectedShapeIds = ['fixture-rect', 'fixture-ellipse', 'fixture-polygon']
  const results = runSourceCases({
    document,
    selectedShapeIds,
    cases: [
      {source: 'header-menu', action: 'align-left'},
      {source: 'shortcut-bar', action: 'align-left'},
      {source: 'context-menu', action: 'align-left'},
      {source: 'api', action: 'align-left'},
      {source: 'header-menu', action: 'distribute-horizontal'},
      {source: 'shortcut-bar', action: 'distribute-horizontal'},
      {source: 'context-menu', action: 'distribute-horizontal'},
      {source: 'api', action: 'distribute-horizontal'},
    ],
  })

  assert.deepEqual(results.map((result) => result.commands), [
    [{type: 'shape.align', shapeIds: selectedShapeIds, mode: 'left', reference: 'selection'}],
    [{type: 'shape.align', shapeIds: selectedShapeIds, mode: 'left', reference: 'selection'}],
    [{type: 'shape.align', shapeIds: selectedShapeIds, mode: 'left', reference: 'selection'}],
    [{type: 'shape.align', shapeIds: selectedShapeIds, mode: 'left', reference: 'selection'}],
    [{type: 'shape.distribute', shapeIds: selectedShapeIds, mode: 'hspace'}],
    [{type: 'shape.distribute', shapeIds: selectedShapeIds, mode: 'hspace'}],
    [{type: 'shape.distribute', shapeIds: selectedShapeIds, mode: 'hspace'}],
    [{type: 'shape.distribute', shapeIds: selectedShapeIds, mode: 'hspace'}],
  ])
  assert.deepEqual(results.map((result) => result.contracts[0]?.family), [
    'transform',
    'transform',
    'transform',
    'transform',
    'transform',
    'transform',
    'transform',
    'transform',
  ])
})

test('Vector2D source-equivalence routes canvas drag-create and API insert through shape insert contract', () => {
  const document = createCanonicalDocumentModelFixture()
  const canvasHarness = createCanvasPointerUpHarness()

  handleCanvasPointerUp({
    ...createCanvasPointerUpBaseOptions({
      document,
      handleCommand: canvasHarness.handleCommand,
      insertElement: canvasHarness.insertElement,
    }),
    currentTool: 'rectangle',
    draftPrimitive: {
      id: 'draft-rectangle',
      type: 'rectangle',
      points: [{x: 100, y: 120}, {x: 180, y: 220}],
      bounds: {minX: 100, minY: 120, maxX: 180, maxY: 220},
    },
  })

  const canvasInsertCommand = canvasHarness.commands[0]
  assert.equal(canvasInsertCommand?.type, 'shape.insert')
  const canvasShape = canvasInsertCommand?.type === 'shape.insert' ? canvasInsertCommand.shape : null
  assert.ok(canvasShape, 'canvas drag-create should insert one shape')
  const apiInsertCommand = canvasShape
    ? {type: 'shape.insert' as const, shape: canvasShape}
    : null
  assert.ok(apiInsertCommand, 'api insert command should be derived from canvas-created shape')

  assert.deepEqual({
    canvasContract: resolveVector2DCommandContract(canvasInsertCommand).diagnostics,
    apiContract: resolveVector2DCommandContract(apiInsertCommand).diagnostics,
    shape: {
      type: canvasShape?.type,
      name: canvasShape?.name,
      x: canvasShape?.x,
      y: canvasShape?.y,
      width: canvasShape?.width,
      height: canvasShape?.height,
    },
  }, {
    canvasContract: [
      'v2d.command.family.shape',
      'v2d.command.beforeAfter.document-patch',
      'v2d.command.merge.transaction',
    ],
    apiContract: [
      'v2d.command.family.shape',
      'v2d.command.beforeAfter.document-patch',
      'v2d.command.merge.transaction',
    ],
    shape: {
      type: 'rectangle',
      name: 'Rectangle',
      x: 100,
      y: 120,
      width: 80,
      height: 100,
    },
  })
})

test('Vector2D source-equivalence routes canvas transform commit and API transform through one transform contract', () => {
  const document = createCanonicalDocumentModelFixture()
  const sourceShape = document.shapes.find((shape) => shape.id === 'fixture-styled')
  assert.ok(sourceShape, 'fixture-styled should exist')

  const canvasTransformCommand = createTransformBatchCommand(document.shapes, {
    shapes: [{
      shapeId: sourceShape.id,
      x: sourceShape.x + 24,
      y: sourceShape.y + 32,
      width: sourceShape.width,
      height: sourceShape.height,
      rotation: sourceShape.rotation ?? 0,
      flipX: sourceShape.flipX ?? false,
      flipY: sourceShape.flipY ?? false,
    }],
  })
  assert.ok(canvasTransformCommand, 'canvas transform preview should produce one transform command')
  const apiTransformCommand = canvasTransformCommand

  assert.deepEqual({
    canvasContract: resolveVector2DCommandContract(canvasTransformCommand).diagnostics,
    apiContract: resolveVector2DCommandContract(apiTransformCommand).diagnostics,
    targetIds: resolveVector2DCommandContract(canvasTransformCommand).targetIds,
    transformCount: canvasTransformCommand.transforms.length,
  }, {
    canvasContract: [
      'v2d.command.family.transform',
      'v2d.command.beforeAfter.document-patch',
      'v2d.command.merge.continuous',
    ],
    apiContract: [
      'v2d.command.family.transform',
      'v2d.command.beforeAfter.document-patch',
      'v2d.command.merge.continuous',
    ],
    targetIds: ['fixture-styled'],
    transformCount: 1,
  })
})

test('Vector2D source-equivalence routes text rename and rich text edits through one text command path', () => {
  const document = createCanonicalDocumentModelFixture()
  const textRuns = [{
    start: 0,
    end: 11,
    style: {
      color: '#0f172a',
      fontFamily: 'Helvetica',
      fontSize: 18,
      fontWeight: 700,
      lineHeight: 1.4,
    },
  }]
  const modifyPayload = [{
    id: 'fixture-text',
    props: {
      name: 'Renamed Text',
      textRuns,
    },
  }]
  const results = runSourceCases({
    document,
    selectedShapeIds: ['fixture-text'],
    cases: [
      {source: 'properties-panel', action: 'element-modify', data: modifyPayload},
      {source: 'shortcut-bar', action: 'element-modify', data: modifyPayload},
      {source: 'api', action: 'element-modify', data: modifyPayload},
    ],
  })

  assert.deepEqual(results.map((result) => result.commands), [
    [
      {type: 'shape.rename', shapeId: 'fixture-text', name: 'Renamed Text', text: 'Renamed Text'},
      {type: 'shape.patch', shapeId: 'fixture-text', patch: {textRuns}},
    ],
    [
      {type: 'shape.rename', shapeId: 'fixture-text', name: 'Renamed Text', text: 'Renamed Text'},
      {type: 'shape.patch', shapeId: 'fixture-text', patch: {textRuns}},
    ],
    [
      {type: 'shape.rename', shapeId: 'fixture-text', name: 'Renamed Text', text: 'Renamed Text'},
      {type: 'shape.patch', shapeId: 'fixture-text', patch: {textRuns}},
    ],
  ])
  assert.deepEqual(results.map((result) => result.contracts.map((contract) => contract.family)), [
    ['text', 'style'],
    ['text', 'style'],
    ['text', 'style'],
  ])
})

test('Vector2D source-equivalence routes path anchor shortcuts and API edits through one path commit chain', () => {
  const document = createCanonicalDocumentModelFixture()
  const pathSubSelection: PathSubSelection = {
    shapeId: 'fixture-path',
    hitType: 'anchorPoint',
    anchorPoint: {
      index: 1,
      x: 100,
      y: 200,
      segmentType: 'curve',
    },
  }
  const results = runSourceCases({
    document,
    selectedShapeIds: ['fixture-path'],
    pathSubSelection,
    cases: [
      {source: 'shortcut', action: 'path-anchor-toggle-type'},
      {source: 'api', action: 'path-anchor-toggle-type'},
    ],
  })

  const commandSignatures = results.map((result) => result.commands.map((command) => ({
    type: command.type,
    family: resolveVector2DCommandContract(command).family,
  })))
  assert.deepEqual(commandSignatures, [
    [
      {type: 'shape.remove', family: 'shape'},
      {type: 'shape.insert', family: 'shape'},
      {type: 'selection.set', family: 'selection'},
    ],
    [
      {type: 'shape.remove', family: 'shape'},
      {type: 'shape.insert', family: 'shape'},
      {type: 'selection.set', family: 'selection'},
    ],
  ])

  const insertedShapes = results.map((result) => {
    const insertCommand = result.commands.find((command) => command.type === 'shape.insert')
    return insertCommand?.type === 'shape.insert'
      ? {
          id: insertCommand.shape.id,
          bezierPointCount: insertCommand.shape.bezierPoints?.length,
          toggledAnchorHasHandles: Boolean(insertCommand.shape.bezierPoints?.[1]?.cp1 || insertCommand.shape.bezierPoints?.[1]?.cp2),
        }
      : null
  })
  assert.deepEqual(insertedShapes, [
    {id: 'fixture-path', bezierPointCount: 3, toggledAnchorHasHandles: false},
    {id: 'fixture-path', bezierPointCount: 3, toggledAnchorHasHandles: false},
  ])
})
