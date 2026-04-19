import {
  EDITOR_TEXT_PANEL_BODY_CLASS,
  EDITOR_TEXT_PANEL_HEADING_CLASS,
} from '../../editorChrome/editorTypography.ts'
import {useTranslation} from 'react-i18next'
import {TEST_IDS} from '../../../testing/testIds.ts'

export function PageInspectorSection() {
  const {t} = useTranslation()
  return (
    <section className={'flex h-full w-full min-h-0 flex-col overflow-hidden p-1 text-[12px] leading-[18px] text-slate-950 dark:text-slate-100'} role={'region'}>
      <div className={'mb-2 flex items-center justify-between gap-2 text-xs text-slate-900'}>
        <h2 data-testid={TEST_IDS.pageInspector.heading} className={'font-semibold'}>
          {t('inspector.page.title', {defaultValue: 'Page'})}
        </h2>
      </div>
      <div className={`flex flex-col gap-2 rounded bg-gray-50 p-2 ${EDITOR_TEXT_PANEL_BODY_CLASS}`}>
        <div className={`text-gray-500 ${EDITOR_TEXT_PANEL_HEADING_CLASS}`}>{t('inspector.page.background', {defaultValue: 'Background'})}</div>
        <div className={'flex items-center justify-between gap-2'}>
          <span>{t('inspector.page.visible', {defaultValue: 'Visible'})}</span>
          <input
            type={'checkbox'}
            aria-label={t('inspector.page.visibleToggle', {defaultValue: 'Toggle page background visibility'})}
            title={t('inspector.page.visibleToggle', {defaultValue: 'Toggle page background visibility'})}
            defaultChecked={true}
          />
        </div>
        <div className={'flex items-center justify-between gap-2'}>
          <span>{t('inspector.page.color', {defaultValue: 'Color'})}</span>
          <input
            type={'color'}
            aria-label={t('inspector.page.colorPicker', {defaultValue: 'Pick page background color'})}
            title={t('inspector.page.colorPicker', {defaultValue: 'Pick page background color'})}
            defaultValue={'#f5f5f5'}
          />
        </div>
        <div className={`mt-2 text-gray-500 ${EDITOR_TEXT_PANEL_HEADING_CLASS}`}>{t('inspector.page.stylesExport', {defaultValue: 'Styles / Export'})}</div>
        <div className={'text-gray-600'}>{t('inspector.page.stylesExportHint', {defaultValue: 'Page styles and export settings are rendered in page context.'})}</div>
      </div>
    </section>
  )
}
