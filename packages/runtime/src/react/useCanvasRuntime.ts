import * as React from 'react'
import type { EditorDocument } from '@venus/document-core'
import {
  createCanvasEditorInstance,
  type CanvasEditorInstance,
  type CanvasEditorInstanceOptions,
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
  options: CanvasEditorInstanceOptions<TDocument>,
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
  CanvasEditorInstance<TDocument>
>

export function useCanvasRuntimeStore<TDocument extends EditorDocument>(
  options: CanvasEditorInstanceOptions<TDocument>,
) {
  const {capacity, createWorker, document, allowFrameSelection, elements, modules} = options
  const controller = React.useMemo(
    // Use the editor-instance runtime path so app hooks can consume optional
    // runtime modules (for example runtime-presets) without rewriting app code.
    () => createCanvasEditorInstance({
      capacity,
      createWorker,
      document,
      allowFrameSelection,
      elements,
      modules,
    }),
    [capacity, createWorker, document, allowFrameSelection, elements, modules],
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
