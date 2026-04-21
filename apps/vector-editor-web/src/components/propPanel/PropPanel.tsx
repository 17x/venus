import {useEffect, useState} from 'react'
import {Button, Con} from '@vector/ui'
import type {EditorExecutor} from '../../editor/hooks/useEditorRuntime.types.ts'
import type {SelectedElementProps} from '../../editor/hooks/useEditorRuntime.types.ts'
import {EDITOR_TEXT_PANEL_BODY_CLASS} from '../editorChrome/editorTypography.ts'
import {useTranslation} from 'react-i18next'
import type {ShellCommandMeta} from '../../editor/shell/commands/shellCommandRegistry.ts'
import {PropPanelShapeProps} from './PropPanelShapeProps.tsx'

interface PropPanelProps {
  props?: SelectedElementProps
  executeAction: EditorExecutor
  onMinimize?: VoidFunction
  onPatchElementProps?: (elementId: string, patch: Record<string, unknown>, meta: ShellCommandMeta) => void
}

const PropPanel = ({props, executeAction, onMinimize, onPatchElementProps}: PropPanelProps) => {
  const {t} = useTranslation()
  const [localProps, setLocalProps] = useState(props)

  useEffect(() => {
    setLocalProps(props)
  }, [props])

  return <Con flex={1} minH={0}>
    <section className={'flex h-full w-full min-h-0 flex-col overflow-hidden text-[12px] leading-[18px] text-slate-950 dark:text-slate-100'} role={'region'}>
      <div className={'mb-2 flex items-center justify-between gap-2 p-1 text-xs text-slate-900'}>
        <PanelHead onMinimize={onMinimize}/>
      </div>
      <div className={'scrollbar-custom min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-1 pb-1'}>
        {localProps
          ? <PropPanelShapeProps
              props={localProps}
              executeAction={executeAction}
              onPatchElementProps={onPatchElementProps}
            />
          : <div className={`rounded bg-gray-50 p-3 text-gray-500 ${EDITOR_TEXT_PANEL_BODY_CLASS}`}>
              {t('inspector.properties.empty', 'Select an element to edit its properties.')}
            </div>}
      </div>
    </section>
  </Con>
}

export default PropPanel

function PanelHead(props: {onMinimize?: VoidFunction}) {
  const {t} = useTranslation()
  return (
    <div className={'flex w-full items-center justify-between gap-2'}>
      <span className={'sr-only'}>{t('inspector.properties.title', 'Properties')}</span>
      {props.onMinimize &&
        <Button
          type="button"
          aria-label={t('inspector.minimizePanel', {title: t('inspector.properties.title', 'Properties'), defaultValue: 'Minimize properties'})}
          title={t('inspector.minimizePanel', {title: t('inspector.properties.title', 'Properties'), defaultValue: 'Minimize properties'})}
          className={'inline-flex size-5 items-center justify-center rounded text-gray-500 hover:bg-gray-200 hover:text-gray-900'}
          onClick={(event) => {
            event.stopPropagation()
            props.onMinimize?.()
          }}
        >
          <span>&minus;</span>
        </Button>}
    </div>
  )
}