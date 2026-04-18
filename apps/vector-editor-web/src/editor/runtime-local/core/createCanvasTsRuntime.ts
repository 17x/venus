import type {EditorDocument} from '@venus/document-core'
import type {PointerState} from '@vector/runtime/shared-memory'
import type {EditorRuntimeCommand, CollaborationOperation} from '../worker/index.ts'
import {
  createCanvasRuntimeKit,
  type CanvasRuntimeKit,
  type CanvasRuntimeKitEngineBridge,
  type CanvasRuntimeLayerRegistration,
  type CreateCanvasRuntimeKitOptions,
} from './createCanvasRuntimeKit.ts'
import {
  createRuntimeGestureInterpreter,
  type RuntimeGestureInterpreter,
  type RuntimeGestureInterpreterOptions,
} from '../gesture/createRuntimeGestureInterpreter.ts'

/**
 * Framework-agnostic runtime orchestrator.
 *
 * Ownership boundary:
 * - runtime owns events/document selection state/external messaging glue
 * - engine runtime kit owns render + hit-test mechanism routing
 * - app/playground own product strategy and UI
 */

export interface CanvasTsRuntimeNetworkBridge {
  send?: (message: CanvasTsRuntimeOutboundMessage) => void
  onMessage?: (handler: (message: CanvasTsRuntimeInboundMessage) => void) => () => void
}

export type CanvasTsRuntimeOutboundMessage =
  | {type: 'runtime.command'; command: EditorRuntimeCommand}
  | {type: 'runtime.pointer'; pointerType: 'pointermove' | 'pointerdown'; pointer: PointerState}
  | {type: 'runtime.selection'; shapeIds: string[]}

export type CanvasTsRuntimeInboundMessage =
  | {type: 'runtime.command'; command: EditorRuntimeCommand}
  | {type: 'runtime.collaboration'; operation: CollaborationOperation}

export interface CanvasTsRuntimeEventMap<TDocument extends EditorDocument> {
  ready: {documentId: string}
  documentChanged: {document: TDocument}
  selectionChanged: {shapeIds: string[]}
  outbound: CanvasTsRuntimeOutboundMessage
  inbound: CanvasTsRuntimeInboundMessage
}

export interface CreateCanvasTsRuntimeOptions<TDocument extends EditorDocument>
  extends Omit<CreateCanvasRuntimeKitOptions<TDocument>, 'engine'> {
  engine?: CanvasRuntimeKitEngineBridge<TDocument>
  network?: CanvasTsRuntimeNetworkBridge
  gesture?: RuntimeGestureInterpreterOptions
}

export interface CanvasTsRuntime<TDocument extends EditorDocument> {
  engineRuntime: CanvasRuntimeKit<TDocument>
  gesture: RuntimeGestureInterpreter
  start: () => void
  destroy: () => void
  getDocument: () => TDocument
  getSelectedShapeIds: () => string[]
  dispatchCommand: (command: EditorRuntimeCommand) => void
  postPointer: (
    type: 'pointermove' | 'pointerdown',
    pointer: PointerState,
    modifiers?: {shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean; altKey?: boolean},
  ) => void
  receiveInboundMessage: (message: CanvasTsRuntimeInboundMessage) => void
  registerOverlayLayer: (layer: CanvasRuntimeLayerRegistration) => () => void
  registerDynamicLayer: (layer: CanvasRuntimeLayerRegistration) => () => void
  on: <TEvent extends keyof CanvasTsRuntimeEventMap<TDocument>>(
    event: TEvent,
    listener: (payload: CanvasTsRuntimeEventMap<TDocument>[TEvent]) => void,
  ) => () => void
}

type EventMapStore<TDocument extends EditorDocument> = {
  [K in keyof CanvasTsRuntimeEventMap<TDocument>]: Set<
    (payload: CanvasTsRuntimeEventMap<TDocument>[K]) => void
  >
}

