import {useSyncExternalStore} from 'react'
import {Button} from '../../ui/index.ts'
import {useTranslation} from 'react-i18next'
import {
  EMPTY_RUNTIME_VIEWPORT_SNAPSHOT,
  getRuntimeViewportSnapshot,
  subscribeRuntimeViewportSnapshot,
} from '../../runtime/events/index/index.ts'
import {DEFAULT_VIEWPORT_SCALE_RANGE} from '../../runtime/viewport/index.ts'

interface RuntimeZoomControlsProps {
  onSetZoom: (zoomPercent: number) => void
}

// Keep shell zoom controls aligned with runtime viewport bounds to avoid stale UI clamps.
const MIN_RUNTIME_ZOOM_PERCENT = DEFAULT_VIEWPORT_SCALE_RANGE.min * 100
const MAX_RUNTIME_ZOOM_PERCENT = DEFAULT_VIEWPORT_SCALE_RANGE.max * 100

// Render runtime-driven zoom controls that remain consistent with viewport clamp policy.
export function RuntimeZoomControls(props: RuntimeZoomControlsProps) {
  const {t} = useTranslation()
  const viewportSnapshot = useSyncExternalStore(
    subscribeRuntimeViewportSnapshot,
    getRuntimeViewportSnapshot,
    () => EMPTY_RUNTIME_VIEWPORT_SNAPSHOT,
  )
  const zoomPercent = Math.max(1, Math.round(viewportSnapshot.scale * 100))
  const canZoomOut = zoomPercent > MIN_RUNTIME_ZOOM_PERCENT
  const canZoomIn = zoomPercent < MAX_RUNTIME_ZOOM_PERCENT

  // Clamp outgoing shell zoom requests so button-driven zoom obeys runtime min/max bounds.
  function adjustZoom(nextZoomPercent: number) {
    props.onSetZoom(
      Math.max(
        MIN_RUNTIME_ZOOM_PERCENT,
        Math.min(MAX_RUNTIME_ZOOM_PERCENT, nextZoomPercent),
      ),
    )
  }

  return (
    <div className={'flex items-center gap-1'}>
      <Button type={'button'} variant={'ghost'} size={'sm'} title={t('ui.shell.variantB.zoomOut', {defaultValue: 'Zoom out'})} className={'h-7 px-2 text-xs'} disabled={!canZoomOut} onClick={() => {
        adjustZoom(zoomPercent - 10)
      }}>-</Button>
      <Button type={'button'} variant={'ghost'} size={'sm'} title={t('ui.shell.variantB.zoomReset', {defaultValue: 'Reset zoom to 100%'})} className={'h-7 px-2 text-xs'} onClick={() => {
        adjustZoom(100)
      }}>{`${zoomPercent}%`}</Button>
      <Button type={'button'} variant={'ghost'} size={'sm'} title={t('ui.shell.variantB.zoomIn', {defaultValue: 'Zoom in'})} className={'h-7 px-2 text-xs'} disabled={!canZoomIn} onClick={() => {
        adjustZoom(zoomPercent + 10)
      }}>+</Button>
    </div>
  )
}
