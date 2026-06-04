import type {RuntimeEditingMode} from '../../runtime/editing-modes/controller.ts'
import type {EditorFileLifecycleState} from '../../runtime/types/index.ts'

export type Vector2DStateMachineOwner =
  | 'product.document-lifecycle'
  | 'runtime.editing-mode'
  | 'runtime.selection'
  | 'runtime.transform'
  | 'runtime.cleanup'

export interface Vector2DStateSnapshot<TState extends string> {
  state: TState
  reasonCode: string
  owner: Vector2DStateMachineOwner
}

export type Vector2DDocumentLifecycleState =
  | EditorFileLifecycleState['state']
  | 'read-only'
  | 'error'

export type Vector2DToolLifecycleState =
  | 'idle'
  | 'hover'
  | 'press'
  | 'drag'
  | 'precision'
  | 'commit'
  | 'cancel'
  | 'interrupted'

export type Vector2DSelectionLifecycleState =
  | 'none'
  | 'single'
  | 'multi'
  | 'sub-selection'
  | 'isolation'
  | 'text-focus'

export type Vector2DTransformLifecycleState =
  | 'preview'
  | 'commit-pending'
  | 'committed'
  | 'rolled-back'
  | 'cancelled'

export type Vector2DCleanupTrigger =
  | 'pointer-capture-loss'
  | 'escape'
  | 'tab-switch'
  | 'tool-switch'
  | 'modal-open'

export interface Vector2DCleanupPlan {
  trigger: Vector2DCleanupTrigger
  reasonCode: `cleanup.${Vector2DCleanupTrigger}`
  owner: 'runtime.cleanup'
  actions: Array<
    | 'cancel-pointer-session'
    | 'clear-transform-preview'
    | 'clear-path-handle-drag'
    | 'clear-shape-style-drag'
    | 'clear-draft-primitive'
    | 'clear-snap-guides'
    | 'exit-precision-mode'
    | 'release-pointer-capture'
  >
  nextToolState: 'cancel' | 'interrupted'
  nextTransformState: 'cancelled' | 'rolled-back'
}

export interface Vector2DCleanupHandlers {
  cancelPointerSession?: VoidFunction
  clearTransformPreview?: VoidFunction
  clearPathHandleDrag?: VoidFunction
  clearShapeStyleDrag?: VoidFunction
  clearDraftPrimitive?: VoidFunction
  clearSnapGuides?: VoidFunction
  exitPrecisionMode?: VoidFunction
  releasePointerCapture?: VoidFunction
}

export interface Vector2DStateMachineDiagnosticsSnapshot {
  document: Vector2DStateSnapshot<Vector2DDocumentLifecycleState>
  tool: Vector2DStateSnapshot<Vector2DToolLifecycleState>
  selection: Vector2DStateSnapshot<Vector2DSelectionLifecycleState>
  transform: Vector2DStateSnapshot<Vector2DTransformLifecycleState>
}

export const EMPTY_VECTOR2D_STATE_MACHINE_DIAGNOSTICS: Vector2DStateMachineDiagnosticsSnapshot = {
  document: {state: 'opened', reasonCode: 'document.opened', owner: 'product.document-lifecycle'},
  tool: {state: 'idle', reasonCode: 'tool.idle', owner: 'runtime.editing-mode'},
  selection: {state: 'none', reasonCode: 'selection.none', owner: 'runtime.selection'},
  transform: {state: 'committed', reasonCode: 'transform.committed', owner: 'runtime.transform'},
}

let stateMachineDiagnosticsSnapshot = EMPTY_VECTOR2D_STATE_MACHINE_DIAGNOSTICS
const stateMachineDiagnosticsListeners = new Set<VoidFunction>()

export function publishVector2DStateMachineDiagnostics(snapshot: Vector2DStateMachineDiagnosticsSnapshot) {
  stateMachineDiagnosticsSnapshot = snapshot
  stateMachineDiagnosticsListeners.forEach((listener) => listener())
}

export function getVector2DStateMachineDiagnosticsSnapshot() {
  return stateMachineDiagnosticsSnapshot
}

export function subscribeVector2DStateMachineDiagnostics(listener: VoidFunction) {
  stateMachineDiagnosticsListeners.add(listener)
  return () => stateMachineDiagnosticsListeners.delete(listener)
}

export function resolveDocumentLifecycleSnapshot(input: {
  lifecycle?: EditorFileLifecycleState
  readOnly?: boolean
  errorCode?: string | null
}): Vector2DStateSnapshot<Vector2DDocumentLifecycleState> {
  if (input.errorCode) {
    return {
      state: 'error',
      reasonCode: `document.error.${input.errorCode}`,
      owner: 'product.document-lifecycle',
    }
  }
  if (input.readOnly) {
    return {
      state: 'read-only',
      reasonCode: 'document.read-only.config',
      owner: 'product.document-lifecycle',
    }
  }
  const state = input.lifecycle?.state ?? 'opened'
  return {
    state,
    reasonCode: input.lifecycle?.lastTransitionSource?.event ?? `document.${state}`,
    owner: 'product.document-lifecycle',
  }
}

