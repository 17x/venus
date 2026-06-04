import assert from 'node:assert/strict'
import test from 'node:test'

import {
  executeStateMachineCleanupPlan,
  getVector2DStateMachineDiagnosticsSnapshot,
  publishVector2DStateMachineDiagnostics,
  resolveDocumentLifecycleSnapshot,
  resolveSelectionLifecycleSnapshot,
  resolveStateMachineCleanupPlan,
  resolveToolLifecycleSnapshot,
  resolveTransformLifecycleSnapshot,
  subscribeVector2DStateMachineDiagnostics,
  type Vector2DCleanupTrigger,
} from '../../../product/runtime/stateMachineContract.ts'
import {createRuntimeEditingModeController} from '../../../runtime/editing-modes/controller.ts'

test('Vector2D document lifecycle projects every commercial state with reason and owner', () => {
  const states = ['created', 'opened', 'dirty', 'saving', 'saved', 'recovery', 'closed'] as const
  const snapshots = states.map((state) => resolveDocumentLifecycleSnapshot({
    lifecycle: {
      state,
      dirty: state === 'dirty' || state === 'recovery',
      lastTransitionSource: {kind: 'system', event: `fixture.${state}`, issuedAt: 1},
    },
  }))

  assert.deepEqual(snapshots.map((snapshot) => snapshot.state), states)
  snapshots.forEach((snapshot, index) => {
    assert.equal(snapshot.reasonCode, `fixture.${states[index]}`)
    assert.equal(snapshot.owner, 'product.document-lifecycle')
  })
  assert.deepEqual(resolveDocumentLifecycleSnapshot({readOnly: true}), {
    state: 'read-only',
    reasonCode: 'document.read-only.config',
    owner: 'product.document-lifecycle',
  })
  assert.deepEqual(resolveDocumentLifecycleSnapshot({readOnly: true, errorCode: 'io-timeout'}), {
    state: 'error',
    reasonCode: 'document.error.io-timeout',
    owner: 'product.document-lifecycle',
  })
})

test('Vector2D tool lifecycle projects pointer and editing modes into auditable states', () => {
  assert.equal(resolveToolLifecycleSnapshot({editingMode: 'idle'}).state, 'idle')
  assert.equal(resolveToolLifecycleSnapshot({editingMode: 'idle', hovered: true}).state, 'hover')
  assert.equal(resolveToolLifecycleSnapshot({editingMode: 'selecting', pointerPressed: true}).state, 'press')
  assert.equal(resolveToolLifecycleSnapshot({editingMode: 'dragging'}).state, 'drag')
  assert.equal(resolveToolLifecycleSnapshot({editingMode: 'pathEditing'}).state, 'precision')
  assert.equal(resolveToolLifecycleSnapshot({editingMode: 'idle', transitionReason: 'pointer-up'}).state, 'commit')
  assert.equal(resolveToolLifecycleSnapshot({editingMode: 'idle', transitionReason: 'escape-cancel'}).state, 'cancel')
  assert.equal(resolveToolLifecycleSnapshot({editingMode: 'idle', transitionReason: 'modal-interrupt'}).state, 'interrupted')
  assert.equal(resolveToolLifecycleSnapshot({editingMode: 'rotating'}).owner, 'runtime.editing-mode')
})

test('runtime editing-mode transitions always publish a reason owner', () => {
  const controller = createRuntimeEditingModeController()
  const transitions: Array<{reason?: string; owner: string}> = []
  controller.onTransition({
    onTransition(payload) {
      transitions.push({reason: payload.reason, owner: payload.owner})
    },
  })

  controller.transition({to: 'selecting', reason: 'pointer-down:selector'})
  controller.transition({to: 'idle', reason: 'cleanup.escape', owner: 'runtime.cleanup'})

  assert.deepEqual(transitions, [
    {reason: 'pointer-down:selector', owner: 'runtime.editing-mode'},
    {reason: 'cleanup.escape', owner: 'runtime.cleanup'},
  ])
  assert.equal(controller.getLastTransitionReason(), 'cleanup.escape')
  assert.equal(controller.getLastTransitionOwner(), 'runtime.cleanup')
})

