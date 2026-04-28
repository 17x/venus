import {
  addSelectionId,
  applyKeyboardKeyDown,
  applyPointerDown,
  compileShortcutBindings,
  createCaptureRuntime,
  createEmptyModifierState,
  createHoverRuntime,
  createInteractionResult,
  createKeyboardRuntime,
  createOperationCommandSession,
  createOperationLifecycleManager,
  createOverlayRuntime,
  createPointerRuntime,
  createSelectionState,
  createTargetStack,
  createToolRuntime,
  createViewportInteractionRuntime,
  createGestureRuntime,
  dispatchInteractionEvent,
  hasPassedDragThreshold,
  resolveCursorRuntime,
  resolveEffectiveTool,
  resolveGestureIntent,
  resolveGesturePolicy,
  resolveInteractionPolicy,
  resolveInteractionTarget,
  resolveMatchingShortcutBinding,
  resolveRuntimeZoomPresetScale,
  runInteractionPipeline,
  sortOverlayNodesByZIndex,
  type InteractionRuntimeState,
} from '@venus/editor-primitive'

/**
 * Defines one primitive module name for capability reporting.
 */
export type EditorPrimitiveCapabilityModule =
  | 'input'
  | 'pointer'
  | 'keyboard'
  | 'shortcut'
  | 'gesture'
  | 'tool'
  | 'operation'
  | 'target'
  | 'command'
  | 'selection'
  | 'policy'
  | 'hover'
  | 'overlay'
  | 'cursor'
  | 'viewport'
  | 'capture'
  | 'runtime'

/**
 * Defines one capability-check result entry.
 */
export interface EditorPrimitiveCapabilityResult {
  /** Stores checked primitive module name. */
  module: EditorPrimitiveCapabilityModule
  /** Indicates whether module capability check passed. */
  passed: boolean
  /** Stores short technical detail for diagnostics. */
  detail: string
}

/**
 * Defines full capability validation report payload.
 */
export interface EditorPrimitiveCapabilityReport {
  /** Stores per-module capability check results. */
  results: EditorPrimitiveCapabilityResult[]
  /** Indicates whether all module checks passed. */
  allPassed: boolean
}

/**
 * Builds minimal runtime state used by runtime-dispatch capability checks.
 */
function createRuntimeStateForValidation(): InteractionRuntimeState {
  return {
    pointer: createPointerRuntime({x: 0, y: 0}),
    keyboard: createKeyboardRuntime(),
    gesture: createGestureRuntime(),
    capture: createCaptureRuntime(),
    hover: createHoverRuntime({x: 0, y: 0}),
    cursor: {type: 'default'},
    tool: createToolRuntime('select'),
    operation: {
      phase: 'idle',
      active: null,
    },
    selection: createSelectionState(),
    viewport: createViewportInteractionRuntime({
      matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
      inverseMatrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
      offsetX: 0,
      offsetY: 0,
      scale: 1,
      viewportWidth: 100,
      viewportHeight: 100,
    }),
  }
}

/**
 * Runs one capability smoke check per editor-primitive module from vector runtime.
 */
