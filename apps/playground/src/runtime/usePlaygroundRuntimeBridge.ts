import * as React from 'react'
import type {EditorDocument} from '@venus/document-core'
import {
  createDefaultCanvasRuntimeApi,
  type CanvasPresentationConfig,
  type CanvasPresentationConfigPatch,
  type CanvasRuntimeApi,
  type CanvasRuntimeSnapshot,
  type DefaultCanvasRuntimeOptions,
} from '@venus/runtime'
import {
  type DefaultCanvasInteractions,
  type ResolveHoverShapeOptions,
} from '@venus/runtime/interaction'

export interface UsePlaygroundRuntimeBridgeOptions<TDocument extends EditorDocument>
  extends DefaultCanvasRuntimeOptions<TDocument> {
  hoverResolveOptions?: ResolveHoverShapeOptions
  presentation?: CanvasPresentationConfigPatch
}

export type PlaygroundRuntimeBridgeState<TDocument extends EditorDocument> =
  CanvasRuntimeSnapshot<TDocument> &
  Pick<CanvasRuntimeApi<TDocument>,
    'clearHover' |
    'dispatchCommand' |
    'fitViewport' |
    'panViewport' |
    'postPointer' |
    'receiveRemoteOperation' |
    'resizeViewport' |
    'setViewport' |
    'zoomViewport'
  >

export function usePlaygroundRuntimeBridge<TDocument extends EditorDocument>(
  options: UsePlaygroundRuntimeBridgeOptions<TDocument>,
): {
  runtime: PlaygroundRuntimeBridgeState<TDocument>
  interactions: DefaultCanvasInteractions
  presentation: CanvasPresentationConfig
  hoveredShapeId: string | null
  updateHover: (pointer: {x: number; y: number}) => void
  clearHover: () => void
} {
  const {
    capacity,
    createWorker,
    document,
    allowFrameSelection,
    strictStrokeHitTest,
    elements,
    selection,
    snapping,
    snappingPreset,
    history,
    protocol,
    onHistoryCommand,
    onProtocolCommand,
    extraModules,
    hoverResolveOptions,
    presentation,
  } = options

  const runtimeApi = React.useMemo(
    () => createDefaultCanvasRuntimeApi({
      capacity,
      createWorker,
      document,
      allowFrameSelection,
      strictStrokeHitTest,
      elements,
      selection,
      snapping,
      snappingPreset,
      history,
      protocol,
      onHistoryCommand,
      onProtocolCommand,
      extraModules,
      hoverResolveOptions,
      presentation,
    }),
    [
      allowFrameSelection,
      capacity,
      createWorker,
      document,
      elements,
      extraModules,
      history,
      onHistoryCommand,
      onProtocolCommand,
      protocol,
      selection,
      snapping,
      snappingPreset,
      strictStrokeHitTest,
      hoverResolveOptions,
      presentation,
    ],
  )

  const [snapshot, setSnapshot] = React.useState<CanvasRuntimeSnapshot<TDocument>>(
    runtimeApi.getSnapshot(),
  )
  const [hoveredShapeId, setHoveredShapeId] = React.useState<string | null>(
    runtimeApi.getOverlayHoverShapeId(),
  )
  const [presentationState, setPresentationState] = React.useState<CanvasPresentationConfig>(
    runtimeApi.getPresentationConfig(),
  )

  React.useEffect(() => {
    runtimeApi.start()
    return () => {
      runtimeApi.destroy()
    }
  }, [runtimeApi])

  React.useEffect(() => {
    const unsubscribe = runtimeApi.subscribe(() => {
      setSnapshot({...runtimeApi.getSnapshot()})
      setHoveredShapeId(runtimeApi.getOverlayHoverShapeId())
      setPresentationState(runtimeApi.getPresentationConfig())
    })
    setSnapshot({...runtimeApi.getSnapshot()})
    setHoveredShapeId(runtimeApi.getOverlayHoverShapeId())
    setPresentationState(runtimeApi.getPresentationConfig())

    return () => {
      unsubscribe()
    }
  }, [runtimeApi])

  const runtime = React.useMemo<PlaygroundRuntimeBridgeState<TDocument>>(
    () => ({
      ...snapshot,
      clearHover: runtimeApi.clearHover,
      dispatchCommand: runtimeApi.dispatchCommand,
      fitViewport: runtimeApi.fitViewport,
      panViewport: runtimeApi.panViewport,
      postPointer: runtimeApi.postPointer,
      receiveRemoteOperation: runtimeApi.receiveRemoteOperation,
      resizeViewport: runtimeApi.resizeViewport,
      setViewport: runtimeApi.setViewport,
      zoomViewport: runtimeApi.zoomViewport,
    }),
    [runtimeApi, snapshot],
  )

  const updateHover = React.useCallback((pointer: {x: number; y: number}) => {
    runtimeApi.updateHoverFromPoint(pointer)
  }, [runtimeApi])

  const clearHover = React.useCallback(() => {
    runtimeApi.setOverlayHoverShapeId(null)
  }, [runtimeApi])

  return {
    runtime,
    interactions: runtimeApi.interactions,
    presentation: presentationState,
    hoveredShapeId,
    updateHover,
    clearHover,
  }
}
