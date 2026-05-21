import type * as React from 'react'
import type {SelectorOverlayItem} from '@venus/editor-primitive'
import type {PointerSelectorModifiers} from '@venus/editor-primitive'
import type {ToolName} from '../../../runtime/model/index.ts'
import type {
  DraftPrimitive,
  DraftPrimitiveType,
  HandleKind,
  PathSubSelection,
  SelectionDragController,
  SnapGuide,
  TransformPreview,
} from '../../../runtime/interaction/index.ts'
import type {ShapeStyleHandleDrag} from '../shapeStyleHandles.ts'
import {
  createPointerSelectorState,
} from '@venus/editor-primitive'
import type {HoverHitBudgetState} from '../../useEditorRuntime/helpers.ts'
import type {ElementProps} from '../../../runtime/types/index.ts'
import type {PointerLifecyclePhase} from './pointerLifecycleState.ts'
import type {RuntimeInteractionDiagnosticEvent} from '../interactionDiagnosticPolicy.ts'

/**
 * Declares mutable controller state kept across pointer events.
 */
export interface EditorRuntimeCanvasInteractionControllerState {
  /** Stores hover throttling state for pointer-move hit-test budget control. */
  hoverHitBudget: HoverHitBudgetState
  /** Stores pointer lifecycle phase used to guard down/up/leave sequencing. */
  pointerLifecyclePhase: PointerLifecyclePhase
  /** Stores pointer-selector FSM state across pointer lifecycle events. */
  pointerSelectorState: ReturnType<typeof createPointerSelectorState>
  /** Stores start screen point for pointer-selector drag threshold resolution. */
  pointerSelectorStartScreen: {x: number; y: number} | null
  /** Stores modifiers captured on pointer-down for pointer-up selection mode resolution. */
  pointerSelectorModifiers: PointerSelectorModifiers | undefined
}

/**
 * Declares pointer and viewport interaction handlers consumed by the canvas surface.
 */
export interface EditorRuntimeCanvasInteractionHandlers {
  /** Handles canvas pointer-move in world coordinates. */
  onPointerMove(point: {x: number; y: number}): void
  /** Handles canvas pointer-down in world coordinates. */
  onPointerDown(
    point: {x: number; y: number},
    modifiers?: {shiftKey: boolean; metaKey: boolean; ctrlKey: boolean; altKey: boolean},
  ): void
  /** Handles pointer-up lifecycle. */
  onPointerUp(): void
  /** Handles pointer-leave lifecycle. */
  onPointerLeave(): void
  /** Forwards viewport change lifecycle to runtime interactions. */
  onViewportChange: ReturnType<typeof import('../../useCanvasRuntimeBridge.ts').useCanvasRuntimeBridge>['interactions']['onViewportChange']
  /** Forwards viewport pan lifecycle to runtime interactions. */
  onViewportPan: ReturnType<typeof import('../../useCanvasRuntimeBridge.ts').useCanvasRuntimeBridge>['interactions']['onViewportPan']
  /** Forwards viewport resize lifecycle to runtime interactions. */
  onViewportResize: ReturnType<typeof import('../../useCanvasRuntimeBridge.ts').useCanvasRuntimeBridge>['interactions']['onViewportResize']
  /** Forwards viewport zoom lifecycle to runtime interactions. */
  onViewportZoom: ReturnType<typeof import('../../useCanvasRuntimeBridge.ts').useCanvasRuntimeBridge>['interactions']['onViewportZoom']
  /** Forwards context-menu lifecycle to runtime interactions. */
  onContextMenu: ReturnType<typeof import('../../useCanvasRuntimeBridge.ts').useCanvasRuntimeBridge>['interactions']['onContextMenu']
}

/**
 * Declares dependencies required by the pure canvas interaction controller.
 */
