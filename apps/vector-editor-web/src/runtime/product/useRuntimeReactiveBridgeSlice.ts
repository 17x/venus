import {useSyncExternalStore} from 'react'
import type {
  RuntimeReactiveBridge,
  RuntimeReactiveEqualityFn,
  RuntimeReactiveSelector,
} from '../../runtime/subscriptions/index.ts'

/**
 * Subscribes to one bridge slice and keeps React render updates scoped to that slice.
 */
export function useRuntimeReactiveBridgeSlice<TSnapshot, TEvent, TSlice>(
  bridge: RuntimeReactiveBridge<TSnapshot, TEvent>,
  selector: RuntimeReactiveSelector<TSnapshot, TSlice>,
  isEqual?: RuntimeReactiveEqualityFn<TSlice>,
): TSlice {
  return useSyncExternalStore(
    // Route subscription through slice-aware listener so unrelated patch noise is ignored.
    (onStoreChange) => bridge.subscribeSlice(selector, () => {
      onStoreChange()
    }, isEqual),
    () => selector(bridge.getSnapshot()),
    () => selector(bridge.getSnapshot()),
  )
}