export function resolveToolLifecycleSnapshot(input: {
  editingMode: RuntimeEditingMode
  pointerPressed?: boolean
  hovered?: boolean
  transitionReason?: string | null
}): Vector2DStateSnapshot<Vector2DToolLifecycleState> {
  const state: Vector2DToolLifecycleState = (() => {
    if (input.transitionReason?.includes('cancel')) return 'cancel'
    if (input.transitionReason?.includes('interrupt')) return 'interrupted'
    if (input.transitionReason?.includes('commit') || input.transitionReason === 'pointer-up') return 'commit'
    if (input.editingMode === 'pathEditing' || input.editingMode === 'directSelecting') return 'precision'
    if (input.editingMode === 'dragging' || input.editingMode === 'resizing' || input.editingMode === 'rotating') return 'drag'
    if (input.pointerPressed) return 'press'
    if (input.hovered) return 'hover'
    return 'idle'
  })()
  return {
    state,
    reasonCode: input.transitionReason ?? `tool.${state}`,
    owner: 'runtime.editing-mode',
  }
}

export function resolveSelectionLifecycleSnapshot(input: {
  selectedIds: string[]
  hasSubSelection?: boolean
  isolationGroupId?: string | null
  textFocused?: boolean
}): Vector2DStateSnapshot<Vector2DSelectionLifecycleState> {
  const state: Vector2DSelectionLifecycleState = input.textFocused
    ? 'text-focus'
    : input.isolationGroupId
      ? 'isolation'
      : input.hasSubSelection
        ? 'sub-selection'
        : input.selectedIds.length === 0
          ? 'none'
          : input.selectedIds.length === 1
            ? 'single'
            : 'multi'
  return {
    state,
    reasonCode: `selection.${state}`,
    owner: 'runtime.selection',
  }
}

export function resolveTransformLifecycleSnapshot(input: {
  previewActive?: boolean
  commitPending?: boolean
  committed?: boolean
  rolledBack?: boolean
  cancelled?: boolean
  reasonCode?: string
}): Vector2DStateSnapshot<Vector2DTransformLifecycleState> {
  const state: Vector2DTransformLifecycleState = input.cancelled
    ? 'cancelled'
    : input.rolledBack
      ? 'rolled-back'
      : input.committed
        ? 'committed'
        : input.commitPending
          ? 'commit-pending'
          : 'preview'
  return {
    state,
    reasonCode: input.reasonCode ?? `transform.${state}`,
    owner: 'runtime.transform',
  }
}

const COMMON_CLEANUP_ACTIONS: Vector2DCleanupPlan['actions'] = [
  'cancel-pointer-session',
  'clear-transform-preview',
  'clear-path-handle-drag',
  'clear-shape-style-drag',
  'clear-draft-primitive',
  'clear-snap-guides',
  'exit-precision-mode',
  'release-pointer-capture',
]

export function resolveStateMachineCleanupPlan(trigger: Vector2DCleanupTrigger): Vector2DCleanupPlan {
  return {
    trigger,
    reasonCode: `cleanup.${trigger}`,
    owner: 'runtime.cleanup',
    actions: COMMON_CLEANUP_ACTIONS.slice(),
    nextToolState: trigger === 'escape' || trigger === 'tool-switch' ? 'cancel' : 'interrupted',
    nextTransformState: trigger === 'pointer-capture-loss' ? 'rolled-back' : 'cancelled',
  }
}

export function executeStateMachineCleanupPlan(
  plan: Vector2DCleanupPlan,
  handlers: Vector2DCleanupHandlers,
) {
  const actionHandlers: Record<Vector2DCleanupPlan['actions'][number], VoidFunction | undefined> = {
    'cancel-pointer-session': handlers.cancelPointerSession,
    'clear-transform-preview': handlers.clearTransformPreview,
    'clear-path-handle-drag': handlers.clearPathHandleDrag,
    'clear-shape-style-drag': handlers.clearShapeStyleDrag,
    'clear-draft-primitive': handlers.clearDraftPrimitive,
    'clear-snap-guides': handlers.clearSnapGuides,
    'exit-precision-mode': handlers.exitPrecisionMode,
    'release-pointer-capture': handlers.releasePointerCapture,
  }
  plan.actions.forEach((action) => {
    actionHandlers[action]?.()
  })
  return plan
}
