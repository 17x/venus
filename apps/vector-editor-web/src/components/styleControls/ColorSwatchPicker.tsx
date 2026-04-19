import {type ReactNode, useRef} from 'react'
import {cn, IconButton} from '@vector/ui'

interface ColorSwatchPickerProps {
  icon: ReactNode
  label: string
  tooltip: string
  disabled?: boolean
  value?: string
  onPick: (color: string) => void
}

const ColorSwatchPicker: React.FC<ColorSwatchPickerProps> = ({
  icon,
  label,
  tooltip,
  disabled = false,
  value,
  onPick,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null)

  const resolvedValue = value && /^#[0-9a-f]{6}$/i.test(value)
    ? value
    : '#000000'

  return <div className={'flex items-center gap-1'}>
    <IconButton
      type={'button'}
      title={tooltip}
      aria-label={tooltip}
      disabled={disabled}
      onClick={() => {
        if (disabled) {
          return
        }

        inputRef.current?.showPicker?.()
        inputRef.current?.click()
      }}
      className={cn(
        'size-8 shrink-0 rounded border border-[var(--venus-ui-border-color)] p-0 hover:bg-[var(--venus-shell-hover)]',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <span className={'inline-flex size-5 items-center justify-center text-[var(--venus-shell-text-muted)]'}>
        {icon}
      </span>
      <span className={'absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full border border-[var(--venus-ui-border-color)]'} style={{backgroundColor: resolvedValue}}></span>
    </IconButton>
    <input
      ref={inputRef}
      type={'color'}
      aria-label={label}
      value={resolvedValue}
      disabled={disabled}
      className={'pointer-events-none absolute h-0 w-0 opacity-0'}
      onChange={(event) => {
        onPick(event.target.value)
      }}
    />
  </div>
}

export default ColorSwatchPicker
