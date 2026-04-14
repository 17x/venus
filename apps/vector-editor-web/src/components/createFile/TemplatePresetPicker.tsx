import {useEffect, useMemo, useState, type FC} from 'react'
import {Button, Modal, cn} from '@venus/ui'
import {TEMPLATE_PRESETS} from '../../features/templatePresets/presets.ts'
import type {TemplatePresetDefinition} from '../../features/templatePresets/types.ts'
import {useTranslation} from 'react-i18next'
import {EDITOR_TEXT_BODY_CLASS} from '../editorChrome/editorTypography.ts'

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
    <div className={cn('w-full h-[82vh] w-[95vw] max-w-[1160px] rounded-xl border border-gray-200 bg-white shadow-2xl', EDITOR_TEXT_BODY_CLASS)}>
      <div className={'flex h-full min-h-0 flex-col overflow-hidden'}>
        <header className={'flex items-center justify-between gap-4 border-b border-gray-200 px-4 py-3'}>
          <div>
            <h2 className={'text-sm font-semibold text-gray-900'}>{t('ui.template.pickerTitle')}</h2>
          </div>
          <Button type={'button'} size={'sm'} variant={'ghost'} onClick={onClose}>{t('ui.template.cancelButton')}</Button>
        </header>

        <div className={'grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1.25fr_0.75fr]'}>
          <div className={'min-h-0 border-r border-gray-200 p-3'}>
            <div className={'h-[calc(100%-44px)] overflow-auto pr-1'}>
              <div className={'space-y-4'}>
                {(['simple-demo', 'mixed-large', 'image-heavy'] as const).map((category) => {
                  const presets = groupedPresets[category]
                  if (presets.length === 0) {
                    return null
                  }

                  return <section key={category}>
                    <h3 className={'mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500'}>
                      {t(CATEGORY_LABELS[category])}
                    </h3>
                    <div className={'space-y-2'}>
                      {presets.map((preset) => {
                        const active = preset.id === activePreset?.id

                        return <button
                          key={preset.id}
                          type={'button'}
                          onClick={() => setActivePresetId(preset.id)}
                          className={cn(
                            'w-full rounded-lg border px-3 py-2.5 text-left transition-colors',
                            active
                              ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-100'
                              : 'border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50',
                          )}
                        >
                          <div className={'flex items-center justify-between gap-2'}>
                            <div className={'text-sm font-medium text-gray-900'}>{preset.label}</div>
                            <span className={'rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600'}>
                              {preset.targetElementCount.toLocaleString()}
                            </span>
                          </div>
                        </button>
                      })}
                    </div>
                  </section>
                })}
              </div>
            </div>
          </div>

          <aside className={'min-h-0 overflow-auto p-3'}>
            <div className={'rounded-lg border border-gray-200 bg-gray-50 p-3'}>
              <div className={'text-sm font-semibold text-gray-900'}>{activePreset.label}</div>
              <p className={'mt-1 text-xs text-gray-600'}>{activePreset.description}</p>
              <div className={'mt-2 text-xs text-gray-600'}>
                {t('ui.template.categoryLabel')}: {t(CATEGORY_LABELS[activePreset.category])}
              </div>
              <div className={'text-xs text-gray-600'}>
                {t('ui.template.targetElementsLabel')}: {activePreset.targetElementCount.toLocaleString()}
              </div>
            </div>

            {/* <div className={'mt-3 rounded-lg border border-gray-200 p-3'}>
              <label className={'text-xs font-medium text-gray-700'}>{t('ui.template.seedLabel')}</label>
              <div className={'mt-2 flex items-center gap-2'}>
                <Input
                  className={EDITOR_TEXT_CONTROL_CLASS}
                  value={seedInput}
                  onChange={(event) => setSeedInput(event.target.value)}
                  type={'number'}
                  placeholder={t('ui.template.seedPlaceholder')}
                />
                <Button
                  type={'button'}
                  variant={'outline'}
                  size={'sm'}
                  onClick={() => setSeedInput(String(Math.floor(Math.random() * 100000)))}
                >
                  {t('ui.template.randomizeSeed')}
                </Button>
              </div>
            </div> */}

            <div className={'mt-4 flex items-center justify-end gap-2'}>
              <Button type={'button'} variant={'outline'} onClick={onClose}>{t('ui.template.cancelButton')}</Button>
              <Button
                variant={'primary'}
                className={'bg-blue-600 text-white hover:bg-blue-500'}
                type={'button'}
                onClick={() => {
                  onGenerate(activePreset.id)
                }}
              >
                {t('ui.template.generateButtonLabel')}
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  </Modal>
}

export default TemplatePresetPicker