export interface EditorRuntimeCanvasInteractionControllerOptions {
  /** Stores runtime interaction bridge used to publish input lifecycle events. */
  interactionBridge: ReturnType<typeof import('../useEditorRuntimeInteractionBridge.ts').useEditorRuntimeInteractionBridge>['bridge']
  /** Records runtime interaction diagnostics from pointer key paths. */
  recordInteractionDiagnostic?: (event: RuntimeInteractionDiagnosticEvent) => void
  /** Stores notification callback used by pointer-release flows. */
  add: (message: string, tone: 'info' | 'success' | 'warning' | 'error') => void
  /** Stores runtime snapshot bridge used by interaction handlers. */
  canvasRuntime: ReturnType<typeof import('../../useCanvasRuntimeBridge.ts').useCanvasRuntimeBridge>['runtime']
  /** Clears transform preview cache after commit/cancel paths. */
  clearTransformPreview: VoidFunction
  /** Commits active path-handle update into runtime command channel. */
  commitPathHandleUpdate: (params: {
    shapeId: string
    anchorIndex: number
    handleType: 'inHandle' | 'outHandle'
    point: {x: number; y: number}
  }) => void
  /** Commits active shape-style handle update into runtime command channel. */
  commitShapeStyleHandleUpdate: (params: ShapeStyleHandleDrag) => void
  /** Stores currently selected tool id. */
  currentTool: ToolName
  /** Stores default runtime interaction forwarding handlers. */
  defaultCanvasInteractions: ReturnType<typeof import('../../useCanvasRuntimeBridge.ts').useCanvasRuntimeBridge>['interactions']
  /** Stores current draft primitive state. */
  draftPrimitive: DraftPrimitive | null
  /** Dispatches runtime commands from controller logic. */
  handleCommand: (command: import('../../../runtime/worker/index.ts').EditorRuntimeCommand) => void
  /** Handles zoom-in/zoom-out tool actions. */
  handleZoom: (zoomIn: boolean, point?: {x: number; y: number}) => void
  /** Stores currently hovered shape id from runtime bridge slice. */
  hoveredShapeId: string | null
  /** Inserts one shape element into runtime command flow. */
  insertElement: (element: ElementProps) => void
  /** Stores current interaction document used for hit and selection queries. */
  interactionDocument: ReturnType<typeof import('../../useCanvasRuntimeBridge.ts').useCanvasRuntimeBridge>['runtime']['document']
  /** Marks transform preview pending commit to avoid release race regressions. */
  markTransformPreviewCommitPending: VoidFunction
  /** Stores active path-handle drag session state. */
  pathHandleDrag: {
    shapeId: string
    anchorIndex: number
    handleType: 'inHandle' | 'outHandle'
  } | null
  /** Stores active rect/ellipse style-handle drag session state. */
  shapeStyleHandleDrag: ShapeStyleHandleDrag | null
  /** Stores current path sub-selection state. */
  pathSubSelection: PathSubSelection | null
  /** Stores current path sub-selection hover state. */
  pathSubSelectionHover: PathSubSelection | null
  /** Stores pen-tool adapter handlers. */
  penTool: ReturnType<typeof import('../../usePenTool.ts').usePenTool>
  /** Stores preview shape lookup map by id. */
  previewShapeById: Map<string, import('../../../runtime/model/index.ts').DocumentNode>
  /** Stores preview shape snapshot list. */
  previewShapes: ReturnType<typeof import('../../useCanvasRuntimeBridge.ts').useCanvasRuntimeBridge>['runtime']['shapes']
  /** Resolves draft primitive type from active tool id. */
  resolveDraftPrimitiveType: (toolName: ToolName) => DraftPrimitiveType | null
  /** Stores runtime editing-mode controller ref. */
  runtimeEditingModeControllerRef: React.RefObject<ReturnType<typeof import('../../../runtime/index.ts').createRuntimeEditingModeController>>
  /** Stores runtime shape lookup map by id. */
  runtimeShapeById: Map<string, ReturnType<typeof import('../../useCanvasRuntimeBridge.ts').useCanvasRuntimeBridge>['runtime']['shapes'][number]>
  /** Stores currently selected shape ids. */
  selectedShapeIds: string[]
  /** Stores selection drag controller ref. */
  selectionDragControllerRef: React.RefObject<SelectionDragController>
  /** Stores computed selection-state snapshot used by selection pointer logic. */
  selectionState: ReturnType<typeof import('../../../runtime/interaction/index.ts').buildSelectionState>
  /** Updates active transform-handle state. */
  setActiveTransformHandle: React.Dispatch<React.SetStateAction<HandleKind | null>>
  /** Updates hovered transform-handle state. */
  setHoveredTransformHandle: React.Dispatch<React.SetStateAction<HandleKind | null>>
  /** Updates draft primitive state. */
  setDraftPrimitive: React.Dispatch<React.SetStateAction<DraftPrimitive | null>>
  /** Updates hovered shape id state. */
  setHoveredShapeId: React.Dispatch<React.SetStateAction<string | null>>
  /** Updates selector overlay descriptors used by engine overlay rendering. */
  setSelectorOverlayItems: React.Dispatch<React.SetStateAction<SelectorOverlayItem[]>>
  /** Updates path-handle drag session state. */
  setPathHandleDrag: React.Dispatch<React.SetStateAction<{
    shapeId: string
    anchorIndex: number
    handleType: 'inHandle' | 'outHandle'
  } | null>>
  /** Updates active shape-style handle drag session state. */
  setShapeStyleHandleDrag: React.Dispatch<React.SetStateAction<ShapeStyleHandleDrag | null>>
  /** Updates active path sub-selection state. */
  setPathSubSelection: React.Dispatch<React.SetStateAction<PathSubSelection | null>>
  /** Updates hovered path sub-selection state. */
  setPathSubSelectionHover: React.Dispatch<React.SetStateAction<PathSubSelection | null>>
  /** Updates pen draft point state. */
  setPenDraftPoints: React.Dispatch<React.SetStateAction<Array<{x: number; y: number}> | null>>
  /** Updates snap-guide state. */
  setSnapGuides: React.Dispatch<React.SetStateAction<SnapGuide[]>>
  /** Updates transform preview state. */
  setTransformPreview: (next: TransformPreview | null) => void
  /** Stores effective snapping toggle state after document-size guards. */
  snappingEnabled: boolean
  /** Stores transform-session manager ref. */
  transformManagerRef: React.RefObject<ReturnType<typeof import('../../../runtime/interaction/index.ts').createTransformSessionManager>>
  /** Stores current transform preview state. */
  transformPreview: TransformPreview | null
}