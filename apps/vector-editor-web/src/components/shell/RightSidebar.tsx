import {Button, Card, CardContent, Separator, Tabs, TabsList, TabsTrigger, Tooltip} from '@vector/ui'
import type {EditorExecutor, SelectedElementProps} from '../../editor/hooks/useEditorRuntime.types.ts'
import type {InspectorContext} from '../../editor/shell/state/inspectorState.ts'
import type {ShellCommandMeta} from '../../editor/shell/commands/shellCommandRegistry.ts'
import {PageInspectorSection} from '../inspector/sections/PageInspectorSection.tsx'
import PropPanel from '../propPanel/PropPanel.tsx'
import {useTranslation} from 'react-i18next'
import {TEST_IDS} from '../../testing/testIds.ts'

export interface RightSidebarProps {
  context: InspectorContext
  selectedProps: SelectedElementProps | null
  zoomPercent: number
  selectedCount: number
  layerCount: number
  executeAction: EditorExecutor
  onMinimize: VoidFunction
  onSetZoom: (zoomPercent: number) => void
  onSetInspectorContext: (context: InspectorContext) => void
  onPatchElementProps: (elementId: string, patch: Record<string, unknown>, meta: ShellCommandMeta) => void
}

export default function RightSidebar(props: RightSidebarProps) {
  const {t} = useTranslation()
  const canZoomOut = props.zoomPercent > 10
  const canZoomIn = props.zoomPercent < 800

  function adjustZoom(nextZoomPercent: number) {
    // Clamp zoom so shell controls stay aligned with runtime zoom bounds.
    props.onSetZoom(Math.max(10, Math.min(800, nextZoomPercent)))
  }

  return (
    <aside className={'flex h-full w-[240px] shrink-0 flex-col overflow-x-hidden bg-white dark:bg-slate-900'} aria-label={t('shell.variantB.rightSidebar', 'Right sidebar')} data-testid={TEST_IDS.sidebarRight.workspace}>
      <div className={'flex items-center justify-end px-2.5 py-2'}>
        <div className={'flex items-center gap-1.5'}>
          <Tooltip title={t('shell.variantB.rightSidebar.minimize', 'Minimize right panel')} placement={'l'} asChild>
            <Button
              type={'button'}
              variant={'ghost'}
              noTooltip
              className={'inline-flex size-7 items-center justify-center rounded text-base leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50'}
              aria-label={t('shell.variantB.rightSidebar.minimize', 'Minimize right panel')}
              title={t('shell.variantB.rightSidebar.minimize', 'Minimize right panel')}
              onClick={props.onMinimize}
            >
              <span>&minus;</span>
            </Button>
          </Tooltip>
        </div>
      </div>

      <div className={'flex items-center justify-between px-2.5 py-1.5'}>
        <Tabs value={'design'} className={'min-w-0'}>
          <TabsList variant={'line'} className={'h-auto gap-2 rounded-none bg-transparent p-0'} />
        </Tabs>
        <div className={'flex items-center gap-1'}>
          <Button type={'button'} variant={'ghost'} size={'sm'} title={t('ui.shell.variantB.zoomOut', {defaultValue: 'Zoom out'})} className={'h-7 px-2 text-xs'} disabled={!canZoomOut} onClick={() => {
            adjustZoom(props.zoomPercent - 10)
          }}>-</Button>
          <Button type={'button'} variant={'ghost'} size={'sm'} title={t('ui.shell.variantB.zoomReset', {defaultValue: 'Reset zoom to 100%'})} className={'h-7 px-2 text-xs'} onClick={() => {
            adjustZoom(100)
          }}>{`${props.zoomPercent}%`}</Button>
          <Button type={'button'} variant={'ghost'} size={'sm'} title={t('ui.shell.variantB.zoomIn', {defaultValue: 'Zoom in'})} className={'h-7 px-2 text-xs'} disabled={!canZoomIn} onClick={() => {
            adjustZoom(props.zoomPercent + 10)
          }}>+</Button>
        </div>
      </div>

      <Card className={'mx-2 mt-2 bg-slate-50/40 shadow-none'}>
        <CardContent className={'flex items-center justify-between px-2 py-1.5 text-[10px] text-slate-500'}>
          <span>{t('shell.variantB.meta.layers', {count: props.layerCount, defaultValue: `Layers: ${props.layerCount}`})}</span>
          <Separator orientation={'vertical'} className={'mx-2 h-3 bg-slate-200'}/>
          <span>{t('shell.variantB.meta.selection', {count: props.selectedCount, defaultValue: `Selection: ${props.selectedCount}`})}</span>
        </CardContent>
      </Card>

      <Tabs
        value={props.context}
        onValueChange={(nextValue) => {
          props.onSetInspectorContext(nextValue as InspectorContext)
        }}
        className={'px-2.5 py-1.5'}
      >
        <TabsList variant={'line'} aria-label={t('shell.variantB.context.title', 'Inspector context')} className={'h-auto gap-2 rounded-none bg-transparent p-0'}>
          <TabsTrigger
            value={'selection'}
            aria-controls={'variant-b-inspector-selection'}
            title={t('shell.variantB.context.selection', 'Selection')}
            data-testid={TEST_IDS.sidebarRight.contextSwitch('selection')}
            className={props.context === 'selection'
              ? 'rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-900 dark:bg-slate-800 dark:text-slate-50'
              : 'rounded px-2 py-1 text-xs text-slate-500 dark:text-slate-400'}
          >
            {t('shell.variantB.context.selection', 'Selection')}
          </TabsTrigger>
          <TabsTrigger
            value={'page'}
            aria-controls={'variant-b-inspector-page'}
            title={t('shell.variantB.context.page', 'Page')}
            data-testid={TEST_IDS.sidebarRight.contextSwitch('page')}
            className={props.context === 'page'
              ? 'rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-900 dark:bg-slate-800 dark:text-slate-50'
              : 'rounded px-2 py-1 text-xs text-slate-500 dark:text-slate-400'}
          >
            {t('shell.variantB.context.page', 'Page')}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div
        className={'scrollbar-custom flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto'}
        role={'tabpanel'}
        id={props.context === 'page' ? 'variant-b-inspector-page' : 'variant-b-inspector-selection'}
        data-testid={TEST_IDS.sidebarRight.inspectorViewport}
      >
        {props.context === 'page'
          ? <PageInspectorSection/>
          : <PropPanel
              props={props.selectedProps ?? undefined}
              executeAction={props.executeAction}
              onPatchElementProps={props.onPatchElementProps}
            />}
      </div>
    </aside>
  )
}
