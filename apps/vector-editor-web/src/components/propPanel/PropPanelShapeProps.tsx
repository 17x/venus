import {useMemo, useState} from 'react'
import type {ShellCommandMeta} from '../../editor/shell/commands/shellCommandRegistry.ts'
import type {
  EditorExecutor,
  SelectedElementProps,
} from '../../editor/hooks/useEditorRuntime.types.ts'
import {EDITOR_TEXT_PANEL_BODY_CLASS} from '../editorChrome/editorTypography.ts'
import {
  AppearanceSection,
  EffectsSection,
  FillSection,
  LayoutSection,
  StrokeSection,
} from './PropPanelSections.tsx'
import {
  ExportSection,
  ImageSection,
  PreviewSection,
  SchemaSection,
} from './PropPanelMetaSections.tsx'
import { Separator } from '@/ui/kit/components/ui/separator.tsx'

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
  const [strokePosition, setStrokePosition] = useState('inside')
  const [exportScale, setExportScale] = useState('1x')
  const [exportFormat, setExportFormat] = useState('PNG')

  const patchElementProps = (nextProps: Partial<SelectedElementProps>) => {
    // Text content editing is intentionally blocked in the inspector so partial text selection remains the source of truth.
    // Style-only textRuns updates remain allowed for typography controls.
    const sanitizedNextProps = props.type === 'text'
      ? Object.fromEntries(
          Object.entries(nextProps as Record<string, unknown>)
            .filter(([key]) => key !== 'text'),
        ) as Partial<SelectedElementProps>
      : nextProps

    if (Object.keys(sanitizedNextProps as Record<string, unknown>).length === 0) {
      return
    }

    if (onPatchElementProps) {
      onPatchElementProps(props.id, sanitizedNextProps as Record<string, unknown>, {
        sourcePanel: 'properties-panel',
        sourceControl: 'property-field-input',
        commitType: 'final',
      })
      return
    }

    executeAction('element-modify', [{
      id: props.id,
      props: sanitizedNextProps,
    }])
  }

  const patchNumericField = (field: keyof SelectedElementProps, nextValue: number) => {
    patchElementProps({[field]: nextValue} as Partial<SelectedElementProps>)
  }

  const currentFontFamily = useMemo(() => {
    if (props.type !== 'text') {
      return 'Arial, sans-serif'
    }

    const runs = Array.isArray((props as {textRuns?: unknown}).textRuns)
      ? ((props as {textRuns?: unknown}).textRuns as Array<{style?: {fontFamily?: string}}>)
      : []

    const firstRunFont = runs[0]?.style?.fontFamily
    return typeof firstRunFont === 'string' && firstRunFont.length > 0
      ? firstRunFont
      : 'Arial, sans-serif'
  }, [props])

  const applyTextFontFamily = (nextFontFamily: string) => {
    if (props.type !== 'text') {
      return
    }

    const sourceRuns = Array.isArray((props as {textRuns?: unknown}).textRuns)
      ? ((props as {textRuns?: unknown}).textRuns as Array<{
          start?: number
          end?: number
          style?: Record<string, unknown>
        }>)
      : []
    const textContent = typeof props.text === 'string' ? props.text : ''
    const fallbackRunLength = Math.max(0, textContent.length)
    const baseRuns = sourceRuns.length > 0
      ? sourceRuns
      : [{start: 0, end: fallbackRunLength, style: {}}]
    const nextRuns = baseRuns.map((run) => ({
      start: typeof run.start === 'number' ? run.start : 0,
      end: typeof run.end === 'number' ? run.end : fallbackRunLength,
      style: {
        ...(run.style ?? {}),
        fontFamily: nextFontFamily,
      },
    }))

    patchElementProps({
      textRuns: nextRuns,
    } as Partial<SelectedElementProps>)
  }

  return (
    <div className={`z-30 flex min-w-0 flex-col gap-2 overflow-x-hidden ${EDITOR_TEXT_PANEL_BODY_CLASS}`}>
        <Separator />
      <LayoutSection props={props} patchNumericField={patchNumericField} patchElementProps={patchElementProps}/>
        <Separator />
      <AppearanceSection
        props={props}
        patchNumericField={patchNumericField}
        patchElementProps={patchElementProps}
        currentFontFamily={currentFontFamily}
        onChangeFontFamily={applyTextFontFamily}
      />
      <FillSection props={props} patchNumericField={patchNumericField} patchElementProps={patchElementProps}/>
      <StrokeSection
        props={props}
        patchNumericField={patchNumericField}
        patchElementProps={patchElementProps}
        strokePosition={strokePosition}
        onChangeStrokePosition={setStrokePosition}
      />
      <EffectsSection props={props} patchNumericField={patchNumericField} patchElementProps={patchElementProps}/>
      <ImageSection props={props} onExecuteAction={(action) => {
        executeAction(action)
      }}/>
      <SchemaSection props={props}/>
      <ExportSection
        exportScale={exportScale}
        exportFormat={exportFormat}
        onChangeExportScale={setExportScale}
        onChangeExportFormat={setExportFormat}
        onPrint={() => {
          executeAction('print')
        }}
      />
      <PreviewSection/>
    </div>
  )
}