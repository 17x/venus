import {useMemo, useRef} from 'react'
import type {SelectorOverlayItem} from '@venus/editor-primitive'
import type {
  DraftPrimitive,
  HandleKind,
  PathSubSelection,
  SnapGuide,
} from '../../runtime/interaction/index.ts'
import type {ShapeStyleHandleDrag} from './shapeStyleHandles.ts'
import {
  createRuntimeReactiveBridge,
  type RuntimeReactiveBridge,
  type RuntimeReactiveUpdater,
} from '../../runtime/subscriptions/index.ts'
import {useRuntimeReactiveBridgeSlice} from './useRuntimeReactiveBridgeSlice.ts'
import type {
  RuntimeInteractionDiagnosticCoverage,
  RuntimeInteractionDiagnosticEntry,
} from './interactionDiagnosticPolicy.ts'

/**
 * Declares runtime-owned transient interaction state shared with UI adapters.
 */
export interface EditorRuntimeInteractionSnapshot {
  /** Stores current active transform handle while transform session is running. */
  activeTransformHandle: HandleKind | null
  /** Stores current hovered transform handle for idle cursor affordance. */
  hoveredTransformHandle: HandleKind | null
  /** Stores current hovered shape id resolved from hover hit-test. */
  hoveredShapeId: string | null
  /** Stores selector overlay descriptors produced by pointer selector state machine. */
  selectorOverlayItems: SelectorOverlayItem[]
  /** Stores active path sub-selection target. */
  pathSubSelection: PathSubSelection | null
  /** Stores hovered path sub-selection target for pointer feedback. */
  pathSubSelectionHover: PathSubSelection | null
  /** Stores active path handle drag session state. */
  pathHandleDrag: {
    /** Stores shape id for the dragged handle owner. */
    shapeId: string
    /** Stores anchor index for the dragged handle owner. */
    anchorIndex: number
    /** Stores dragged bezier handle side. */
    handleType: 'inHandle' | 'outHandle'
  } | null
  /** Stores active style-handle drag session state for rect/ellipse parameter editing. */
  shapeStyleHandleDrag: ShapeStyleHandleDrag | null
  /** Stores pen-tool preview points while drafting a path. */
  penDraftPoints: Array<{x: number; y: number}> | null
  /** Stores current draft primitive while drag-create tools are active. */
  draftPrimitive: DraftPrimitive | null
  /** Stores snap guides rendered by transform and snapping flows. */
  snapGuides: SnapGuide[]
  /** Stores latest runtime command type emitted by product/runtime command channel. */
  lastCommandType: string | null
  /** Stores selected shape id list mirrored for query-based UI bridges. */
  selectedShapeIds: string[]
  /** Stores shell-level selected count mirrored for lightweight subscribers. */
  shellSelectedCount: number
  /** Stores shell-level layer count mirrored for lightweight subscribers. */
  shellLayerCount: number
}

/**
 * Declares event payloads emitted by runtime interaction bridge transitions.
 */
export type EditorRuntimeInteractionEvent = {
  /** Stores event topic name for runtime interaction observers. */
  type: 'interaction.state.changed'
  /** Stores state field that changed in this transition. */
  field: keyof EditorRuntimeInteractionSnapshot
} | {
  /** Stores event topic name for input lifecycle transitions. */
  type: 'input.pointer.down' | 'input.pointer.move' | 'input.pointer.up' | 'input.pointer.leave'
} | {
  /** Stores event topic name for tool selection transitions. */
  type: 'runtime.tool.selected'
  /** Stores selected tool id for runtime observers. */
  tool: string
} | {
  /** Stores event topic name for command dispatch transitions. */
  type: 'runtime.command.dispatched'
  /** Stores runtime command type emitted by command channel. */
  commandType: string
} | {
  /** Stores event topic name for selection snapshot transitions. */
  type: 'runtime.selection.changed'
  /** Stores next selected shape ids after command application. */
  selectedShapeIds: string[]
} | {
  /** Stores event topic name for shell snapshot transitions. */
  type: 'runtime.shell.changed'
  /** Stores latest selected-count value mirrored to shell subscribers. */
  selectedCount: number
  /** Stores latest layer-count value mirrored to shell subscribers. */
  layerCount: number
} | {
  /** Stores event topic name for runtime interaction diagnostics transitions. */
  type: 'runtime.interaction.diagnostic'
  /** Stores latest diagnostic entry emitted by key-path instrumentation. */
  entry: RuntimeInteractionDiagnosticEntry
  /** Stores current metric-log coverage snapshot used for acceptance checks. */
  coverage: RuntimeInteractionDiagnosticCoverage
}