test('Vector2D selection lifecycle uses deterministic precedence', () => {
  assert.equal(resolveSelectionLifecycleSnapshot({selectedIds: []}).state, 'none')
  assert.equal(resolveSelectionLifecycleSnapshot({selectedIds: ['a']}).state, 'single')
  assert.equal(resolveSelectionLifecycleSnapshot({selectedIds: ['a', 'b']}).state, 'multi')
  assert.equal(resolveSelectionLifecycleSnapshot({selectedIds: ['a'], hasSubSelection: true}).state, 'sub-selection')
  assert.equal(resolveSelectionLifecycleSnapshot({
    selectedIds: ['a'],
    hasSubSelection: true,
    isolationGroupId: 'group-a',
  }).state, 'isolation')
  assert.equal(resolveSelectionLifecycleSnapshot({
    selectedIds: ['a'],
    hasSubSelection: true,
    isolationGroupId: 'group-a',
    textFocused: true,
  }).state, 'text-focus')
})

test('Vector2D transform lifecycle resolves preview through terminal states', () => {
  assert.equal(resolveTransformLifecycleSnapshot({previewActive: true}).state, 'preview')
  assert.equal(resolveTransformLifecycleSnapshot({previewActive: true, commitPending: true}).state, 'commit-pending')
  assert.equal(resolveTransformLifecycleSnapshot({committed: true}).state, 'committed')
  assert.equal(resolveTransformLifecycleSnapshot({rolledBack: true}).state, 'rolled-back')
  assert.equal(resolveTransformLifecycleSnapshot({cancelled: true}).state, 'cancelled')
  assert.deepEqual(resolveTransformLifecycleSnapshot({cancelled: true, reasonCode: 'cleanup.escape'}), {
    state: 'cancelled',
    reasonCode: 'cleanup.escape',
    owner: 'runtime.transform',
  })
})

test('Vector2D cleanup triggers produce complete deterministic cleanup plans', () => {
  const triggers: Vector2DCleanupTrigger[] = [
    'pointer-capture-loss',
    'escape',
    'tab-switch',
    'tool-switch',
    'modal-open',
  ]
  const plans = triggers.map(resolveStateMachineCleanupPlan)

  assert.deepEqual(plans.map((plan) => plan.reasonCode), triggers.map((trigger) => `cleanup.${trigger}`))
  plans.forEach((plan) => {
    assert.equal(plan.owner, 'runtime.cleanup')
    assert.deepEqual(plan.actions, [
      'cancel-pointer-session',
      'clear-transform-preview',
      'clear-path-handle-drag',
      'clear-shape-style-drag',
      'clear-draft-primitive',
      'clear-snap-guides',
      'exit-precision-mode',
      'release-pointer-capture',
    ])
  })
  assert.equal(resolveStateMachineCleanupPlan('pointer-capture-loss').nextTransformState, 'rolled-back')
  assert.equal(resolveStateMachineCleanupPlan('escape').nextToolState, 'cancel')
  assert.equal(resolveStateMachineCleanupPlan('modal-open').nextToolState, 'interrupted')
})

test('Vector2D cleanup executor runs the declared cleanup plan in stable order', () => {
  const calls: string[] = []
  const plan = resolveStateMachineCleanupPlan('pointer-capture-loss')

  executeStateMachineCleanupPlan(plan, {
    cancelPointerSession: () => calls.push('cancel-pointer-session'),
    clearTransformPreview: () => calls.push('clear-transform-preview'),
    clearPathHandleDrag: () => calls.push('clear-path-handle-drag'),
    clearShapeStyleDrag: () => calls.push('clear-shape-style-drag'),
    clearDraftPrimitive: () => calls.push('clear-draft-primitive'),
    clearSnapGuides: () => calls.push('clear-snap-guides'),
    exitPrecisionMode: () => calls.push('exit-precision-mode'),
    releasePointerCapture: () => calls.push('release-pointer-capture'),
  })

  assert.deepEqual(calls, plan.actions)
})

test('Vector2D state-machine diagnostics publishes one product-visible snapshot', () => {
  let notificationCount = 0
  const unsubscribe = subscribeVector2DStateMachineDiagnostics(() => {
    notificationCount += 1
  })
  const snapshot = {
    document: resolveDocumentLifecycleSnapshot({readOnly: true}),
    tool: resolveToolLifecycleSnapshot({editingMode: 'dragging', transitionReason: 'pointer-move:drag'}),
    selection: resolveSelectionLifecycleSnapshot({selectedIds: ['a', 'b']}),
    transform: resolveTransformLifecycleSnapshot({commitPending: true}),
  }

  publishVector2DStateMachineDiagnostics(snapshot)
  unsubscribe()

  assert.equal(notificationCount, 1)
  assert.deepEqual(getVector2DStateMachineDiagnosticsSnapshot(), snapshot)
})
