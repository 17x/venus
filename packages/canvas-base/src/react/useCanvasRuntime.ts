import * as React from 'react'
import type { EditorDocument } from '@venus/document-core'
import {
  createCanvasRuntimeController,
  type CanvasRuntimeControllerOptions,
  type CanvasRuntimeSnapshot,
} from '../runtime/createCanvasRuntimeController.ts'

const SLOW_SNAPSHOT_APPLY_MS = 8

/**
 * React adapter for the imperative runtime controller.
 *
 * Apps use this hook instead of talking to the controller directly so the
 * editor runtime fits naturally into React render/update flow.
 */
export function useCanvasRuntime<TDocument extends EditorDocument>(
  options: CanvasRuntimeControllerOptions<TDocument>,
) {
  const {capacity, createWorker, document} = options
  const controller = React.useMemo(
    () => createCanvasRuntimeController({
      capacity,
      createWorker,
      document,
    }),
    [capacity, createWorker, document],
  )
  const [snapshot, setSnapshot] = React.useState<CanvasRuntimeSnapshot<TDocument>>(
    controller.getSnapshot(),
  )

  React.useEffect(() => {
    // Controller lifecycle is tied to the hook instance.
    controller.start()
    const unsubscribe = controller.subscribe(() => {
      const applyStart = performance.now()
      const nextSnapshot = { ...controller.getSnapshot() }
      const applyMs = performance.now() - applyStart

      if (applyMs >= SLOW_SNAPSHOT_APPLY_MS) {
        console.debug('CANVAS-BASE slow snapshot apply', {
          applyMs: Number(applyMs.toFixed(2)),
          shapeCount: nextSnapshot.stats.shapeCount,
          version: nextSnapshot.stats.version,
        })
      }

      setSnapshot(nextSnapshot)
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
