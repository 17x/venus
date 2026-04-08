import * as ScrollArea from '@radix-ui/react-scroll-area'
import {type CSSProperties, type HTMLAttributes, type ReactNode} from 'react'
import {cn} from '../../lib/utils.ts'

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  xs?: boolean
  s?: boolean
  m?: boolean
  l?: boolean
  head: ReactNode
  headStyle?: CSSProperties
  contentStyle?: CSSProperties
}

export function Panel({
  children,
  className,
  head,
  headStyle,
  contentStyle,
  xs,
  s,
  l,
  ...props
}: PanelProps) {
  return (
    <section
      className={cn(
        'flex h-full w-full min-h-0 flex-col overflow-hidden rounded border border-gray-200 bg-white text-gray-950 shadow-sm',
        className,
      )}
      role="region"
      {...props}
    >
      <header
        className={cn(
          'flex shrink-0 items-center border-b border-gray-200 bg-gray-50 font-medium text-gray-900',
          xs && 'min-h-6 px-2 py-1 text-xs',
          s && 'min-h-7 px-2 py-1 text-xs',
          !xs && !s && !l && 'min-h-8 px-3 py-1.5 text-sm',
          l && 'min-h-10 px-3 py-2 text-base',
        )}
        style={headStyle}
      >
        {head}
      </header>
      <ScrollArea.Root
        className="min-h-0 flex-1"
        style={contentStyle}
      >
        <ScrollArea.Viewport className="h-full w-full">
          <div
            className={cn(
              xs && 'p-1 text-xs',
              s && 'p-1.5 text-xs',
              !xs && !s && !l && 'p-2 text-sm',
              l && 'p-3 text-base',
            )}
          >
            {children}
          </div>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar
          orientation="vertical"
          className="flex w-2 touch-none select-none bg-transparent p-0.5"
        >
          <ScrollArea.Thumb className="relative flex-1 rounded-full bg-gray-300" />
        </ScrollArea.Scrollbar>
        <ScrollArea.Scrollbar
          orientation="horizontal"
          className="flex h-2 touch-none select-none bg-transparent p-0.5"
        >
          <ScrollArea.Thumb className="relative flex-1 rounded-full bg-gray-300" />
        </ScrollArea.Scrollbar>
        <ScrollArea.Corner />
      </ScrollArea.Root>
    </section>
  )
}
