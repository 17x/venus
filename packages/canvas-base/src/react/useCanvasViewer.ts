import * as React from 'react'
import type {EditorDocument} from '@venus/document-core'
import {
  createCanvasViewerController,
  type CanvasViewerController,
  type CanvasViewerControllerOptions,
  type CanvasViewerSnapshot,
} from '../runtime/createCanvasViewerController.ts'
import {useCanvasStoreSelector, type CanvasSnapshotStore} from './store.ts'

/**
 * React adapter for viewer mode (no worker/SAB required).
 *
 * Use this for read-only scenes such as previews, embeds, and catalogs where
 * viewport interaction is needed but edit commands are disabled.
 */
export function useCanvasViewer<TDocument extends EditorDocument>(
  options: CanvasViewerControllerOptions<TDocument>,
) {
  const store = useCanvasViewerStore(options)
  const controller = store.controller
  const [snapshot, setSnapshot] = React.useState<CanvasViewerSnapshot<TDocument>>(
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
    resizeViewport: controller.resizeViewport,
    setViewport: controller.setViewport,
    zoomViewport: controller.zoomViewport,
  }
}

export type CanvasViewerStore<TDocument extends EditorDocument> = CanvasSnapshotStore<
  CanvasViewerSnapshot<TDocument>,
  CanvasViewerController<TDocument>
>

export function useCanvasViewerStore<TDocument extends EditorDocument>(
  options: CanvasViewerControllerOptions<TDocument>,
) {
  const {document, enableHitTest, hoverOnPointerMove, selectOnPointerDown} = options
  const controller = React.useMemo(
    () =>
      createCanvasViewerController({
        document,
        enableHitTest,
        hoverOnPointerMove,
        selectOnPointerDown,
      }),
    [document, enableHitTest, hoverOnPointerMove, selectOnPointerDown],
  )
  const store = React.useMemo<CanvasViewerStore<TDocument>>(
    () => ({
      controller,
      getSnapshot: controller.getSnapshot,
      subscribe: controller.subscribe,
    }),
    [controller],
  )

  React.useEffect(() => {
    controller.start()
    return () => {
      controller.destroy()
    }
  }, [controller])

  return store
}

export function useCanvasViewerSelector<TDocument extends EditorDocument, TSelection>(
  store: CanvasViewerStore<TDocument>,
  selector: (snapshot: CanvasViewerSnapshot<TDocument>) => TSelection,
  isEqual?: (previous: TSelection, next: TSelection) => boolean,
) {
  return useCanvasStoreSelector(store, selector, isEqual)
}
