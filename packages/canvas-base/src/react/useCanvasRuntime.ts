import * as React from 'react'
import type { EditorDocument } from '@venus/editor-core'
import {
  createCanvasRuntimeController,
  type CanvasRuntimeControllerOptions,
  type CanvasRuntimeSnapshot,
} from '../runtime/createCanvasRuntimeController.ts'

export function useCanvasRuntime<TDocument extends EditorDocument>(
  options: CanvasRuntimeControllerOptions<TDocument>,
) {
  const controller = React.useMemo(
    () => createCanvasRuntimeController(options),
    [options],
  )
  const [snapshot, setSnapshot] = React.useState<CanvasRuntimeSnapshot<TDocument>>(
    controller.getSnapshot(),
  )

  React.useEffect(() => {
    controller.start()
    const unsubscribe = controller.subscribe(() => {
      setSnapshot({ ...controller.getSnapshot() })
    })

    setSnapshot({ ...controller.getSnapshot() })

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
    receiveRemoteOperation: controller.receiveRemoteOperation,
    resizeViewport: controller.resizeViewport,
    zoomViewport: controller.zoomViewport,
  }
}