/**
 * Declares dispatch-like action surface consumed by product/runtime hooks.
 */
export interface EditorRuntimeInteractionActions {
  /** Updates active transform handle state. */
  setActiveTransformHandle(next: RuntimeReactiveUpdater<HandleKind | null>): void
  /** Updates hovered transform handle state. */
  setHoveredTransformHandle(next: RuntimeReactiveUpdater<HandleKind | null>): void
  /** Updates hovered shape state. */
  setHoveredShapeId(next: RuntimeReactiveUpdater<string | null>): void
  /** Updates selector overlay descriptors. */
  setSelectorOverlayItems(next: RuntimeReactiveUpdater<SelectorOverlayItem[]>): void
  /** Updates active path sub-selection state. */
  setPathSubSelection(next: RuntimeReactiveUpdater<PathSubSelection | null>): void
  /** Updates hovered path sub-selection state. */
  setPathSubSelectionHover(next: RuntimeReactiveUpdater<PathSubSelection | null>): void
  /** Updates active path-handle drag session state. */
  setPathHandleDrag(next: RuntimeReactiveUpdater<EditorRuntimeInteractionSnapshot['pathHandleDrag']>): void
  /** Updates active style-handle drag session state. */
  setShapeStyleHandleDrag(next: RuntimeReactiveUpdater<EditorRuntimeInteractionSnapshot['shapeStyleHandleDrag']>): void
  /** Updates pen draft point preview state. */
  setPenDraftPoints(next: RuntimeReactiveUpdater<Array<{x: number; y: number}> | null>): void
  /** Updates draft primitive state. */
  setDraftPrimitive(next: RuntimeReactiveUpdater<DraftPrimitive | null>): void
  /** Updates active snapping guide set. */
  setSnapGuides(next: RuntimeReactiveUpdater<SnapGuide[]>): void
  /** Updates latest runtime command type mirrored to query subscribers. */
  setLastCommandType(next: RuntimeReactiveUpdater<string | null>): void
  /** Updates selected shape id slice mirrored to query subscribers. */
  setSelectedShapeIds(next: RuntimeReactiveUpdater<string[]>): void
  /** Updates shell selected-count slice mirrored to query subscribers. */
  setShellSelectedCount(next: RuntimeReactiveUpdater<number>): void
  /** Updates shell layer-count slice mirrored to query subscribers. */
  setShellLayerCount(next: RuntimeReactiveUpdater<number>): void
}

const INITIAL_INTERACTION_SNAPSHOT: EditorRuntimeInteractionSnapshot = {
  activeTransformHandle: null,
  hoveredTransformHandle: null,
  hoveredShapeId: null,
  selectorOverlayItems: [],
  pathSubSelection: null,
  pathSubSelectionHover: null,
  pathHandleDrag: null,
  shapeStyleHandleDrag: null,
  penDraftPoints: null,
  draftPrimitive: null,
  snapGuides: [],
  lastCommandType: null,
  selectedShapeIds: [],
  shellSelectedCount: 0,
  shellLayerCount: 0,
}

/**
 * Resolves one next field value from value-or-updater input.
 */
function resolveFieldValue<TValue>(
  current: TValue,
  next: RuntimeReactiveUpdater<TValue>,
): TValue {
  if (typeof next === 'function') {
    const updater = next as (value: TValue) => TValue
    return updater(current)
  }
  return next
}

/**
 * Creates one dispatch-like field updater bound to the runtime interaction bridge.
 */
function createFieldSetter<TKey extends keyof EditorRuntimeInteractionSnapshot>(
  bridge: RuntimeReactiveBridge<EditorRuntimeInteractionSnapshot, EditorRuntimeInteractionEvent>,
  field: TKey,
) {
  return (next: RuntimeReactiveUpdater<EditorRuntimeInteractionSnapshot[TKey]>) => {
    let changed = false

    bridge.patch((current) => {
      const nextField = resolveFieldValue(current[field], next)
      if (Object.is(nextField, current[field])) {
        return current
      }
      changed = true
      return {
        ...current,
        [field]: nextField,
      }
    })

    // Emit transition events after patch so subscribers can query latest snapshot synchronously.
    if (changed) {
      bridge.dispatch({
        type: 'interaction.state.changed',
        field,
      })
    }
  }
}

/**
 * Creates and consumes editor runtime interaction bridge with slice-level React subscriptions.
 */