export function createCanvasTsRuntime<TDocument extends EditorDocument>(
  options: CreateCanvasTsRuntimeOptions<TDocument>,
): CanvasTsRuntime<TDocument> {
  // Core runtime mechanism bridge (worker lifecycle + viewport/render routing)
  const runtime = createCanvasRuntimeKit<TDocument>({
    capacity: options.capacity,
    createWorker: options.createWorker,
    document: options.document,
    allowFrameSelection: options.allowFrameSelection,
    strictStrokeHitTest: options.strictStrokeHitTest,
    engine: options.engine,
  })

  const listeners: EventMapStore<TDocument> = {
    ready: new Set(),
    documentChanged: new Set(),
    selectionChanged: new Set(),
    outbound: new Set(),
    inbound: new Set(),
  }

  const emit = <TEvent extends keyof CanvasTsRuntimeEventMap<TDocument>>(
    event: TEvent,
    payload: CanvasTsRuntimeEventMap<TDocument>[TEvent],
  ) => {
    listeners[event].forEach((listener) => listener(payload))
  }

  const emitOutbound = (payload: CanvasTsRuntimeOutboundMessage) => {
    emit('outbound', payload)
    options.network?.send?.(payload)
  }

  let previousDocumentVersion = runtime.getSnapshot().stats.version
  let previousSelectedSignature = ''

  // Snapshot subscription keeps document/selection domain events in one place.
  const unsubscribeRuntime = runtime.on('snapshot', (snapshot) => {
    if (snapshot.stats.version !== previousDocumentVersion) {
      previousDocumentVersion = snapshot.stats.version
      emit('documentChanged', {document: snapshot.document})
    }

    const selectedShapeIds = snapshot.shapes
      .filter((shape) => shape.isSelected)
      .map((shape) => shape.id)
    const signature = selectedShapeIds.join('|')
    if (signature !== previousSelectedSignature) {
      previousSelectedSignature = signature
      emit('selectionChanged', {shapeIds: selectedShapeIds})
      emitOutbound({
        type: 'runtime.selection',
        shapeIds: selectedShapeIds,
      })
    }
  })

  // Inbound bridge keeps runtime decoupled from concrete transport protocol.
  const receiveInboundMessage = (message: CanvasTsRuntimeInboundMessage) => {
    emit('inbound', message)
    if (message.type === 'runtime.command') {
      runtime.dispatchCommand(message.command)
      return
    }

    runtime.receiveRemoteOperation(message.operation)
  }

  const unsubscribeNetwork = options.network?.onMessage?.((message) => {
    receiveInboundMessage(message)
  })

  // Gesture module is pure TS and only calls runtime API contracts.
  const gesture = createRuntimeGestureInterpreter({
    applyPan: runtime.applyPanGesture,
    applyScroll: runtime.applyScrollGesture,
    applyZoom: runtime.applyZoomGesture,
    ...options.gesture,
  })

  const start = () => {
    runtime.start()
    emit('ready', {documentId: runtime.getSnapshot().document.id})
  }

  return {
    engineRuntime: runtime,
    gesture,
    start,
    destroy: () => {
      unsubscribeRuntime()
      unsubscribeNetwork?.()
      runtime.destroy()
    },
    getDocument: () => runtime.getSnapshot().document,
    getSelectedShapeIds: () => runtime
      .getSnapshot()
      .shapes
      .filter((shape) => shape.isSelected)
      .map((shape) => shape.id),
    dispatchCommand: (command) => {
      runtime.dispatchCommand(command)
      emitOutbound({
        type: 'runtime.command',
        command,
      })
    },
    postPointer: (type, pointer, modifiers) => {
      runtime.postPointer(type, pointer, modifiers)
      emitOutbound({
        type: 'runtime.pointer',
        pointerType: type,
        pointer,
      })
    },
    receiveInboundMessage,
    registerOverlayLayer: runtime.registerOverlayLayer,
    registerDynamicLayer: runtime.registerDynamicLayer,
    on: (event, listener) => {
      listeners[event].add(listener)
      return () => {
        listeners[event].delete(listener)
      }
    },
  }
}