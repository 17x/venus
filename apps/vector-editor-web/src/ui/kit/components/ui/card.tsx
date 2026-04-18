import type {ComponentProps} from 'react'
import {
  Card as ShadcnCard,
  CardContent as ShadcnCardContent,
  CardDescription as ShadcnCardDescription,
  CardFooter as ShadcnCardFooter,
  CardHeader as ShadcnCardHeader,
  CardTitle as ShadcnCardTitle,
} from '@/components/ui/card'

export function Card(props: ComponentProps<typeof ShadcnCard>) {
  return <ShadcnCard {...props} />
}

export function CardHeader(props: ComponentProps<typeof ShadcnCardHeader>) {
  return <ShadcnCardHeader {...props} />
}

export function CardTitle(props: ComponentProps<typeof ShadcnCardTitle>) {
  return <ShadcnCardTitle {...props} />
}

export function CardDescription(props: ComponentProps<typeof ShadcnCardDescription>) {
  return <ShadcnCardDescription {...props} />
}

export function CardContent(props: ComponentProps<typeof ShadcnCardContent>) {
  return <ShadcnCardContent {...props} />
}

export function CardFooter(props: ComponentProps<typeof ShadcnCardFooter>) {
  return <ShadcnCardFooter {...props} />
}