import * as React from 'react'
import type {EditorDocument} from '@vector/model'
import {
  createDefaultCanvasRuntimeApi,
  type CanvasPresentationConfig,
  type CanvasPresentationConfigPatch,
  type CanvasRuntimeApi,
  type CanvasRuntimeSnapshot,
  type DefaultCanvasRuntimeOptions,
} from '@vector/runtime'
import {
  type DefaultCanvasInteractions,
} from '../../runtime/interaction/index.ts'

export interface UseCanvasRuntimeBridgeOptions<TDocument extends EditorDocument>
  extends DefaultCanvasRuntimeOptions<TDocument> {
  onContextMenu?: (position: {x: number; y: number}) => void
  presentation?: CanvasPresentationConfigPatch
}

export type CanvasRuntimeBridgeState<TDocument extends EditorDocument> =
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

/**
 * App-local React glue over pure runtime TS APIs.
 */
export function useCanvasRuntimeBridge<TDocument extends EditorDocument>(
  options: UseCanvasRuntimeBridgeOptions<TDocument>,
): {
  runtime: CanvasRuntimeBridgeState<TDocument>
  interactions: DefaultCanvasInteractions
  presentation: CanvasPresentationConfig
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
    onContextMenu,
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
      onContextMenu,
      presentation: options.presentation,
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
      onContextMenu,
      options.presentation,
    ],
  )

  const [snapshot, setSnapshot] = React.useState<CanvasRuntimeSnapshot<TDocument>>(
    runtimeApi.getSnapshot(),
  )
  const [presentation, setPresentation] = React.useState<CanvasPresentationConfig>(
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
      setPresentation(runtimeApi.getPresentationConfig())
    })
    setSnapshot({...runtimeApi.getSnapshot()})
    setPresentation(runtimeApi.getPresentationConfig())

    return () => {
      unsubscribe()
    }
  }, [runtimeApi])

  const runtime = React.useMemo<CanvasRuntimeBridgeState<TDocument>>(
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

  return {
    runtime,
    interactions: runtimeApi.interactions,
    presentation,
  }
}