import type * as React from 'react'

/**
 * Cancels an in-flight deferred full redraw timer/idle callback.
 * @param deferredFullRedrawHandleRef Ref storing the queued redraw handle.
 */
export function cancelDeferredFullRedrawHandle(
  deferredFullRedrawHandleRef: React.MutableRefObject<number | null>,
) {
  if (deferredFullRedrawHandleRef.current === null) {
    return
  }

  const idleApi = window as Window & {
    requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number
    cancelIdleCallback?: (handle: number) => void
  }

  if (idleApi.cancelIdleCallback) {
    idleApi.cancelIdleCallback(deferredFullRedrawHandleRef.current)
  } else {
    window.clearTimeout(deferredFullRedrawHandleRef.current)
  }

  deferredFullRedrawHandleRef.current = null
}

/**
 * Cancels a queued deferred resize commit timeout.
 * @param deferredResizeCommitHandleRef Ref storing the queued resize-commit timeout id.
 */
export function cancelDeferredResizeCommitHandle(
  deferredResizeCommitHandleRef: React.MutableRefObject<number | null>,
) {
  if (deferredResizeCommitHandleRef.current === null) {
    return
  }

  window.clearTimeout(deferredResizeCommitHandleRef.current)
  deferredResizeCommitHandleRef.current = null
}

/**
 * Requests one deferred post-interaction visual recovery frame.
 * @param deferredVisualRecoveryPendingRef Tracks whether a recovery render is already queued.
 * @param deferredVisualRecoveryAfterInteractionRef Tracks whether recovery should run after interaction settles.
 * @param isInteractingRef Tracks active interaction state.
 * @param requestEngineRender Requests one engine render frame.
 */
export function requestDeferredVisualRecoveryFrame(
  deferredVisualRecoveryPendingRef: React.MutableRefObject<boolean>,
  deferredVisualRecoveryAfterInteractionRef: React.MutableRefObject<boolean>,
  isInteractingRef: React.MutableRefObject<boolean>,
  requestEngineRender: (
    mode?: 'interactive' | 'normal',
    reason?:
      | 'scene-dirty'
      | 'deferred-image-drain'
      | 'idle-redraw'
      | 'interactive-viewport'
      | 'camera-animation'
      | 'overlay-dirty',
  ) => void,
) {
  if (deferredVisualRecoveryPendingRef.current) {
    return
  }

  if (isInteractingRef.current) {
    deferredVisualRecoveryAfterInteractionRef.current = true
    return
  }

  deferredVisualRecoveryPendingRef.current = true
  requestEngineRender('normal', 'idle-redraw')
}
