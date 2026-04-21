import {useMemo, useSyncExternalStore} from 'react'
import {
  EMPTY_RUNTIME_VIEWPORT_SNAPSHOT,
  getRuntimeViewportSnapshot,
  subscribeRuntimeViewportSnapshot,
} from '../../runtime/events/index.ts'

export function RuntimeGridOverlay() {
  const viewportSnapshot = useSyncExternalStore(
    subscribeRuntimeViewportSnapshot,
    getRuntimeViewportSnapshot,
    () => EMPTY_RUNTIME_VIEWPORT_SNAPSHOT,
  )

  const backgroundSize = useMemo(() => {
    const size = Math.max(12, Math.round(24 * viewportSnapshot.scale))
    return `${size}px ${size}px`
  }, [viewportSnapshot.scale])

  return (
    <div
      className={'pointer-events-none absolute inset-0 z-10'}
      style={{
        backgroundImage: 'linear-gradient(to right, rgba(15, 23, 42, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(15, 23, 42, 0.08) 1px, transparent 1px)',
        backgroundSize,
      }}
    />
  )
}