export function useEditorRuntimeInteractionBridge() {
  const bridgeRef = useRef<
    RuntimeReactiveBridge<EditorRuntimeInteractionSnapshot, EditorRuntimeInteractionEvent>
  >(createRuntimeReactiveBridge(INITIAL_INTERACTION_SNAPSHOT))
  const bridge = bridgeRef.current

  const activeTransformHandle = useRuntimeReactiveBridgeSlice(
    bridge,
    (snapshot) => snapshot.activeTransformHandle,
  )
  const hoveredTransformHandle = useRuntimeReactiveBridgeSlice(
    bridge,
    (snapshot) => snapshot.hoveredTransformHandle,
  )
  const hoveredShapeId = useRuntimeReactiveBridgeSlice(
    bridge,
    (snapshot) => snapshot.hoveredShapeId,
  )
  const selectorOverlayItems = useRuntimeReactiveBridgeSlice(
    bridge,
    (snapshot) => snapshot.selectorOverlayItems,
  )
  const pathSubSelection = useRuntimeReactiveBridgeSlice(
    bridge,
    (snapshot) => snapshot.pathSubSelection,
  )
  const pathSubSelectionHover = useRuntimeReactiveBridgeSlice(
    bridge,
    (snapshot) => snapshot.pathSubSelectionHover,
  )
  const pathHandleDrag = useRuntimeReactiveBridgeSlice(
    bridge,
    (snapshot) => snapshot.pathHandleDrag,
  )
  const shapeStyleHandleDrag = useRuntimeReactiveBridgeSlice(
    bridge,
    (snapshot) => snapshot.shapeStyleHandleDrag,
  )
  const penDraftPoints = useRuntimeReactiveBridgeSlice(
    bridge,
    (snapshot) => snapshot.penDraftPoints,
  )
  const draftPrimitive = useRuntimeReactiveBridgeSlice(
    bridge,
    (snapshot) => snapshot.draftPrimitive,
  )
  const snapGuides = useRuntimeReactiveBridgeSlice(
    bridge,
    (snapshot) => snapshot.snapGuides,
  )
  const lastCommandType = useRuntimeReactiveBridgeSlice(
    bridge,
    (snapshot) => snapshot.lastCommandType,
  )
  const selectedShapeIds = useRuntimeReactiveBridgeSlice(
    bridge,
    (snapshot) => snapshot.selectedShapeIds,
  )
  const shellSelectedCount = useRuntimeReactiveBridgeSlice(
    bridge,
    (snapshot) => snapshot.shellSelectedCount,
  )
  const shellLayerCount = useRuntimeReactiveBridgeSlice(
    bridge,
    (snapshot) => snapshot.shellLayerCount,
  )

  const actions = useMemo<EditorRuntimeInteractionActions>(() => ({
    setActiveTransformHandle: createFieldSetter(bridge, 'activeTransformHandle'),
    setHoveredTransformHandle: createFieldSetter(bridge, 'hoveredTransformHandle'),
    setHoveredShapeId: createFieldSetter(bridge, 'hoveredShapeId'),
    setSelectorOverlayItems: createFieldSetter(bridge, 'selectorOverlayItems'),
    setPathSubSelection: createFieldSetter(bridge, 'pathSubSelection'),
    setPathSubSelectionHover: createFieldSetter(bridge, 'pathSubSelectionHover'),
    setPathHandleDrag: createFieldSetter(bridge, 'pathHandleDrag'),
    setShapeStyleHandleDrag: createFieldSetter(bridge, 'shapeStyleHandleDrag'),
    setPenDraftPoints: createFieldSetter(bridge, 'penDraftPoints'),
    setDraftPrimitive: createFieldSetter(bridge, 'draftPrimitive'),
    setSnapGuides: createFieldSetter(bridge, 'snapGuides'),
    setLastCommandType: createFieldSetter(bridge, 'lastCommandType'),
    setSelectedShapeIds: createFieldSetter(bridge, 'selectedShapeIds'),
    setShellSelectedCount: createFieldSetter(bridge, 'shellSelectedCount'),
    setShellLayerCount: createFieldSetter(bridge, 'shellLayerCount'),
  }), [bridge])

  return {
    bridge,
    actions,
    state: {
      activeTransformHandle,
      hoveredTransformHandle,
      hoveredShapeId,
      selectorOverlayItems,
      pathSubSelection,
      pathSubSelectionHover,
      pathHandleDrag,
      shapeStyleHandleDrag,
      penDraftPoints,
      draftPrimitive,
      snapGuides,
      lastCommandType,
      selectedShapeIds,
      shellSelectedCount,
      shellLayerCount,
    },
  }
}