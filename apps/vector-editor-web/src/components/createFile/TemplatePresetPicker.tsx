import {useEffect, useMemo, useState, type FC} from 'react'
import {Button, Modal, cn} from '@vector/ui'
import {TEMPLATE_PRESETS} from '../../features/templatePresets/presets.ts'
import type {TemplatePresetDefinition} from '../../features/templatePresets/types.ts'
import {useTranslation} from 'react-i18next'
import {EDITOR_TEXT_BODY_CLASS} from '../editorChrome/editorTypography.ts'
import {TEST_IDS} from '../../testing/testIds.ts'

interface TemplatePresetPickerProps {
  bg: string
  onClose: VoidFunction
  onGenerate: (presetId: string, seed?: number) => void
}

const CATEGORY_LABELS: Record<TemplatePresetDefinition['category'], string> = {
  'simple-demo': 'ui.template.category.simpleDemo',
  'mixed-large': 'ui.template.category.mixedLarge',
  'image-heavy': 'ui.template.category.imageHeavy',
}

const TemplatePresetPicker: FC<TemplatePresetPickerProps> = ({bg, onClose, onGenerate}) => {
  const {t} = useTranslation()
  const [activePresetId, setActivePresetId] = useState(TEMPLATE_PRESETS[0]?.id ?? '')
  const query = ''
  const [allowBackdropClose, setAllowBackdropClose] = useState(false)

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setAllowBackdropClose(true)
    }, 0)

    return () => {
      window.clearTimeout(handle)
    }
  }, [])

  const activePreset = useMemo(() => {
    return TEMPLATE_PRESETS.find((preset) => preset.id === activePresetId) ?? TEMPLATE_PRESETS[0]
  }, [activePresetId])

  const canApply = !!activePreset

  const groupedPresets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const filteredPresets = normalizedQuery
      ? TEMPLATE_PRESETS.filter((preset) => {
        return (
          preset.label.toLowerCase().includes(normalizedQuery) ||
          preset.description.toLowerCase().includes(normalizedQuery)
        )
      })
      : TEMPLATE_PRESETS

    return {
      'simple-demo': filteredPresets.filter((preset) => preset.category === 'simple-demo'),
      'mixed-large': filteredPresets.filter((preset) => preset.category === 'mixed-large'),
      'image-heavy': filteredPresets.filter((preset) => preset.category === 'image-heavy'),
    }
  }, [query])

  return <Modal
    backdropBg={bg}
    style={{zIndex: 2100}}
    onBackdropClick={() => {
      if (allowBackdropClose) {
        onClose()
      }
    }}
  >
    <div className={cn('h-[82vh] w-[95vw] max-w-[1160px] rounded-xl border border-[var(--venus-shell-border)] bg-[var(--venus-shell-surface)] shadow-2xl', EDITOR_TEXT_BODY_CLASS)}>
      <div className={'flex h-full min-h-0 flex-col overflow-hidden'}>
        <header className={'flex items-center justify-between gap-4 border-b border-[var(--venus-shell-border)] px-4 py-3'}>
          <div>
            <h2 className={'text-sm font-semibold text-[var(--venus-shell-text)]'}>{t('ui.template.pickerTitle')}</h2>
            <p className={'mt-0.5 text-xs text-[var(--venus-shell-text-muted)]'}>{t('ui.template.pickerSubtitle')}</p>
          </div>
          <Button type={'button'} size={'sm'} variant={'ghost'} onClick={onClose}>{t('ui.template.cancelButton')}</Button>
        </header>

        <div className={'grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1.25fr_0.75fr]'}>
          <section className={'min-h-0 border-r border-[var(--venus-shell-border)] p-3'} data-testid={TEST_IDS.templatePicker.options}>
            <h3 className={'mb-2 text-xs font-semibold text-[var(--venus-shell-text)]'}>{t('ui.template.pickerTitle')}</h3>
            <div className={'h-full overflow-auto pr-1'}>
              <div className={'space-y-4'} role={'listbox'} aria-label={t('ui.template.pickerTitle')}>
                {(['simple-demo', 'mixed-large', 'image-heavy'] as const).map((category) => {
                  const presets = groupedPresets[category]
                  if (presets.length === 0) {
                    return null
                  }

                  return <section key={category}>
                    <h3 className={'mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--venus-shell-text-muted)]'}>
                      {t(CATEGORY_LABELS[category])}
                    </h3>
                    <div className={'grid grid-cols-1 gap-2 sm:grid-cols-2'}>
                      {presets.map((preset) => {
                        const active = preset.id === activePreset?.id

                        return <Button
                          key={preset.id}
                          type={'button'}
                          variant={active ? 'default' : 'outline'}
                          role={'option'}
                          aria-selected={active}
                          data-testid={TEST_IDS.templatePicker.optionCard(preset.id)}
                          data-state={active ? 'active' : 'inactive'}
                          onClick={() => setActivePresetId(preset.id)}
                          className={cn(
                            'h-auto w-full justify-start rounded-lg px-3 py-2.5 text-left transition-colors',
                            active
                              ? 'border-transparent venus-shell-tab-active'
                              : 'hover:border-[var(--venus-ui-border-color-strong)]',
                          )}
                        >
                          <div className={'w-full'}>
                            <div className={'flex items-center justify-between gap-2'}>
                              <div className={'text-sm font-medium text-[var(--venus-shell-text)]'}>{preset.label}</div>
                              <span className={'rounded bg-[var(--venus-shell-hover)] px-1.5 py-0.5 text-[11px] text-[var(--venus-shell-text-muted)]'}>
                                {preset.targetElementCount.toLocaleString()}
                              </span>
                            </div>
                            <span className={'rounded bg-[var(--venus-shell-hover)] px-1.5 py-0.5 text-[11px] text-[var(--venus-shell-text-muted)]'}>
                              {t(CATEGORY_LABELS[preset.category])}
                            </span>
                          </div>
                        </Button>
                      })}
                    </div>
                  </section>
                })}
              </div>
            </div>
          </section>

          <section className={'min-h-0 flex flex-col p-3'} data-testid={TEST_IDS.templatePicker.details}>
            <h3 className={'mb-2 text-xs font-semibold text-[var(--venus-shell-text)]'}>{t('ui.template.presetDetails')}</h3>
            <div className={'scrollbar-custom min-h-0 flex-1 overflow-auto'}>
              {activePreset
                ? <div className={'rounded-lg border border-[var(--venus-shell-border)] bg-[var(--venus-shell-surface-muted)] p-3'}>
                    <div className={'text-sm font-semibold text-[var(--venus-shell-text)]'}>{activePreset.label}</div>
                    <p className={'mt-1 text-xs text-[var(--venus-shell-text-muted)]'}>{activePreset.description}</p>
                    <div className={'mt-2 text-xs text-[var(--venus-shell-text-muted)]'}>
                      {t('ui.template.categoryLabel')}: {t(CATEGORY_LABELS[activePreset.category])}
                    </div>
                    <div className={'text-xs text-[var(--venus-shell-text-muted)]'}>
                      {t('ui.template.targetElementsLabel')}: {activePreset.targetElementCount.toLocaleString()}
                    </div>
                    <div className={'pt-3'}>
                      <Button
                        type={'button'}
                        variant={'outline'}
                        className={'h-8 w-full justify-center text-xs font-semibold'}
                        title={t('ui.template.applyButtonTooltip', {defaultValue: 'Apply selected template'})}
                        onClick={() => {
                          onGenerate(activePreset.id)
                        }}
                      >
                        {t('ui.template.applyButtonLabel', {defaultValue: 'Apply'})}
                      </Button>
                    </div>
                  </div>
                : <div className={'rounded-lg border border-dashed border-[var(--venus-shell-border)] bg-[var(--venus-shell-surface-muted)] p-3 text-xs text-[var(--venus-shell-text-muted)]'}>
                    {t('ui.template.actionsHint')}
                  </div>}
            </div>
          </section>
        </div>

        {/* Keep action row fixed to the bottom so cancel/apply remain visible during long preset lists. */}
        <div className={'flex shrink-0 items-center justify-end gap-2 border-t border-[var(--venus-shell-border)] px-4 py-3'} data-testid={TEST_IDS.templatePicker.footer}>
          <Button type={'button'} variant={'outline'} title={t('ui.template.cancelButton')} onClick={onClose}>{t('ui.template.cancelButton')}</Button>
          <Button
            variant={'primary'}
            type={'button'}
            disabled={!canApply}
            title={t('ui.template.applyButtonTooltip', {defaultValue: 'Apply selected template'})}
            onClick={() => {
              if (activePreset) {
                onGenerate(activePreset.id)
              }
            }}
          >
            {t('ui.template.applyButtonLabel', {defaultValue: 'Apply'})}
          </Button>
        </div>
      </div>
    </div>
  </Modal>
}

export default TemplatePresetPicker
