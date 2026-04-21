import {memo} from 'react'
import {Button, Tabs, TabsList, TabsTrigger, Tooltip} from '@vector/ui'
import type {EditorExecutor, SelectedElementProps} from '../../editor/hooks/useEditorRuntime.types.ts'
import type {InspectorContext} from '../../editor/shell/state/inspectorState.ts'
import type {ShellCommandMeta} from '../../editor/shell/commands/shellCommandRegistry.ts'
import {PageInspectorSection} from '../inspector/sections/PageInspectorSection.tsx'
import PropPanel from '../propPanel/PropPanel.tsx'
import {useTranslation} from 'react-i18next'
import {LuPanelRightClose} from 'react-icons/lu'
import {TEST_IDS} from '../../testing/testIds.ts'
import {RuntimeZoomControls} from './RuntimeZoomControls.tsx'
import {RuntimeSidebarMeta} from './RuntimeSidebarMeta.tsx'

export interface RightSidebarProps {
  rightPanelMinimized: boolean
  panelWidth: number
  context: InspectorContext
  selectedProps: SelectedElementProps | null
  executeAction: EditorExecutor
  onMinimize: VoidFunction
  onSetZoom: (zoomPercent: number) => void
  onSetInspectorContext: (context: InspectorContext) => void
  onPatchElementProps: (elementId: string, patch: Record<string, unknown>, meta: ShellCommandMeta) => void
}

const InspectorPanelBody = memo(function InspectorPanelBody(props: {
  context: InspectorContext
  selectedProps: SelectedElementProps | null
  executeAction: EditorExecutor
  onPatchElementProps: (elementId: string, patch: Record<string, unknown>, meta: ShellCommandMeta) => void
}) {
  return (
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
  )
})

function RightSidebarComponent(props: RightSidebarProps) {
  const {t} = useTranslation()

  if (props.rightPanelMinimized) {
    return (
      <Button
        type={'button'}
        title={t('ui.shell.variantB.rightSidebar.restore', {defaultValue: 'Restore right panel'})}
        className={'absolute right-0 inline-flex h-9 items-center gap-1 rounded bg-white px-2 text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-slate-50'}
        onClick={props.onMinimize}
      >
        <LuPanelRightClose size={14}/>
        <span className={'text-xs'}>Inspector</span>
      </Button>
    )
  }

  return (
    <aside className={'flex h-full shrink-0 flex-col overflow-x-hidden bg-white dark:bg-slate-900'} style={{width: props.panelWidth}} aria-label={t('shell.variantB.rightSidebar', 'Right sidebar')} data-testid={TEST_IDS.sidebarRight.workspace}>
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
        <RuntimeZoomControls onSetZoom={props.onSetZoom}/>
      </div>

      <RuntimeSidebarMeta/>

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

      <InspectorPanelBody
        context={props.context}
        selectedProps={props.selectedProps}
        executeAction={props.executeAction}
        onPatchElementProps={props.onPatchElementProps}
      />
    </aside>
  )
}

const RightSidebar = memo(RightSidebarComponent)

export default RightSidebar
