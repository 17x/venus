import {type ReactNode, useEffect, useMemo, useRef, useState} from 'react'
import {cn} from '@vector/ui'

interface IconInputFieldProps {
  value: number
  onChange: (nextValue: number) => void
  min?: number
  max?: number
  step?: number
  title?: string
  leading?: ReactNode
  trailing?: ReactNode
  unit?: string
  dragTarget?: 'leading' | 'trailing'
  className?: string
}

function clampValue(value: number, min?: number, max?: number) {
  if (typeof min === 'number' && value < min) {
    return min
  }
  if (typeof max === 'number' && value > max) {
    return max
  }
  return value
}

export function IconInputField({
  value,
  onChange,
  min,
  max,
  step = 1,
  title,
  leading,
  trailing,
  unit,
  dragTarget = 'leading',
  className,
}: IconInputFieldProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const dragStateRef = useRef<{startX: number; startValue: number} | null>(null)

  const formatValueText = useMemo(() => {
    return (nextValue: number) => {
      if (!Number.isFinite(nextValue)) {
        return ''
      }

      const normalized = Math.abs(nextValue - Math.round(nextValue)) < 0.0001
        ? String(Math.round(nextValue))
        : String(Number(nextValue.toFixed(3)))

      return unit ? `${normalized}${unit}` : normalized
    }
  }, [unit])

  const [draftValue, setDraftValue] = useState(() => formatValueText(value))

  useEffect(() => {
    if (!isFocused && !isDragging) {
      setDraftValue(formatValueText(value))
    }
  }, [formatValueText, isDragging, isFocused, value])

  const parseDraftNumber = (input: string) => {
    let normalized = input.trim()
    if (unit && normalized.endsWith(unit)) {
      normalized = normalized.slice(0, -unit.length)
    }
    normalized = normalized.replace(/[^0-9+\-\.]/g, '')
    const parsed = Number(normalized)
    if (!Number.isFinite(parsed)) {
      return null
    }

    return clampValue(parsed, min, max)
  }

  const beginDrag = (event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0) {
      return
    }

    dragStateRef.current = {startX: event.clientX, startValue: Number.isFinite(value) ? value : 0}
    setIsDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  const moveDrag = (event: React.PointerEvent<HTMLElement>) => {
    const dragState = dragStateRef.current
    if (!dragState) {
      return
    }

    const deltaX = event.clientX - dragState.startX
    const ratio = event.shiftKey ? 0.25 : 1
    const rawValue = dragState.startValue + deltaX * step * ratio
    const nextValue = clampValue(rawValue, min, max)
    const committedValue = Number(nextValue.toFixed(4))
    onChange(committedValue)
    setDraftValue(formatValueText(committedValue))
  }

  const endDrag = () => {
    dragStateRef.current = null
    setIsDragging(false)
  }

  return (
    <div
      title={title}
      className={cn(
        'flex h-8 items-center rounded bg-white transition-colors dark:bg-slate-900',
        'text-slate-900 dark:text-slate-100',
        (isFocused || isDragging) && 'ring-2 ring-slate-200 dark:ring-slate-500/60',
        className,
      )}
    >
      {leading && (
        <span
          role={'button'}
          tabIndex={0}
          aria-label={title}
          className={cn(
            'inline-flex h-full min-w-7 items-center justify-center px-1 text-slate-500 dark:text-slate-400',
            dragTarget === 'leading' && 'cursor-ew-resize hover:text-slate-700 dark:hover:text-slate-200',
          )}
          onPointerDown={dragTarget === 'leading' ? beginDrag : undefined}
          onPointerMove={dragTarget === 'leading' ? moveDrag : undefined}
          onPointerUp={dragTarget === 'leading' ? endDrag : undefined}
          onPointerCancel={dragTarget === 'leading' ? endDrag : undefined}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') {
              onChange(clampValue(value - step, min, max))
            }
            if (event.key === 'ArrowRight') {
              onChange(clampValue(value + step, min, max))
            }
          }}
        >
          {leading}
        </span>
      )}

      <input
        type={'text'}
        inputMode={'decimal'}
        value={draftValue}
        aria-label={title}
        className={'h-full min-w-0 flex-1 bg-transparent px-2 text-left outline-none'}
        onFocus={() => {
          setIsFocused(true)
        }}
        onBlur={() => {
          setIsFocused(false)
          const parsed = parseDraftNumber(draftValue)
          if (parsed === null) {
            setDraftValue(formatValueText(value))
            return
          }

          const committedValue = Number(parsed.toFixed(4))
          onChange(committedValue)
          setDraftValue(formatValueText(committedValue))
        }}
        onChange={(event) => {
          const nextDraft = event.target.value
          setDraftValue(nextDraft)

          const parsed = parseDraftNumber(nextDraft)
          if (parsed === null) {
            return
          }

          onChange(Number(parsed.toFixed(4)))
        }}
      />

      {trailing && (
        <span
          role={'button'}
          tabIndex={0}
          aria-label={title}
          className={cn(
            'inline-flex h-full min-w-7 items-center justify-center px-1 text-slate-500 dark:text-slate-400',
            dragTarget === 'trailing' && 'cursor-ew-resize hover:text-slate-700 dark:hover:text-slate-200',
          )}
          onPointerDown={dragTarget === 'trailing' ? beginDrag : undefined}
          onPointerMove={dragTarget === 'trailing' ? moveDrag : undefined}
          onPointerUp={dragTarget === 'trailing' ? endDrag : undefined}
          onPointerCancel={dragTarget === 'trailing' ? endDrag : undefined}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') {
              onChange(clampValue(value - step, min, max))
            }
            if (event.key === 'ArrowRight') {
              onChange(clampValue(value + step, min, max))
            }
          }}
        >
          {trailing}
        </span>
      )}
    </div>
  )
}
