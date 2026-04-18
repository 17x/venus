import {Button, Card, CardContent, Separator, Tabs, TabsList, TabsTrigger, Tooltip} from '@vector/ui'
import type {EditorExecutor, SelectedElementProps} from '../../editor/hooks/useEditorRuntime.types.ts'
import type {InspectorContext} from '../../editor/shell/state/inspectorState.ts'
import type {ShellCommandMeta} from '../../editor/shell/commands/shellCommandRegistry.ts'
import {PageInspectorSection} from '../inspector/sections/PageInspectorSection.tsx'
import PropPanel from '../propPanel/PropPanel.tsx'
import {LuPlay} from 'react-icons/lu'
import {useTranslation} from 'react-i18next'
import {TEST_IDS} from '../../testing/testIds.ts'

const SIDEBAR_ICON_SIZE = 14

interface RightSidebarProps {
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
    <aside className={'venus-shell-panel flex h-full w-[240px] shrink-0 flex-col overflow-x-hidden border-l'} aria-label={t('shell.variantB.rightSidebar', 'Right sidebar')} data-testid={TEST_IDS.sidebarRight.workspace}>
      <div className={'flex items-center justify-between border-b px-2.5 py-2'}>
        <div className={'flex items-center gap-2'}>
          <div className={'inline-flex size-7 items-center justify-center rounded-full bg-slate-300 text-[11px] font-semibold text-slate-700'}>Y</div>
          <span className={'venus-shell-text-muted text-xs'}>{t('shell.variantB.role', 'Design')}</span>
        </div>
        <div className={'flex items-center gap-1.5'}>
          <Tooltip title={t('shell.variantB.present', 'Present')} placement={'l'} asChild>
            <Button
              type={'button'}
              variant={'ghost'}
              className={'venus-shell-toolbar-button venus-shell-plain-trigger inline-flex size-7 items-center justify-center rounded'}
              aria-label={t('shell.variantB.present', 'Present')}
              title={t('shell.variantB.present', 'Present')}
            >
              <LuPlay size={SIDEBAR_ICON_SIZE}/>
            </Button>
          </Tooltip>
          <Tooltip title={t('ui.shell.variantB.shareTooltip', {defaultValue: 'Share current design'})} placement={'l'} asChild>
            <Button
              type={'button'}
              variant={'ghost'}
              size={'sm'}
              className={'h-7 px-2 text-[11px]'}
              title={t('ui.shell.variantB.shareTooltip', {defaultValue: 'Share current design'})}
            >
              {t('shell.variantB.share', 'Share')}
            </Button>
          </Tooltip>
          <Tooltip title={t('shell.variantB.rightSidebar.minimize', 'Minimize right panel')} placement={'l'} asChild>
            <Button
              type={'button'}
              variant={'ghost'}
              className={'venus-shell-toolbar-button venus-shell-plain-trigger inline-flex size-7 items-center justify-center rounded text-base leading-none'}
              aria-label={t('shell.variantB.rightSidebar.minimize', 'Minimize right panel')}
              title={t('shell.variantB.rightSidebar.minimize', 'Minimize right panel')}
              onClick={props.onMinimize}
            >
              <span>&minus;</span>
            </Button>
          </Tooltip>
        </div>
      </div>

      <div className={'flex items-center justify-between border-b px-2.5 py-1.5'}>
        <Tabs value={'design'} className={'min-w-0'}>
          <TabsList variant={'line'} className={'h-auto gap-2 rounded-none bg-transparent p-0'}>
            <TabsTrigger
              value={'design'}
              title={t('shell.variantB.tab.design', 'Design')}
              className={'venus-shell-plain-trigger rounded px-2 py-1 text-xs font-semibold text-[var(--venus-shell-active-text)] hover:text-[var(--venus-shell-active-text)]'}
            >
              {t('shell.variantB.tab.design', 'Design')}
            </TabsTrigger>
            <TabsTrigger
              value={'prototype'}
              title={t('shell.variantB.tab.prototype', 'Prototype')}
              disabled
              className={'venus-shell-plain-trigger rounded px-2 py-1 text-xs text-[var(--venus-shell-text)] hover:text-[var(--venus-shell-active-text)]'}
            >
              {t('shell.variantB.tab.prototype', 'Prototype')}
            </TabsTrigger>
          </TabsList>
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

      <Card className={'mx-2 mt-2 border-[color:var(--venus-shell-border-soft)] bg-slate-50/40 shadow-none'}>
        <CardContent className={'flex items-center justify-between px-2 py-1.5 text-[10px] text-slate-500'}>
          <span>{t('shell.variantB.meta.layers', {count: props.layerCount, defaultValue: `Layers: ${props.layerCount}`})}</span>
          <Separator orientation={'vertical'} className={'mx-2 h-3 bg-[color:var(--venus-shell-divider)]'}/>
          <span>{t('shell.variantB.meta.selection', {count: props.selectedCount, defaultValue: `Selection: ${props.selectedCount}`})}</span>
        </CardContent>
      </Card>

      <Tabs
        value={props.context}
        onValueChange={(nextValue) => {
          props.onSetInspectorContext(nextValue as InspectorContext)
        }}
        className={'border-b px-2.5 py-1.5'}
      >
        <TabsList variant={'line'} aria-label={t('shell.variantB.context.title', 'Inspector context')} className={'h-auto gap-2 rounded-none bg-transparent p-0'}>
          <TabsTrigger
            value={'selection'}
            aria-controls={'variant-b-inspector-selection'}
            title={t('shell.variantB.context.selection', 'Selection')}
            data-testid={TEST_IDS.sidebarRight.contextSwitch('selection')}
            className={props.context === 'selection'
              ? 'venus-shell-plain-trigger rounded px-2 py-1 text-xs font-semibold text-[var(--venus-shell-active-text)]'
              : 'venus-shell-plain-trigger rounded px-2 py-1 text-xs text-[var(--venus-shell-text)] hover:text-[var(--venus-shell-active-text)]'}
          >
            {t('shell.variantB.context.selection', 'Selection')}
          </TabsTrigger>
          <TabsTrigger
            value={'page'}
            aria-controls={'variant-b-inspector-page'}
            title={t('shell.variantB.context.page', 'Page')}
            data-testid={TEST_IDS.sidebarRight.contextSwitch('page')}
            className={props.context === 'page'
              ? 'venus-shell-plain-trigger rounded px-2 py-1 text-xs font-semibold text-[var(--venus-shell-active-text)]'
              : 'venus-shell-plain-trigger rounded px-2 py-1 text-xs text-[var(--venus-shell-text)] hover:text-[var(--venus-shell-active-text)]'}
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
