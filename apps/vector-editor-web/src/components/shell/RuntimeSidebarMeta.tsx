import {Card, CardContent, Separator} from '@vector/ui'
import {useSyncExternalStore} from 'react'
import {useTranslation} from 'react-i18next'
import {
  EMPTY_RUNTIME_SHELL_SNAPSHOT,
  getRuntimeShellSnapshot,
  subscribeRuntimeShellSnapshot,
} from '../../runtime/events/index.ts'

export function RuntimeSidebarMeta() {
  const {t} = useTranslation()
  const shellSnapshot = useSyncExternalStore(
    subscribeRuntimeShellSnapshot,
    getRuntimeShellSnapshot,
    () => EMPTY_RUNTIME_SHELL_SNAPSHOT,
  )

  return (
    <Card className={'mx-2 mt-2 bg-slate-50/40 shadow-none'}>
      <CardContent className={'flex items-center justify-between px-2 py-1.5 text-[10px] text-slate-500'}>
        <span>{t('shell.variantB.meta.layers', {count: shellSnapshot.layerCount, defaultValue: `Layers: ${shellSnapshot.layerCount}`})}</span>
        <Separator orientation={'vertical'} className={'mx-2 h-3 bg-slate-200'}/>
        <span>{t('shell.variantB.meta.selection', {count: shellSnapshot.selectedCount, defaultValue: `Selection: ${shellSnapshot.selectedCount}`})}</span>
      </CardContent>
    </Card>
  )
}
