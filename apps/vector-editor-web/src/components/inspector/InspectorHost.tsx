import {Tooltip, cn} from '@vector/ui'
import {LuLayers, LuSettings} from 'react-icons/lu'
import type {EditorExecutor, LayerItem, SelectedElementProps} from '../../editor/hooks/useEditorRuntime.types.ts'
import {LayerPanel} from '../layerPanel/LayerPanel.tsx'
import PropPanel from '../propPanel/PropPanel.tsx'
import type {InspectorContext, InspectorPanelId} from '../../editor/shell/state/inspectorState.ts'
import type {ShellCommandMeta} from '../../editor/shell/commands/shellCommandRegistry.ts'
import {
  CHROME_ICON_SIZE,
  CHROME_ICON_ITEM_ACTIVE_CLASS,
  CHROME_ICON_ITEM_CLASS,
  CHROME_RAIL_ITEM_CONTAINER_CLASS,
} from '../editorChrome/chromeIconStyles.ts'
import {PageInspectorSection} from './sections/PageInspectorSection.tsx'
import {useTranslation} from 'react-i18next'
import {TEST_IDS} from '../../testing/testIds.ts'

interface InspectorHostProps {
  executeAction: EditorExecutor
  context: InspectorContext
  selectedProps: SelectedElementProps | null
  layerItems: LayerItem[]
  selectedIds: string[]
  historyItems: Array<{id: number; label?: string; data: {type: string}}>
  historyStatus: {
    id: number
    hasPrev: boolean
    hasNext: boolean
  }
  minimizedPanels: Set<InspectorPanelId>
  onTogglePanel: (panelId: InspectorPanelId, meta: ShellCommandMeta) => void
  pickHistory: (historyNode: {id: number}) => void
  onReorderLayers: (direction: 'up' | 'down' | 'top' | 'bottom', meta: ShellCommandMeta) => void
  onModifySelection: (mode: 'replace' | 'toggle' | 'add', ids: string[], meta: ShellCommandMeta) => void
  onPickHistory: (historyId: number, meta: ShellCommandMeta) => void
  onPatchElementProps: (elementId: string, patch: Record<string, unknown>, meta: ShellCommandMeta) => void
}

export default function InspectorHost(props: InspectorHostProps) {
  const {t} = useTranslation()
  const {
    executeAction,
    context,
    selectedProps,
    layerItems,
    selectedIds,
    minimizedPanels,
    onTogglePanel,
    onReorderLayers,
    onModifySelection,
    onPatchElementProps,
  } = props

  const panelMeta = [
    {id: 'properties' as const, label: t('inspector.properties.title', 'Properties'), icon: <LuSettings size={CHROME_ICON_SIZE}/>},
    {id: 'layers' as const, label: t('inspector.layer.title', 'Layer'), icon: <LuLayers size={CHROME_ICON_SIZE}/>},
  ]
  const hasVisibleInspectorPanels = minimizedPanels.size < panelMeta.length

  const isInspectorPanelMinimized = (panelId: InspectorPanelId) => minimizedPanels.has(panelId)

  return (
    <div className={'vector-shell-rail flex h-full shrink-0 border-l'} data-testid={TEST_IDS.inspector.workspace}>
      {hasVisibleInspectorPanels &&
        <aside
          className={'vector-shell-panel flex h-full w-64 flex-col gap-2 border-r p-2'}
          aria-label={t('inspector.aria.panels', 'Inspector panels')}
          data-testid={TEST_IDS.inspector.panelStack}
        >
          {!isInspectorPanelMinimized('properties') &&
            (context === 'page'
              ? <PageInspectorSection/>
              : <PropPanel
                  props={selectedProps ?? undefined}
                  executeAction={executeAction}
                  onPatchElementProps={onPatchElementProps}
                  onMinimize={() => onTogglePanel('properties', {
                    sourcePanel: 'inspector',
                    sourceControl: 'properties-minimize',
                    commitType: 'final',
                  })}
                />)}

          {!isInspectorPanelMinimized('layers') &&
            <LayerPanel
              executeAction={executeAction}
              layerItems={layerItems}
              selectedIds={selectedIds}
              onReorderLayers={onReorderLayers}
              onModifySelection={onModifySelection}
              onMinimize={() => onTogglePanel('layers', {
                sourcePanel: 'inspector',
                sourceControl: 'layers-minimize',
                commitType: 'final',
              })}
            />}
        </aside>}

      <aside
        className={'vector-shell-rail-thin relative flex h-full w-10 flex-col items-center gap-2 border-l py-2'}
        aria-label={t('inspector.aria.shortcuts', 'Inspector panel shortcuts')}
        data-testid={TEST_IDS.inspector.shortcutRail}
      >
        {panelMeta.map((panel) => {
          const isMinimized = isInspectorPanelMinimized(panel.id)
          const isOpen = !isMinimized
          const title = isMinimized
            ? t('inspector.shortcuts.showPanel', {panel: panel.label, defaultValue: `Show ${panel.label}`})
            : t('inspector.shortcuts.hidePanel', {panel: panel.label, defaultValue: `Hide ${panel.label}`})
          return (
            <Tooltip
              key={panel.id}
              placement={'l'}
              title={title}
            >
              <div className={CHROME_RAIL_ITEM_CONTAINER_CLASS}>
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={title}
                  aria-pressed={isOpen}
                  data-state={isOpen ? 'open' : 'collapsed'}
                  data-testid={TEST_IDS.inspector.shortcutToggle(panel.id)}
                  className={cn(
                    CHROME_ICON_ITEM_CLASS,
                    'cursor-pointer',
                    isOpen && CHROME_ICON_ITEM_ACTIVE_CLASS,
                  )}
                  onClick={() => onTogglePanel(panel.id, {
                    sourcePanel: 'inspector-shortcuts',
                    sourceControl: `${panel.id}-toggle`,
                    commitType: 'final',
                  })}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onTogglePanel(panel.id, {
                        sourcePanel: 'inspector-shortcuts',
                        sourceControl: `${panel.id}-toggle-keyboard`,
                        commitType: 'final',
                      })
                    }
                  }}
                >
                  {panel.icon}
                </div>
              </div>
            </Tooltip>
          )
        })}
      </aside>
    </div>
  )
}
