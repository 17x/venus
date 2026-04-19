import {useEffect, useRef, useState} from 'react'
import {Button} from '@vector/ui'
import {useTranslation} from 'react-i18next'
import {
  LuChevronDown,
  LuSearch,
  LuSettings2,
  LuX,
} from 'react-icons/lu'

const FONT_PICKER_FALLBACKS = [
  'Arial',
  'Arial Black',
  'Courier New',
  'Georgia',
  'Geist',
  'Geist Mono',
  'Genos',
  'Gentium Basic',
  'Gentium Book Basic',
  'Gentium Book Plus',
  'Gentium Plus',
  'Geo',
  'Geologica',
  'Geom',
  'Georama',
  'Geostar',
  'Geostar Fill',
  'Germania One',
  'GFS Didot',
  'Helvetica',
  'Inter',
  'Times New Roman',
  'Verdana',
]

export function PropPanelFontFamilyPicker(props: {value: string, onChange: (nextFontFamily: string) => void}) {
  const {t} = useTranslation()
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [fontOptions, setFontOptions] = useState(FONT_PICKER_FALLBACKS)
  const popoverRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const localFontQuery = (globalThis as {
      queryLocalFonts?: () => Promise<Array<{fullName?: string, family?: string}>>
    }).queryLocalFonts

    if (!localFontQuery) {
      return
    }

    localFontQuery()
      .then((fonts) => {
        const discovered = fonts
          .map((font) => font.family ?? font.fullName)
          .filter((fontName): fontName is string => typeof fontName === 'string' && fontName.length > 0)

        if (discovered.length === 0) {
          return
        }

        const merged = new Set([...FONT_PICKER_FALLBACKS, ...discovered])
        setFontOptions(Array.from(merged).sort((left, right) => left.localeCompare(right)))
      })
      .catch(() => {
        // Keep fallback fonts when Local Font Access is unavailable or blocked.
      })
  }, [])

  useEffect(() => {
    if (!open) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node)) {
        return
      }
      if (!popoverRef.current?.contains(target)) {
        setOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const normalizedSearch = searchValue.trim().toLowerCase()
  const filteredFonts = normalizedSearch.length > 0
    ? fontOptions.filter((fontName) => fontName.toLowerCase().includes(normalizedSearch))
    : fontOptions

  return (
    <div className={'relative'} ref={popoverRef}>
      <Button
        type={'button'}
        variant={'outline'}
        className={'h-8 w-full justify-between bg-white px-2 text-[11px]'}
        title={props.value}
        onClick={() => {
          setOpen((currentOpen) => !currentOpen)
        }}
      >
        <span className={'truncate text-left'} style={{fontFamily: `${props.value}, Inter, "Segoe UI", sans-serif`}}>
          {props.value}
        </span>
        <LuChevronDown size={14}/>
      </Button>

      {open &&
        <div className={'absolute left-0 top-[calc(100%+6px)] z-50 w-[320px] overflow-hidden rounded-2xl bg-[#f2f2f3] dark:bg-slate-900'}>
          <div className={'flex items-center justify-between px-4 py-3'}>
            <h4 className={'text-lg font-semibold text-slate-900'}>
              {t('inspector.fontPicker.title', {defaultValue: 'Fonts'})}
            </h4>
            <div className={'inline-flex items-center gap-2'}>
              <Button
                type={'button'}
                variant={'ghost'}
                noTooltip
                className={'inline-flex size-7 items-center justify-center rounded-full text-slate-700 hover:bg-white'}
                title={t('inspector.fontPicker.settings', {defaultValue: 'Font settings'})}
              >
                <LuSettings2 size={14}/>
              </Button>
              <Button
                type={'button'}
                variant={'ghost'}
                noTooltip
                className={'inline-flex size-7 items-center justify-center rounded-full text-slate-700 hover:bg-white'}
                title={t('inspector.fontPicker.close', {defaultValue: 'Close'})}
                onClick={() => {
                  setOpen(false)
                }}
              >
                <LuX size={16}/>
              </Button>
            </div>
          </div>

          <div className={'px-3 pb-3'}>
            <div className={'mb-3 flex items-center rounded-xl bg-white px-2 py-2 dark:bg-slate-950'}>
              <LuSearch size={16} className={'text-slate-700'}/>
              <input
                type={'text'}
                value={searchValue}
                className={'ml-2 h-6 w-full bg-transparent text-base text-slate-900 outline-none'}
                placeholder={t('inspector.fontPicker.searchPlaceholder', {defaultValue: 'Search fonts'})}
                onChange={(event) => {
                  setSearchValue(event.target.value)
                }}
              />
            </div>

            <Button
              type={'button'}
              variant={'outline'}
              className={'mb-3 h-11 w-full justify-between rounded-xl bg-[#f8f8f8] px-3 text-[14px] text-slate-900'}
              title={t('inspector.fontPicker.filterAll', {defaultValue: 'All fonts'})}
            >
              <span>{t('inspector.fontPicker.filterAll', {defaultValue: 'All fonts'})}</span>
              <LuChevronDown size={14}/>
            </Button>

            <div className={'scrollbar-custom max-h-[420px] overflow-y-auto pt-3'}>
              {filteredFonts.length === 0
                ? <div className={'px-2 py-4 text-sm text-slate-500 dark:text-slate-400'}>
                    {t('inspector.fontPicker.noResults', {defaultValue: 'No fonts found'})}
                  </div>
                : filteredFonts.map((fontName) => {
                    const selected = fontName === props.value
                    return (
                      <Button
                        key={fontName}
                        type={'button'}
                        variant={'ghost'}
                        noTooltip
                        className={'h-auto w-full justify-start rounded-md px-2 py-1.5 text-left text-[14px] hover:bg-white'}
                        title={fontName}
                        onClick={() => {
                          props.onChange(fontName)
                          setOpen(false)
                        }}
                      >
                        <span
                          className={selected ? 'font-semibold text-slate-950' : 'text-slate-900'}
                          style={{fontFamily: `${fontName}, Inter, "Segoe UI", sans-serif`}}
                        >
                          {fontName}
                        </span>
                      </Button>
                    )
                  })}
            </div>
          </div>
        </div>}
    </div>
  )
}