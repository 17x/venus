import {useState} from 'react'
import type {ShellCommandMeta} from '../../runtime/shell/commands/shellCommandRegistry.ts'
import type {
  EditorExecutor,
  SelectedElementProps,
} from '../../runtime/useEditorRuntime/types.ts'
import {EDITOR_TEXT_PANEL_BODY_CLASS} from '../editorChrome/editorTypography.ts'
import {
  AppearanceSection,
  EffectsSection,
  FillSection,
  IdentitySection,
  LayoutSection,
  StrokeSection,
} from './PropPanelSections.tsx'
import {
  ExportSection,
  ImageSection,
  PreviewSection,
  SchemaSection,
} from './PropPanelMetaSections.tsx'
import {Separator} from '../../ui/index.ts'

interface PropPanelShapePropsProps {
  props: SelectedElementProps
  executeAction: EditorExecutor
  onPatchElementProps?: (elementId: string, patch: Record<string, unknown>, meta: ShellCommandMeta) => void
}

export function PropPanelShapeProps({
  props,
  executeAction,
  onPatchElementProps,
}: PropPanelShapePropsProps) {
  const [exportScale, setExportScale] = useState('1x')
  const [exportFormat, setExportFormat] = useState('PNG')

  const patchElementProps = (nextProps: Partial<SelectedElementProps>) => {
    // Text content editing is blocked in inspector; style-only textRuns updates allowed.
    const sanitizedNextProps = props.type === 'text'
      ? Object.fromEntries(
          Object.entries(nextProps as Record<string, unknown>)
            .filter(([key]) => key !== 'text'),
        ) as Partial<SelectedElementProps>
      : nextProps

    if (Object.keys(sanitizedNextProps as Record<string, unknown>).length === 0) return

    if (onPatchElementProps) {
      onPatchElementProps(props.id, sanitizedNextProps as Record<string, unknown>, {
        sourcePanel: 'properties-panel',
        sourceControl: 'property-field-input',
        commitType: 'final',
      })
      return
    }

    executeAction('element-modify', [{id: props.id, props: sanitizedNextProps}])
  }

  const sectionProps = {props, patchElementProps}

  return (
    <div className={`z-30 flex min-w-0 flex-col gap-1 overflow-x-hidden ${EDITOR_TEXT_PANEL_BODY_CLASS}`}>
      <Separator />
      <IdentitySection {...sectionProps} />
      <Separator />
      <LayoutSection {...sectionProps} />
      <Separator />
      <AppearanceSection {...sectionProps} />
      <FillSection {...sectionProps} />
      <StrokeSection {...sectionProps} />
      <EffectsSection {...sectionProps} />
      <ImageSection props={props} onExecuteAction={(action) => executeAction(action)} />
      <SchemaSection props={props} />
      <ExportSection
        exportScale={exportScale}
        exportFormat={exportFormat}
        onChangeExportScale={setExportScale}
        onChangeExportFormat={setExportFormat}
        onPrint={() => executeAction('print')}
      />
      <PreviewSection />
    </div>
  )
}
