import {type CSSProperties, type HTMLAttributes} from 'react'
import {cn} from '../../lib/utils.ts'

export interface ParagraphProps extends HTMLAttributes<HTMLParagraphElement> {
  size?: CSSProperties['fontSize']
  textColor?: CSSProperties['color']
  center?: boolean
  wb?: CSSProperties['wordBreak']
}

export function Paragraph({
  children,
  className,
  size,
  textColor,
  center = false,
  wb = 'break-word',
  style,
  ...props
}: ParagraphProps) {
  return (
    <p
      className={cn(center && 'text-center', className)}
      style={{flex: 1, margin: 0, padding: 0, fontSize: size, color: textColor, wordBreak: wb, ...style}}
      {...props}
    >
      {children}
    </p>
  )
}

export const P = Paragraph

export interface TitleProps extends HTMLAttributes<HTMLHeadingElement> {
  textColor?: CSSProperties['color']
  sticky?: boolean
  h1?: boolean
  h2?: boolean
  h3?: boolean
  h4?: boolean
  h5?: boolean
  h6?: boolean
}

export function Title({
  children,
  className,
  textColor,
  sticky,
  h1,
  h2,
  h3,
  h4,
  h5,
  h6,
  style,
  ...props
}: TitleProps) {
  const level = h1 ? 'h1' : h2 ? 'h2' : h3 ? 'h3' : h4 ? 'h4' : h5 ? 'h5' : h6 ? 'h6' : 'h1'
  const Tag = level

  return (
    <Tag
      className={cn('my-2 font-bold', className)}
      style={{
        color: textColor,
        position: sticky ? 'sticky' : undefined,
        top: sticky ? 0 : undefined,
        zIndex: sticky ? 10 : undefined,
        fontSize: h2 ? 18 : undefined,
        ...style,
      }}
      {...props}
    >
      {children}
    </Tag>
  )
}
