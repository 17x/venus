import type {ComponentProps} from 'react'
import {Separator as ShadcnSeparator} from '../../../primitives/separator.tsx'
import {cn} from '../../../lib/cn.ts'

interface SeparatorProps extends Omit<ComponentProps<typeof ShadcnSeparator>, 'orientation'> {
  orientation?: 'horizontal' | 'vertical'
}

export function Separator({className, orientation = 'horizontal', ...props}: SeparatorProps) {
  return <ShadcnSeparator
    orientation={orientation}
    className={cn('w-50 border-slate-200 border-b', className)}
    {...props}
  />
}