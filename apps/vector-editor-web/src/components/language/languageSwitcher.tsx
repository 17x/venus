import {useEffect, useRef, useState} from 'react'
import {Button, cn} from '@venus/ui'
import {type VectorLanguageCode, useVectorUiI18n} from '../../i18n/ui.ts'
import {EDITOR_TEXT_MENU_CLASS, EDITOR_TEXT_META_CLASS} from '../editorChrome/editorTypography.ts'

const LanguageSwitcher = () => {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const {
    language,
    languages,
    getLanguageLabel,
    tUi,
    changeLanguage,
  } = useVectorUiI18n()

  useEffect(() => {
    const closeOnPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    window.addEventListener('pointerdown', closeOnPointerDown)
    window.addEventListener('keydown', closeOnEscape)

    return () => {
      window.removeEventListener('pointerdown', closeOnPointerDown)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  const selectLanguage = (nextLanguage: VectorLanguageCode) => {
    changeLanguage(nextLanguage)
    setIsOpen(false)
  }

  return (
    <div ref={rootRef} className={cn('relative flex h-full items-center pr-2 select-none', EDITOR_TEXT_MENU_CLASS)}>
      <Button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={tUi('languageSelectorLabel')}
        className={cn(
          'inline-flex h-7 items-center gap-1.5 rounded border border-transparent px-3 font-medium text-gray-700 hover:border-gray-200 hover:bg-gray-100 hover:text-gray-950',
          EDITOR_TEXT_MENU_CLASS,
          isOpen && 'border-gray-200 bg-gray-100 text-gray-950 shadow-sm',
        )}
        onClick={() => {
          setIsOpen((current) => !current)
        }}
      >
        {/* <span className={cn('font-semibold uppercase tracking-wide', EDITOR_TEXT_META_CLASS)}>{language}</span> */}
        {/* <span className="text-gray-400">·</span> */}
        <span>{getLanguageLabel(language)}</span>
      </Button>

      {isOpen &&
        <div
          role="menu"
          aria-label={tUi('languageSelectorLabel')}
          className="absolute right-2 top-full z-50 mt-1 min-w-36 overflow-hidden rounded border border-gray-200 bg-white py-1 shadow-lg"
        >
          {
            languages.map((langCode) => {
              const isCurrent = langCode === language
              return <Button
                key={langCode}
                type="button"
                role="menuitemradio"
                aria-checked={isCurrent}
                className={cn(
                  'flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-gray-700 hover:bg-gray-100',
                  EDITOR_TEXT_MENU_CLASS,
                  isCurrent && 'bg-gray-100 font-medium text-gray-950',
                )}
                onClick={() => selectLanguage(langCode)}
              >
                <span className="inline-flex items-center gap-2">
                  <span className={cn('w-5 font-semibold uppercase tracking-wide text-gray-500', EDITOR_TEXT_META_CLASS)}>{langCode}</span>
                  <span>{getLanguageLabel(langCode)}</span>
                </span>
                {isCurrent && <span aria-hidden className="size-1.5 rounded-full bg-gray-950"/>}
              </Button>
            })
          }
        </div>}
    </div>
  )
}

export default LanguageSwitcher
