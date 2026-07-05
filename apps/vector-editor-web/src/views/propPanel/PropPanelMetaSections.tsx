/**
 * PropPanel Meta Sections — engine-docs aligned (Image, Schema, Export, Preview).
 *
 * Uses raw HTML inputs with Tailwind styling, matching engine-docs pattern.
 * No custom component wrappers — direct <input>, <select>, <button>.
 */

import {useTranslation} from 'react-i18next'
import type {SelectedElementProps} from '../../runtime/useEditorRuntime/types.ts'

// ---- Shared Tailwind constants (engine-docs compact pattern) ----

const SECTION_TITLE = 'mb-1 text-[11px] font-medium text-muted-foreground'
const SELECT_CLASS = 'h-6 rounded bg-muted/25 px-1 text-[11px] outline-none'
const BTN_OUTLINE = 'h-6 rounded border border-border px-2 text-[11px] text-muted-foreground hover:bg-muted/50 cursor-pointer'
const READONLY_TEXT = 'truncate text-[11px] text-muted-foreground'
const FIELD_LABEL = 'w-[74px] shrink-0 text-[11px] text-muted-foreground'

// ---- Image Section ----

export function ImageSection(props: {
  props: SelectedElementProps
  onExecuteAction: (action: 'image-mask-with-shape' | 'image-clear-mask') => void
}) {
  const {t} = useTranslation()
  if (props.props.type !== 'image') return null

  return (
    <section className={'space-y-1.5 px-2'}>
      <div className={SECTION_TITLE}>{t('inspector.properties.sections.image', 'Image')}</div>
      <div className={'flex items-center gap-1'}>
        <span className={FIELD_LABEL}>{t('inspector.properties.fields.asset', 'Asset')}</span>
        <span className={READONLY_TEXT}>{props.props.imageMeta?.assetName ?? props.props.asset ?? '-'}</span>
      </div>
      <div className={'flex items-center gap-1'}>
        <span className={FIELD_LABEL}>{t('inspector.properties.fields.source', 'Source')}</span>
        <span className={READONLY_TEXT}>{props.props.imageMeta?.mimeType ?? 'image/*'}</span>
      </div>
      <div className={'flex gap-1'}>
        <button type="button" className={BTN_OUTLINE} onClick={() => props.onExecuteAction('image-mask-with-shape')}>Mask</button>
        <button type="button" className={BTN_OUTLINE} onClick={() => props.onExecuteAction('image-clear-mask')}>Clear Mask</button>
      </div>
    </section>
  )
}

// ---- Schema Section ----

export function SchemaSection(props: {props: SelectedElementProps}) {
  const {t} = useTranslation()
  const meta = props.props.schemaMeta
  if (!meta) return null

  return (
    <section className={'space-y-1.5 px-2'}>
      <div className={SECTION_TITLE}>{t('inspector.properties.sections.schema', 'Schema')}</div>
      <div className={'flex items-center gap-1'}><span className={FIELD_LABEL}>Node</span><span className={READONLY_TEXT}>{meta.sourceNodeType ?? '-'}</span></div>
      <div className={'flex items-center gap-1'}><span className={FIELD_LABEL}>Kind</span><span className={READONLY_TEXT}>{meta.sourceNodeKind ?? '-'}</span></div>
      <div className={'flex items-center gap-1'}><span className={FIELD_LABEL}>Features</span><span className={READONLY_TEXT}>{meta.sourceFeatureKinds?.join(', ') ?? '-'}</span></div>
    </section>
  )
}

// ---- Export Section ----

export function ExportSection(props: {
  exportScale: string
  exportFormat: string
  onChangeExportScale: (nextScale: string) => void
  onChangeExportFormat: (nextFormat: string) => void
  onPrint: VoidFunction
}) {
  const {t} = useTranslation()
  return (
    <section className={'space-y-1.5 px-2'}>
      <div className={SECTION_TITLE}>Export</div>
      <div className={'flex gap-1'}>
        <select className={SELECT_CLASS + ' w-14'} value={props.exportScale} onChange={(e) => props.onChangeExportScale(e.target.value)}><option value="1x">1x</option><option value="2x">2x</option><option value="3x">3x</option></select>
        <select className={SELECT_CLASS + ' w-14'} value={props.exportFormat} onChange={(e) => props.onChangeExportFormat(e.target.value)}><option value="PNG">PNG</option><option value="JPG">JPG</option><option value="SVG">SVG</option></select>
        <button type="button" className={BTN_OUTLINE} onClick={props.onPrint}>{t('inspector.properties.export.action', 'Export')}</button>
      </div>
    </section>
  )
}

// ---- Preview Section (placeholder) ----

export function PreviewSection() {
  return (
    <section className={'space-y-1.5 px-2'}>
      <div className={SECTION_TITLE}>Preview</div>
      <div className={'text-[11px] text-muted-foreground'}>Coming soon</div>
    </section>
  )
}
