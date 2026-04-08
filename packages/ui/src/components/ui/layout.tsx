import {
  forwardRef,
  type CSSProperties,
  type HTMLAttributes,
} from 'react'
import {cn} from '../../lib/utils.ts'

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  box?: boolean
  ovh?: boolean
  ova?: boolean
  fw?: boolean
  fh?: boolean
  tl?: boolean
  tc?: boolean
  tr?: boolean
  bg?: CSSProperties['backgroundColor']
  textColor?: CSSProperties['color']
  fz?: CSSProperties['fontSize']
  rounded?: boolean
  border?: boolean
  ib?: boolean
  abs?: boolean
  rela?: boolean
  fixed?: boolean
  t?: CSSProperties['top']
  r?: CSSProperties['right']
  b?: CSSProperties['bottom']
  l?: CSSProperties['left']
  borderColor?: CSSProperties['borderColor']
  p?: CSSProperties['padding']
  pt?: CSSProperties['paddingTop']
  pr?: CSSProperties['paddingRight']
  pb?: CSSProperties['paddingBottom']
  pl?: CSSProperties['paddingLeft']
  m?: CSSProperties['margin']
  mt?: CSSProperties['marginTop']
  mr?: CSSProperties['marginRight']
  mb?: CSSProperties['marginBottom']
  ml?: CSSProperties['marginLeft']
  w?: CSSProperties['width']
  h?: CSSProperties['height']
  maxW?: CSSProperties['maxWidth']
  maxH?: CSSProperties['maxHeight']
  minW?: CSSProperties['minWidth']
  minH?: CSSProperties['minHeight']
  flex?: CSSProperties['flex']
}

export interface FlexProps extends ContainerProps {
  col?: boolean
  row?: boolean
  flexWrap?: CSSProperties['flexWrap']
  alignItems?: CSSProperties['alignItems']
  justifyContent?: CSSProperties['justifyContent']
  space?: CSSProperties['gap']
}

export interface StackProps extends Omit<FlexProps, 'start' | 'wrap'> {
  start?: boolean
  center?: boolean
  stretch?: boolean
  end?: boolean
  wrap?: boolean
  around?: boolean
  jc?: boolean
  js?: boolean
  je?: boolean
  between?: boolean
}

export const Container = forwardRef<HTMLDivElement, ContainerProps>(function Container(
  {
    children,
    ovh = false,
    ova = false,
    box = true,
    fw = true,
    fh = false,
    tl,
    tc,
    tr,
    fz,
    bg,
    textColor,
    border,
    rounded,
    ib,
    abs,
    rela,
    fixed,
    t,
    r,
    b,
    l,
    borderColor = '#dfdfdf',
    flex,
    w,
    h,
    maxW,
    maxH,
    minW,
    minH,
    p,
    m,
    pt,
    pr,
    pb,
    pl,
    mt,
    mr,
    mb,
    ml,
    style,
    role = 'container',
    className,
    ...props
  },
  ref,
) {
  const styles: CSSProperties = {
    boxSizing: box ? 'border-box' : undefined,
    fontSize: fz,
    background: bg,
    color: textColor,
    overflow: ovh ? 'hidden' : ova ? 'auto' : undefined,
    textAlign: tl ? 'left' : tc ? 'center' : tr ? 'right' : undefined,
    border: border ? `1px solid ${borderColor}` : undefined,
    borderRadius: rounded ? 5 : undefined,
    display: ib ? 'inline-block' : undefined,
    position: abs ? 'absolute' : rela ? 'relative' : fixed ? 'fixed' : undefined,
    top: t,
    right: r,
    bottom: b,
    left: l,
    flex,
    width: w ?? (fw ? '100%' : 'auto'),
    height: h ?? (fh ? '100%' : 'auto'),
    maxWidth: maxW,
    maxHeight: maxH,
    minWidth: minW,
    minHeight: minH,
    padding: p,
    paddingTop: pt,
    paddingRight: pr,
    paddingBottom: pb,
    paddingLeft: pl,
    margin: m,
    marginTop: mt,
    marginRight: mr,
    marginBottom: mb,
    marginLeft: ml,
    ...style,
  }

  return (
    <div ref={ref} role={role} className={cn(className)} style={styles} {...props}>
      {children}
    </div>
  )
})

export const Con = Container

export const Flex = forwardRef<HTMLDivElement, FlexProps>(function Flex(
  {
    children,
    row = true,
    col,
    space = 0,
    flexWrap = 'initial',
    alignItems = 'start',
    justifyContent = 'normal',
    style,
    role = 'flex',
    ...props
  },
  ref,
) {
  return (
    <Container
      ref={ref}
      role={role}
      style={{
        display: 'flex',
        gap: space,
        alignItems,
        justifyContent,
        flexWrap,
        flexDirection: col ? 'column' : row ? 'row' : undefined,
        ...style,
      }}
      {...props}
    >
      {children}
    </Container>
  )
})

function resolveStackProps(props: StackProps, direction: CSSProperties['flexDirection']) {
  const {
    around = false,
    jc = false,
    js = false,
    je = false,
    between = false,
    start = true,
    center = false,
    stretch = false,
    end = false,
    wrap = false,
    space = 0,
    style,
    ...rest
  } = props

  const justifyContent = around
    ? 'space-around'
    : jc
      ? 'center'
      : js
        ? 'start'
        : je
          ? 'end'
          : between
            ? 'space-between'
            : undefined

  const alignItems = center
    ? 'center'
    : end
      ? 'end'
      : stretch
        ? 'stretch'
        : start
          ? 'start'
          : undefined

  return {
    rest,
    style: {
      display: 'flex',
      flex: 1,
      flexDirection: direction,
      boxSizing: 'border-box',
      gap: space,
      justifyContent,
      alignItems,
      flexWrap: wrap ? 'wrap' : undefined,
      ...style,
    } satisfies CSSProperties,
  }
}

export const Row = forwardRef<HTMLDivElement, StackProps>(function Row(
  {children, role = 'row', ...props},
  ref,
) {
  const {rest, style} = resolveStackProps(props, 'row')
  return (
    <Container ref={ref} role={role} style={style} {...rest}>
      {children}
    </Container>
  )
})

export const Column = forwardRef<HTMLDivElement, StackProps>(function Column(
  {children, role = 'column', ...props},
  ref,
) {
  const {rest, style} = resolveStackProps(props, 'column')
  return (
    <Container ref={ref} role={role} style={style} {...rest}>
      {children}
    </Container>
  )
})

export const Col = Column
