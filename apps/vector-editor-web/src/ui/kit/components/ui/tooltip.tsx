import {type HTMLAttributes, type ReactElement, type ReactNode} from 'react'
import {
  Tooltip as ShadcnTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {cn} from '../../lib/utils.ts'

export type TooltipPlacement = 't' | 'r' | 'b' | 'l' | 'tl' | 'tr' | 'bl' | 'br'

export interface TooltipProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title: ReactNode
  asChild?: boolean
  bgColor?: string
  textColor?: string
  placement?: TooltipPlacement
  animationEnterDuration?: number
  animationExitDuration?: number
  children: ReactNode
}

function resolveSide(placement: TooltipPlacement): 'top' | 'right' | 'bottom' | 'left' {
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

function resolveAlign(placement: TooltipPlacement): 'start' | 'center' | 'end' {
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
  asChild = false,
  bgColor = '#333',
  textColor = '#fff',
  placement = 't',
  children,
  className,
  ...props
}: TooltipProps) {
  const contentNode = <TooltipContent
    side={resolveSide(placement)}
    align={resolveAlign(placement)}
    sideOffset={6}
    className="z-50 whitespace-nowrap rounded px-2 py-1 shadow"
    style={{backgroundColor: bgColor, color: textColor, fontSize: 11, lineHeight: '14px'}}
  >
    {title}
  </TooltipContent>

  if (asChild) {
    return (
      <TooltipProvider delay={250}>
        <ShadcnTooltip>
          <TooltipTrigger nativeButton={false} render={children as ReactElement} />
          {contentNode}
        </ShadcnTooltip>
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider delay={250}>
      <ShadcnTooltip>
        <TooltipTrigger nativeButton={false}>
          <div className={cn('inline-flex', className)} {...props}>
            {children as ReactElement}
          </div>
        </TooltipTrigger>
        {contentNode}
      </ShadcnTooltip>
    </TooltipProvider>
  )
}
