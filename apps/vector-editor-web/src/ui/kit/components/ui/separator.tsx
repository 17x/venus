import type {ComponentProps} from 'react'
import {Separator as ShadcnSeparator} from '@/components/ui/separator'
import {cn} from '../../lib/utils.ts'

interface SeparatorProps extends Omit<ComponentProps<typeof ShadcnSeparator>, 'orientation'> {
  orientation?: 'horizontal' | 'vertical'
}

export function Separator({className, orientation = 'horizontal', ...props}: SeparatorProps) {
  return <ShadcnSeparator
    orientation={orientation}
    className={cn('bg-slate-200', className)}
    {...props}
  />
}