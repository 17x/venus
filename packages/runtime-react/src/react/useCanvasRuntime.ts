import * as React from 'react'
import type { EditorDocument } from '@venus/document-core'
import {
  createCanvasRuntimeController,
  type CanvasRuntimeController,
  type CanvasRuntimeControllerOptions,
  type CanvasRuntimeSnapshot,
} from '@venus/runtime'
import {useCanvasStoreSelector, type CanvasSnapshotStore} from './store.ts'

/**
 * React adapter for the imperative runtime controller.
 *
 * Apps use this hook instead of talking to the controller directly so the
 * editor runtime fits naturally into React render/update flow.
 */
export function useCanvasRuntime<TDocument extends EditorDocument>(
  options: CanvasRuntimeControllerOptions<TDocument>,
) {
  const store = useCanvasRuntimeStore(options)
  const controller = store.controller
  const [snapshot, setSnapshot] = React.useState<CanvasRuntimeSnapshot<TDocument>>(
    controller.getSnapshot(),
  )

  React.useEffect(() => {
    const unsubscribe = controller.subscribe(() => {
      setSnapshot({ ...controller.getSnapshot() })
    })

    setSnapshot({ ...controller.getSnapshot() })
    return () => {
      unsubscribe()
    }
  }, [controller])

  return {
    ...snapshot,
    clearHover: controller.clearHover,
    dispatchCommand: controller.dispatchCommand,
    fitViewport: controller.fitViewport,
    panViewport: controller.panViewport,
    postPointer: controller.postPointer,
    receiveRemoteOperation: controller.receiveRemoteOperation,
    resizeViewport: controller.resizeViewport,
    setViewport: controller.setViewport,
    zoomViewport: controller.zoomViewport,
  }
}

export type CanvasRuntimeStore<TDocument extends EditorDocument> = CanvasSnapshotStore<
  CanvasRuntimeSnapshot<TDocument>,
  CanvasRuntimeController<TDocument>
>

export function useCanvasRuntimeStore<TDocument extends EditorDocument>(
  options: CanvasRuntimeControllerOptions<TDocument>,
) {
  const {capacity, createWorker, document, allowFrameSelection} = options
  const controller = React.useMemo(
    () => createCanvasRuntimeController({
      capacity,
      createWorker,
      document,
      allowFrameSelection,
    }),
    [capacity, createWorker, document, allowFrameSelection],
  )
  const store = React.useMemo<CanvasRuntimeStore<TDocument>>(
    () => ({
      controller,
      getSnapshot: controller.getSnapshot,
      subscribe: controller.subscribe,
    }),
    [controller],
  )

  React.useEffect(() => {
    // Controller lifecycle is tied to the hook instance.
    controller.start()
    return () => {
      controller.destroy()
    }
  }, [controller])

  return store
}

export function useCanvasRuntimeSelector<TDocument extends EditorDocument, TSelection>(
  store: CanvasRuntimeStore<TDocument>,
  selector: (snapshot: CanvasRuntimeSnapshot<TDocument>) => TSelection,
  isEqual?: (previous: TSelection, next: TSelection) => boolean,
) {
  return useCanvasStoreSelector(store, selector, isEqual)
}
