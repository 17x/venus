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

// ---- Export Section (enhanced with format/scale/preview/export) ----

export function ExportSection(props: {
  exportScale: string
  exportFormat: string
  onChangeExportScale: (nextScale: string) => void
  onChangeExportFormat: (nextFormat: string) => void
  onExport: () => void
}) {
  const {t} = useTranslation()
  const scale = Number(props.exportScale.replace('x', '')) || 1

  return (
    <section className={'space-y-2 px-2 pb-2'}>
      <div className={SECTION_TITLE}>{t('inspector.properties.export.title', 'Export')}</div>

      {/* Format + Scale row */}
      <div className={'flex items-center gap-1'}>
        <span className={FIELD_LABEL}>{t('inspector.properties.export.format', 'Format')}</span>
        <select
          className={SELECT_CLASS + ' flex-1'}
          value={props.exportFormat}
          onChange={(e) => props.onChangeExportFormat(e.target.value)}
        >
          <option value="PNG">PNG</option>
          <option value="SVG">SVG</option>
          <option value="JPG">JPG</option>
        </select>
      </div>
      <div className={'flex items-center gap-1'}>
        <span className={FIELD_LABEL}>{t('inspector.properties.export.scale', 'Scale')}</span>
        <select
          className={SELECT_CLASS + ' flex-1'}
          value={props.exportScale}
          onChange={(e) => props.onChangeExportScale(e.target.value)}
        >
          <option value="1x">@1x</option>
          <option value="2x">@2x</option>
          <option value="3x">@3x</option>
        </select>
      </div>

      {/* Live preview area */}
      <div className={'rounded border border-border bg-white dark:bg-slate-900 overflow-hidden'}>
        <div className={'flex items-center justify-between px-1.5 py-0.5 bg-muted/30'}>
          <span className={'text-[10px] text-muted-foreground'}>
            {t('inspector.properties.export.preview', 'Preview')}
          </span>
          <span className={'text-[10px] text-muted-foreground'}>
            {props.exportFormat} @{scale}x
          </span>
        </div>
        <div
          className={'flex items-center justify-center p-2 min-h-[60px]'}
          style={{ background: 'repeating-conic-gradient(#f1f5f9 0% 25%, transparent 0% 50%) 50% / 12px 12px' }}
        >
          <span className={'text-[10px] text-muted-foreground text-center'}>
            {props.exportFormat === 'SVG'
              ? t('inspector.properties.export.previewSvgHint', 'Vector output — resolution independent')
              : t('inspector.properties.export.previewRasterHint', `Raster output at ${props.exportScale} resolution`)}
          </span>
        </div>
      </div>

      {/* Export button */}
      <button
        type="button"
        className={'h-7 w-full rounded bg-primary text-[11px] font-medium text-primary-foreground hover:bg-primary/90 cursor-pointer'}
        onClick={props.onExport}
      >
        {t('inspector.properties.export.action', `Export as ${props.exportFormat}`)}
      </button>
    </section>
  )
}

// ---- Preview Section (placeholder) ----

export function PreviewSection() {
  return null
}
