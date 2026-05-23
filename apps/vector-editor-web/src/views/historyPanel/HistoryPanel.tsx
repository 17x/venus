import {FC, useEffect, useRef} from 'react'
import {useTranslation} from 'react-i18next'
import {I18nHistoryDataItem} from '../../i18n/type'
import {Button, Con, MenuItem} from '../../ui/index.ts'
import {EDITOR_TEXT_PANEL_BODY_CLASS} from '../editorChrome/editorTypography.ts'
import type {ShellCommandMeta} from '../../runtime/shell/commands/shellCommandRegistry.ts'
import {TEST_IDS} from '../../testing/testIds.ts'
import type {HistoryNodeTransactionMeta} from '../../product/useEditorRuntime/types.ts'
import {
  buildHistoryTransactionBadgeLabel,
  buildHistoryTransactionTooltipSuffix,
} from './historyPanelTransactionPresentation.ts'

/**
 * Declares one lightweight row contract consumed by history panel list rendering.
 */
interface HistoryPanelItem {
  /** Stores stable row id used by history jump selection. */
  id: number
  /** Stores optional translation/type payload projected by UI state derivation. */
  data?: {
    /** Stores history translation key fallback label/type. */
    type: string
    /** Stores optional transaction-group metadata used by row presentation. */
    transaction?: HistoryNodeTransactionMeta
  }
  /** Stores optional fallback row label when translation key is missing. */
  label?: string
}

interface HistoryStatus {
  id: number
  hasPrev: boolean
  hasNext: boolean
}

/**
 * Renders history timeline rows and surfaces transaction-group cues when available.
 * @param props History panel props and callbacks.
 */
export const HistoryPanel: FC<{
  historyItems: HistoryPanelItem[]
  historyStatus: HistoryStatus
  pickHistory: (historyNode: HistoryPanelItem) => void
  onMinimize?: VoidFunction
  onPickHistory?: (historyId: number, meta: ShellCommandMeta) => void
}> = ({historyItems, historyStatus, pickHistory, onMinimize, onPickHistory}) => {
  const {t} = useTranslation()
  const targetRef = useRef<HTMLButtonElement>(null)
  const panelTitle = t('inspector.history.title', 'History')

  useEffect(() => {
    targetRef.current?.scrollIntoView({block: 'nearest'})
  }, [historyItems, historyStatus])

  return <Con fh ovh flex={1} minH={0}>
    <section className={'flex h-full w-full min-h-0 flex-col overflow-hidden text-[12px] leading-[18px] text-slate-950 dark:text-slate-100'} role={'region'}>
      <div className={'mb-2 flex items-center justify-between gap-2 p-1 text-xs text-slate-900'}>
        <h2 data-testid={TEST_IDS.historyPanel.heading} className={'font-semibold'}>{panelTitle}</h2>
        {onMinimize &&
          <Button
            type="button"
            aria-label={t('inspector.minimizePanel', {title: panelTitle, defaultValue: `Minimize ${panelTitle}`})}
            title={t('inspector.minimizePanel', {title: panelTitle, defaultValue: `Minimize ${panelTitle}`})}
            className={'inline-flex size-5 items-center justify-center rounded text-gray-500 hover:bg-gray-200 hover:text-gray-900'}
            onClick={(event) => {
              event.stopPropagation()
              onMinimize?.()
            }}
          >
            <span>&minus;</span>
          </Button>}
      </div>
      <div className={'scrollbar-custom min-h-0 flex-1 overflow-y-auto px-1 pb-1'}>
        <div className={`flex min-h-full flex-col gap-1 rounded bg-gray-50 p-1 ${EDITOR_TEXT_PANEL_BODY_CLASS}`}>
        {
          historyItems.map((historyNode) => {
            const isCurr = historyNode.id === historyStatus.id
            const historyType = historyNode.data?.type ?? 'unknown'
            const transaction = historyNode.data?.transaction
            const prefixI18NKey = 'history.' + historyType
            const translated = t(prefixI18NKey, {returnObjects: true}) as I18nHistoryDataItem | string
            const fallbackLabel = historyNode.label ?? historyType
            const label = typeof translated === 'string' ? fallbackLabel : (translated.label || fallbackLabel)
            const translatedTooltip = typeof translated === 'string' ? fallbackLabel : (translated.tooltip || fallbackLabel)
            const transactionTooltip = buildHistoryTransactionTooltipSuffix(transaction)
            const tooltip = transaction ? `${translatedTooltip} • ${transactionTooltip}` : translatedTooltip
            const transactionBadgeLabel = buildHistoryTransactionBadgeLabel(transaction)

            return <MenuItem xs
              ref={isCurr ? targetRef : null}
              title={tooltip}
              key={historyNode.id}
              aria-current={isCurr ? 'step' : undefined}
              className={isCurr
                ? 'justify-start rounded bg-slate-100 px-2 text-slate-900 dark:bg-slate-800 dark:text-slate-50'
                : 'justify-start rounded bg-white px-2 text-gray-700 hover:bg-gray-100'}
              onClick={() => {
                if (isCurr) return
                if (onPickHistory) {
                  onPickHistory(historyNode.id, {
                    sourcePanel: 'history-panel',
                    sourceControl: 'history-row-select',
                    commitType: 'final',
                  })
                  return
                }
                pickHistory(historyNode)
              }}>
                <span className={'min-w-0 flex-1 truncate'}>{label}</span>
                {transactionBadgeLabel &&
                  <span className={'ml-2 shrink-0 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-700 dark:bg-slate-700 dark:text-slate-100'}>
                    {transactionBadgeLabel}
                  </span>}
              </MenuItem>
          })
        }
        </div>
      </div>
    </section>
  </Con>
}
