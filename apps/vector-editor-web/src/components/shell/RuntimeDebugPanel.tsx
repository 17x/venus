import {useSyncExternalStore} from 'react'
import {useTranslation} from 'react-i18next'
import {
  EMPTY_RUNTIME_RENDER_DIAGNOSTICS,
  getRuntimeRenderDiagnosticsSnapshot,
  subscribeRuntimeRenderDiagnostics,
} from '../../runtime/events/index.ts'

function DebugRow(props: {label: string; value: string}) {
  return (
    <div className={'flex items-center justify-between rounded bg-white px-2 py-1.5 text-xs text-slate-800 dark:bg-slate-900 dark:text-slate-100'}>
      <span className={'text-slate-500 dark:text-slate-400'}>{props.label}</span>
      <span className={'font-mono'}>{props.value}</span>
    </div>
  )
}

export function RuntimeDebugPanel() {
  const {t} = useTranslation()
  const diagnostics = useSyncExternalStore(
    subscribeRuntimeRenderDiagnostics,
    getRuntimeRenderDiagnosticsSnapshot,
    () => EMPTY_RUNTIME_RENDER_DIAGNOSTICS,
  )

  const cacheTotal = diagnostics.cacheHitCount + diagnostics.cacheMissCount
  const cacheHitRate = cacheTotal > 0
    ? (diagnostics.cacheHitCount / cacheTotal) * 100
    : 0

  return (
    <section id={'variant-b-tabpanel-debug'} role={'tabpanel'} className={'scrollbar-custom flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3'}>
      <DebugRow label={t('shell.variantB.debug.engineDrawCount', 'Engine Draw Count')} value={String(diagnostics.drawCount)}/>
      <DebugRow label={t('shell.variantB.debug.drawMs', 'Draw Ms')} value={diagnostics.drawMs.toFixed(2)}/>
      <DebugRow label={t('shell.variantB.debug.fps', 'FPS (Smooth)')} value={diagnostics.fpsEstimate.toFixed(1)}/>
      <DebugRow label={t('shell.variantB.debug.fpsInstant', 'FPS (Instant)')} value={diagnostics.fpsInstantaneous.toFixed(1)}/>
      <DebugRow label={t('shell.variantB.debug.visibleShapeCount', 'Visible Shapes')} value={String(diagnostics.visibleShapeCount)}/>
      <DebugRow label={t('shell.variantB.debug.cacheHitEstimate', 'Cache Hit')} value={String(diagnostics.cacheHitCount)}/>
      <DebugRow label={t('shell.variantB.debug.cacheMissEstimate', 'Cache Miss')} value={String(diagnostics.cacheMissCount)}/>
      <DebugRow label={t('shell.variantB.debug.cacheHitRate', 'Cache Hit Rate')} value={`${cacheHitRate.toFixed(1)}%`}/>
      <DebugRow label={t('shell.variantB.debug.frameReuseHitCount', 'Frame Reuse Hit')} value={String(diagnostics.frameReuseHitCount)}/>
      <DebugRow label={t('shell.variantB.debug.frameReuseMissCount', 'Frame Reuse Miss')} value={String(diagnostics.frameReuseMissCount)}/>
      <DebugRow label={t('shell.variantB.debug.cacheMode', 'Cache Mode')} value={diagnostics.cacheMode}/>
      <DebugRow label={t('shell.variantB.debug.webglRenderPath', 'WebGL Render Path')} value={diagnostics.webglRenderPath}/>
      <DebugRow label={t('shell.variantB.debug.webglInteractiveTextFallbackCount', 'WebGL Text Fallback')} value={String(diagnostics.webglInteractiveTextFallbackCount)}/>
      <DebugRow label={t('shell.variantB.debug.webglTextTextureUploadCount', 'WebGL Text Upload Count')} value={String(diagnostics.webglTextTextureUploadCount)}/>
      <DebugRow label={t('shell.variantB.debug.webglTextTextureUploadBytes', 'WebGL Text Upload Bytes')} value={String(diagnostics.webglTextTextureUploadBytes)}/>
      <DebugRow label={t('shell.variantB.debug.webglTextCacheHitCount', 'WebGL Text Cache Hit')} value={String(diagnostics.webglTextCacheHitCount)}/>
      <DebugRow label={t('shell.variantB.debug.webglCompositeUploadBytes', 'WebGL Composite Upload Bytes')} value={String(diagnostics.webglCompositeUploadBytes)}/>
    </section>
  )
}
