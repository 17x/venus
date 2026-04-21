import {useSyncExternalStore} from 'react'
import {Button} from '@vector/ui'
import {useTranslation} from 'react-i18next'
import {
  EMPTY_RUNTIME_VIEWPORT_SNAPSHOT,
  getRuntimeViewportSnapshot,
  subscribeRuntimeViewportSnapshot,
} from '../../runtime/events/index.ts'

interface RuntimeZoomControlsProps {
  onSetZoom: (zoomPercent: number) => void
}

export function RuntimeZoomControls(props: RuntimeZoomControlsProps) {
  const {t} = useTranslation()
  const viewportSnapshot = useSyncExternalStore(
    subscribeRuntimeViewportSnapshot,
    getRuntimeViewportSnapshot,
    () => EMPTY_RUNTIME_VIEWPORT_SNAPSHOT,
  )
  const zoomPercent = Math.max(1, Math.round(viewportSnapshot.scale * 100))
  const canZoomOut = zoomPercent > 10
  const canZoomIn = zoomPercent < 800

  function adjustZoom(nextZoomPercent: number) {
    // Clamp zoom so shell controls stay aligned with runtime zoom bounds.
    props.onSetZoom(Math.max(10, Math.min(800, nextZoomPercent)))
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
