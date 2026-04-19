import {Button, Select, SelectItem} from '@vector/ui'
import {useTranslation} from 'react-i18next'
import {LuChevronRight} from 'react-icons/lu'
import type {SelectedElementProps} from '../../editor/hooks/useEditorRuntime.types.ts'
import {EDITOR_TEXT_CONTROL_CLASS} from '../editorChrome/editorTypography.ts'
import {
  FieldRow,
  SectionBlock,
} from './PropPanelShared.tsx'

export function ImageSection(props: {props: SelectedElementProps, onExecuteAction: (action: 'image-mask-with-shape' | 'image-clear-mask') => void}) {
  const {t} = useTranslation()

  if (props.props.type !== 'image') {
    return null
  }

  return (
    <SectionBlock title={t('inspector.properties.sections.image', {defaultValue: 'Image'})}>
      <FieldRow label={t('inspector.properties.fields.asset', 'Asset')}>
        <span className={'truncate text-gray-600'}>
          {props.props.imageMeta?.assetName ?? props.props.asset ?? t('inspector.properties.values.linkedImage', 'Linked image')}
        </span>
      </FieldRow>
      <FieldRow label={t('inspector.properties.fields.source', 'Source')}>
        <span className={'truncate text-gray-600'}>
          {props.props.imageMeta?.mimeType ?? t('inspector.properties.values.imageMimeFallback', 'image/*')}
        </span>
      </FieldRow>
      <div className={'grid grid-cols-2 gap-2'}>
        <Button
          type={'button'}
          variant={'outline'}
          className={'h-6 text-xs'}
          onClick={() => props.onExecuteAction('image-mask-with-shape')}
        >
          {t('inspector.properties.actions.maskWithShape', 'Mask with Shape')}
        </Button>
        <Button
          type={'button'}
          variant={'outline'}
          className={'h-6 text-xs'}
          onClick={() => props.onExecuteAction('image-clear-mask')}
        >
          {t('inspector.properties.actions.clearMask', 'Clear Mask')}
        </Button>
      </div>
    </SectionBlock>
  )
}

export function SchemaSection(props: {props: SelectedElementProps}) {
  const {t} = useTranslation()

  if (!props.props.schemaMeta) {
    return null
  }

  return (
    <SectionBlock title={t('inspector.properties.sections.schema', {defaultValue: 'Schema'})}>
      <FieldRow label={t('inspector.properties.fields.schemaNode', 'Schema Node')}>
        <span className={'truncate text-gray-600'}>{props.props.schemaMeta.sourceNodeType ?? '-'}</span>
      </FieldRow>
      <FieldRow label={t('inspector.properties.fields.nodeKind', 'Node Kind')}>
        <span className={'truncate text-gray-600'}>{props.props.schemaMeta.sourceNodeKind ?? '-'}</span>
      </FieldRow>
      <FieldRow label={t('inspector.properties.fields.features', 'Features')}>
        <span className={'truncate text-gray-600'}>{props.props.schemaMeta.sourceFeatureKinds?.join(', ') ?? '-'}</span>
      </FieldRow>
    </SectionBlock>
  )
}

export function ExportSection(props: {
  exportScale: string
  exportFormat: string
  onChangeExportScale: (nextScale: string) => void
  onChangeExportFormat: (nextFormat: string) => void
  onPrint: VoidFunction
}) {
  const {t} = useTranslation()

  return (
    <SectionBlock title={t('inspector.properties.sections.export', 'Export')}>
      <div className={'grid grid-cols-2 gap-2'}>
        <Select
          className={EDITOR_TEXT_CONTROL_CLASS}
          selectValue={props.exportScale}
          onSelectChange={(nextScale) => {
            props.onChangeExportScale(String(nextScale))
          }}
          placeholderResolver={(value) => String(value)}
        >
          <SelectItem value={'1x'}>1x</SelectItem>
          <SelectItem value={'2x'}>2x</SelectItem>
          <SelectItem value={'3x'}>3x</SelectItem>
        </Select>
        <Select
          className={EDITOR_TEXT_CONTROL_CLASS}
          selectValue={props.exportFormat}
          onSelectChange={(nextFormat) => {
            props.onChangeExportFormat(String(nextFormat))
          }}
          placeholderResolver={(value) => String(value)}
        >
          <SelectItem value={'PNG'}>PNG</SelectItem>
          <SelectItem value={'JPG'}>JPG</SelectItem>
          <SelectItem value={'SVG'}>SVG</SelectItem>
        </Select>
      </div>
      <Button
        type={'button'}
        variant={'outline'}
        className={'h-7 w-full justify-start text-xs'}
        title={t('inspector.properties.export.action', {defaultValue: 'Export Rectangle 3'})}
        onClick={props.onPrint}
      >
        {t('inspector.properties.export.action', {defaultValue: 'Export Rectangle 3'})}
      </Button>
    </SectionBlock>
  )
}

export function PreviewSection() {
  const {t} = useTranslation()

  return (
    <SectionBlock title={t('inspector.properties.sections.preview', 'Preview')}>
      <Button
        type={'button'}
        variant={'ghost'}
        className={'h-7 w-full justify-between px-1 text-xs'}
        title={t('inspector.properties.preview.collapsed', {defaultValue: 'Preview (collapsed)'})}
      >
        <span>{t('inspector.properties.preview.collapsed', {defaultValue: 'Preview (collapsed)'})}</span>
        <LuChevronRight size={14}/>
      </Button>
    </SectionBlock>
  )
}