import * as React from 'react'
import type {EditorDocument} from '@venus/document-core'
import {
  createCanvasViewerController,
  type CanvasViewerControllerOptions,
  type CanvasViewerSnapshot,
} from '../runtime/createCanvasViewerController.ts'

/**
 * React adapter for viewer mode (no worker/SAB required).
 *
 * Use this for read-only scenes such as previews, embeds, and catalogs where
 * viewport interaction is needed but edit commands are disabled.
 */
export function useCanvasViewer<TDocument extends EditorDocument>(
  options: CanvasViewerControllerOptions<TDocument>,
) {
  const {document, enableHitTest, selectOnPointerDown} = options
  const controller = React.useMemo(
    () =>
      createCanvasViewerController({
        document,
        enableHitTest,
        selectOnPointerDown,
      }),
    [document, enableHitTest, selectOnPointerDown],
  )
  const [snapshot, setSnapshot] = React.useState<CanvasViewerSnapshot<TDocument>>(
    controller.getSnapshot(),
  )

  React.useEffect(() => {
    controller.start()
    const unsubscribe = controller.subscribe(() => {
      setSnapshot({...controller.getSnapshot()})
    })
    setSnapshot({...controller.getSnapshot()})

    return () => {
      unsubscribe()
      controller.destroy()
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
    zoomViewport: controller.zoomViewport,
  }
}
