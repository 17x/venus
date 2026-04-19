import React, {useEffect, useId, useRef, useState} from 'react'
import {RUNTIME_ZOOM_PRESETS, type RuntimeZoomPreset} from '../../editor/interaction/runtime/index.ts'
import {cn, Tooltip} from '@vector/ui'
import {EDITOR_TEXT_CONTROL_CLASS, EDITOR_TEXT_MENU_CLASS} from '../editorChrome/editorTypography.ts'
import {LuChevronDown} from 'react-icons/lu'

export type ZoomLevels = RuntimeZoomPreset

const formatZoom = (scale: number) => {
  const percent = scale * 100
  const rounded = Math.round(percent)

  if (Math.abs(percent - rounded) < 0.01) {
    return `${rounded}%`
  }

  return `${percent.toFixed(2)}%`
}

const parseZoomScale = (value: string): number | null => {
  const cleanedValue = value.trim().replace('%', '')
  const percentage = Number(cleanedValue)

  if (!Number.isFinite(percentage) || percentage <= 0) {
    return null
  }

  return Number((percentage / 100).toFixed(4))
}

const ZoomSelect: React.FC<{ scale: number, onChange: (newScale: number | 'fit') => void }> = ({scale, onChange}) => {
  const [draftValue, setDraftValue] = useState(formatZoom(scale))
  const [menuOpen, setMenuOpen] = useState(false)
  const menuId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setDraftValue(formatZoom(scale))
  }, [scale])

  useEffect(() => {
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) {
        return
      }

      setMenuOpen(false)
      setDraftValue(formatZoom(scale))
    }

    window.addEventListener('pointerdown', closeOnOutsidePointer)

    return () => {
      window.removeEventListener('pointerdown', closeOnOutsidePointer)
    }
  }, [scale])

  const commitDraftValue = () => {
    const nextScale = parseZoomScale(draftValue)

    if (nextScale === null) {
      setDraftValue(formatZoom(scale))
      return
    }

    onChange(nextScale)
    setDraftValue(formatZoom(nextScale))
  }

  const selectZoomLevel = (value: number | 'fit') => {
    setMenuOpen(false)

    if (value === 'fit') {
      onChange('fit')
      return
    }

    onChange(value)
    setDraftValue(formatZoom(value))
  }

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      commitDraftValue()
      inputRef.current?.blur()
      event.preventDefault()
    }

    if (event.key === 'ArrowDown') {
      setMenuOpen(true)
      event.preventDefault()
    }

    if (event.key === 'Escape') {
      setDraftValue(formatZoom(scale))
      setMenuOpen(false)
      inputRef.current?.blur()
      event.preventDefault()
    }

    event.stopPropagation()
  }

  return <div ref={rootRef} className={'relative'}>
    <div
      className={cn(
        'flex h-5 w-[82px] items-center overflow-hidden rounded bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100',
        'focus-within:ring-1 focus-within:ring-slate-300 dark:focus-within:ring-slate-600',
        menuOpen && 'ring-1 ring-slate-300 dark:ring-slate-600',
      )}
    >
      <input
        ref={inputRef}
        type="text"
        value={draftValue}
        aria-label="Zoom percentage"
        aria-controls={menuOpen ? menuId : undefined}
        aria-haspopup="listbox"
        className={cn(
          'h-full min-w-0 flex-1 bg-transparent px-1.5 text-left tabular-nums outline-none',
          EDITOR_TEXT_CONTROL_CLASS,
        )}
        onFocus={(event) => {
          event.currentTarget.select()
        }}
        onChange={(event) => {
          setDraftValue(event.target.value)
        }}
        onBlur={(event) => {
          if (event.relatedTarget && rootRef.current?.contains(event.relatedTarget as Node)) {
            return
          }

          commitDraftValue()
        }}
        onKeyDown={handleInputKeyDown}
      />
      <Tooltip title={'Open zoom presets'} asChild>
        <button
          type="button"
          aria-label="Open zoom presets"
          title={'Open zoom presets'}
          aria-haspopup="listbox"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          className={'flex h-full w-4 shrink-0 cursor-pointer items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-300 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 dark:focus-visible:ring-slate-600'}
          onMouseDown={(event) => {
            event.preventDefault()
          }}
          onClick={() => {
            setMenuOpen((open) => !open)
          }}
        >
          <LuChevronDown size={11}/>
        </button>
      </Tooltip>
    </div>

    {menuOpen &&
      <div
        id={menuId}
        role="listbox"
        aria-label="Zoom presets"
        className={'absolute bottom-full left-0 z-50 mb-1 max-h-64 w-32 overflow-y-auto rounded bg-white py-1 dark:bg-slate-900'}
      >
        {
          RUNTIME_ZOOM_PRESETS.map(({label, value}) => {
            const selected = value !== 'fit' && Math.abs(value - scale) < 0.0001
            return <Tooltip key={value} title={label} asChild>
              <button
                type="button"
                role="option"
                aria-selected={selected}
                title={label}
                className={cn(
                  'flex h-7 w-full cursor-pointer items-center justify-between px-3 text-left hover:bg-slate-100 dark:hover:bg-slate-800',
                  EDITOR_TEXT_MENU_CLASS,
                  selected && 'bg-slate-100 font-medium text-slate-900 dark:bg-slate-800 dark:text-slate-50',
                )}
                onMouseDown={(event) => {
                  event.preventDefault()
                }}
                onClick={() => {
                  selectZoomLevel(value)
                }}
              >
                <span>{label}</span>
                {selected && <span aria-hidden className={'size-1.5 rounded-full bg-current'}/>} 
              </button>
            </Tooltip>
          })
        }
      </div>}
  </div>
}

export default ZoomSelect
