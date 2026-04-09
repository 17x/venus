import * as RadixTooltip from '@radix-ui/react-tooltip'
import {type HTMLAttributes, type ReactNode} from 'react'
import {cn} from '../../lib/utils.ts'

export type TooltipPlacement = 't' | 'r' | 'b' | 'l' | 'tl' | 'tr' | 'bl' | 'br'

export interface TooltipProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title: ReactNode
  bgColor?: string
  textColor?: string
  placement?: TooltipPlacement
  animationEnterDuration?: number
  animationExitDuration?: number
  children: ReactNode
}

function resolveSide(placement: TooltipPlacement): RadixTooltip.TooltipContentProps['side'] {
  if (placement.startsWith('t')) {
    return 'top'
  }
  if (placement.startsWith('b')) {
    return 'bottom'
  }
  if (placement === 'r') {
    return 'right'
  }
  return 'left'
}

function resolveAlign(placement: TooltipPlacement): RadixTooltip.TooltipContentProps['align'] {
  if (placement.length === 1) {
    return 'center'
  }
  if (placement.endsWith('l')) {
    return 'start'
  }
  return 'end'
}

export function Tooltip({
  title,
  bgColor = '#333',
  textColor = '#fff',
  placement = 't',
  children,
  className,
  ...props
}: TooltipProps) {
  return (
    <RadixTooltip.Provider delayDuration={250}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>
          <div className={cn('inline-flex', className)} {...props}>
            {children}
          </div>
        </RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side={resolveSide(placement)}
            align={resolveAlign(placement)}
            sideOffset={6}
            className="z-50 whitespace-nowrap rounded px-2 py-1 shadow"
            style={{backgroundColor: bgColor, color: textColor, fontSize: 11, lineHeight: '14px'}}
          >
            {title}
            <RadixTooltip.Arrow width={8} height={4} style={{fill: bgColor}} />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  )
}