export function validateEditorPrimitiveCapabilities(): EditorPrimitiveCapabilityReport {
  const results: EditorPrimitiveCapabilityResult[] = []

  // Validate input module by creating normalized modifier state.
  const modifierState = createEmptyModifierState()
  results.push({
    module: 'input',
    passed: modifierState.shift === false,
    detail: 'createEmptyModifierState()',
  })

  // Validate pointer module by reducing one pointer-down transition.
  const pointerAfterDown = applyPointerDown(
    createPointerRuntime({x: 0, y: 0}),
    {pointerId: 1, button: 0, buttons: 1, timeStamp: 1},
    {x: 5, y: 5},
    {x: 5, y: 5},
  )
  results.push({
    module: 'pointer',
    passed: pointerAfterDown.isDown && hasPassedDragThreshold(pointerAfterDown.dragDistancePx, 0),
    detail: 'applyPointerDown() + createPointerRuntime()',
  })

  // Validate keyboard module by reducing one keydown transition.
  const keyboardAfterDown = applyKeyboardKeyDown(createKeyboardRuntime(), {key: 'Shift', shiftKey: true})
  results.push({
    module: 'keyboard',
    passed: !!keyboardAfterDown.modifierKeys.shift,
    detail: 'applyKeyboardKeyDown() + createKeyboardRuntime()',
  })

  // Validate shortcut module by compiling and matching one chord.
  const compiledBindings = compileShortcutBindings([{id: 'undo', shortcut: 'mod+z'}])
  const matchedShortcut = resolveMatchingShortcutBinding(compiledBindings, {
    pressedKeys: new Set(['meta', 'z']),
    platform: 'mac',
  })
  results.push({
    module: 'shortcut',
    passed: matchedShortcut === 'undo',
    detail: 'compileShortcutBindings() + resolveMatchingShortcutBinding()',
  })

  // Validate gesture module by resolving pointer-up click intent.
  const gestureIntent = resolveGestureIntent({
    previous: createPointerRuntime({x: 0, y: 0}),
    next: createPointerRuntime({x: 0, y: 0}),
    eventType: 'pointerup',
    policy: resolveGesturePolicy(),
    timeStamp: 10,
  })
  results.push({
    module: 'gesture',
    passed: gestureIntent.type === 'click' || gestureIntent.type === 'double-click' || gestureIntent.type === 'none',
    detail: 'resolveGestureIntent() + resolveGesturePolicy()',
  })

  // Validate tool module by resolving effective tool with temporary override.
  const effectiveTool = resolveEffectiveTool({
    currentTool: 'select',
    effectiveTool: 'select',
    temporaryTool: 'pan',
  })
  results.push({
    module: 'tool',
    passed: effectiveTool === 'pan',
    detail: 'resolveEffectiveTool()',
  })

  // Validate operation module by beginning and updating one lifecycle session.
  const operationLifecycle = createOperationLifecycleManager<'drag'>({dragThresholdPx: 1})
  operationLifecycle.begin({id: 'op-1', type: 'drag', startedAt: 1, screen: {x: 0, y: 0}})
  operationLifecycle.update({x: 2, y: 0})
  results.push({
    module: 'operation',
    passed: operationLifecycle.getPhase() === 'active' || operationLifecycle.getPhase() === 'pending',
    detail: 'createOperationLifecycleManager().begin().update()',
  })

  // Validate target module by resolving overlay-handle priority and stack creation.
  const targetCandidate = resolveInteractionTarget({
    overlayHandleTarget: {type: 'overlay-handle', id: 'handle-1', handle: 'ne'},
  })
  const targetStack = createTargetStack(
    {x: 0, y: 0},
    [
      {type: 'overlay-bounds', id: 'overlay-1'},
      {type: 'scene-node', id: 'shape-1'},
    ],
  )
  results.push({
    module: 'target',
    passed: targetCandidate.priority === 'overlay-handle' && targetStack.targets.length >= 1,
    detail: 'resolveInteractionTarget() + createTargetStack()',
  })

  // Validate command module by creating and committing one command session bridge.
  let committedPatch = ''
  const commandSession = createOperationCommandSession<string>('session-1', {
    preview: () => {},
    commit: (patch) => {
      committedPatch = patch
    },
    cancel: () => {},
  })
  commandSession.commit('patch-1')
  results.push({
    module: 'command',
    passed: committedPatch === 'patch-1' && commandSession.status === 'committed',
    detail: 'createOperationCommandSession()',
  })

  // Validate selection module by adding one selected id.
  const selectionState = addSelectionId(createSelectionState<string>(), 'shape-1')
  results.push({
    module: 'selection',
    passed: selectionState.selectedIds.includes('shape-1'),
    detail: 'createSelectionState() + addSelectionId()',
  })

  // Validate policy module by resolving runtime policy defaults.
  const interactionPolicy = resolveInteractionPolicy()
  results.push({
    module: 'policy',
    passed: interactionPolicy.dragThreshold > 0,
    detail: 'resolveInteractionPolicy()',
  })

  // Validate hover module by creating hover runtime baseline.
  const hoverState = createHoverRuntime({x: 1, y: 1})
  results.push({
    module: 'hover',
    passed: hoverState.changed === false,
    detail: 'createHoverRuntime()',
  })

  // Validate overlay module by sorting overlay nodes and creating runtime.
  const overlayRuntime = createOverlayRuntime()
  const sortedNodes = sortOverlayNodesByZIndex([
    {id: 'b', zIndex: 2, type: 'rect', coordinate: 'screen'},
    {id: 'a', zIndex: 1, type: 'rect', coordinate: 'screen'},
  ])
  results.push({
    module: 'overlay',
    passed: overlayRuntime.version === 0 && sortedNodes[0]?.id === 'a',
    detail: 'createOverlayRuntime() + sortOverlayNodesByZIndex()',
  })

  // Validate cursor module by resolving runtime cursor priority fallback.
  const cursorRuntime = resolveCursorRuntime({
    temporaryTool: {type: 'grab'},
    fallback: {type: 'default'},
  })
  results.push({
    module: 'cursor',
    passed: cursorRuntime.css === 'grab',
    detail: 'resolveCursorRuntime()',
  })

  // Validate viewport module by resolving next discrete zoom step.
  const nextZoomScale = resolveRuntimeZoomPresetScale(1, 'in')
  results.push({
    module: 'viewport',
    passed: typeof nextZoomScale === 'number' && nextZoomScale > 1,
    detail: 'resolveRuntimeZoomPresetScale()',
  })

  // Validate capture module by creating default capture runtime.
  const captureRuntime = createCaptureRuntime()
  results.push({
    module: 'capture',
    passed: captureRuntime.pointerCaptured === false,
    detail: 'createCaptureRuntime()',
  })

  // Validate runtime module by running one minimal pipeline and dispatching one normalized event.
  const pipelineState = runInteractionPipeline(
    {type: 'pointermove', nativeEvent: undefined},
    {
      pointer: createPointerRuntime({x: 0, y: 0}),
      keyboard: createKeyboardRuntime(),
      gesture: {type: 'none'},
      target: {priority: 'empty', target: {type: 'empty'}},
      effectiveTool: 'select',
      activeOperation: null,
      operationPhase: 'idle',
      patch: undefined,
    },
    {
      resolvePointer: () => createPointerRuntime({x: 0, y: 0}),
      resolveKeyboard: () => createKeyboardRuntime(),
      resolveGesture: () => ({type: 'none'}),
      resolveTarget: () => ({priority: 'empty', target: {type: 'empty'}}),
      resolveEffectiveTool: () => 'select',
      resolveOperation: () => ({activeOperation: null, operationPhase: 'idle'}),
      resolvePatch: () => undefined,
    },
  )

  const dispatchResult = dispatchInteractionEvent(
    createRuntimeStateForValidation(),
    {
      type: 'key-down',
      eventId: 'evt-1',
      event: {
        key: 'z',
        code: 'KeyZ',
        modifiers: createEmptyModifierState(),
        repeat: false,
        timestamp: 1,
        isComposing: false,
      },
    },
  )

  const baselineResult = createInteractionResult()
  results.push({
    module: 'runtime',
    passed: pipelineState.operationPhase === 'idle' && !!dispatchResult.trace && baselineResult.overlay?.type === 'none',
    detail: 'runInteractionPipeline() + dispatchInteractionEvent() + createInteractionResult()',
  })

  const allPassed = results.every((result) => result.passed)
  return {
    results,
    allPassed,
  }
}

/**
 * Returns one module-detail map for capability diagnostics panels.
 */
export function mapEditorPrimitiveCapabilityDetails(report: EditorPrimitiveCapabilityReport) {
  return report.results.reduce<Record<EditorPrimitiveCapabilityModule, string>>((acc, item) => {
    acc[item.module] = `${item.passed ? 'pass' : 'fail'}: ${item.detail}`
    return acc
  }, {
    input: '',
    pointer: '',
    keyboard: '',
    shortcut: '',
    gesture: '',
    tool: '',
    operation: '',
    target: '',
    command: '',
    selection: '',
    policy: '',
    hover: '',
    overlay: '',
    cursor: '',
    viewport: '',
    capture: '',
    runtime: '',
  })
}
