declare module '@lite-u/editor/types' {
  export type UID = string

  export type VisionEventType = string

  export type VisionEventData = unknown

  export interface TextRunStyle {
    color?: string
    fontFamily?: string
    fontSize?: number
    fontWeight?: number
    letterSpacing?: number
    lineHeight?: number
    shadow?: {
      color?: string
      offsetX?: number
      offsetY?: number
      blur?: number
    }
  }

  export interface TextRun {
    start: number
    end: number
    style?: TextRunStyle
  }

  export interface PointLike {
    x: number
    y: number
    [key: string]: unknown
  }

  export interface BezierPointLike {
    anchor: PointLike
    cp1?: PointLike | null
    cp2?: PointLike | null
    [key: string]: unknown
  }

  export interface ElementFillLike {
    enabled?: boolean
    color?: string
    gradient?: unknown
  }

  export interface ElementStrokeLike {
    enabled?: boolean
    color?: string
    weight?: number
    gradient?: unknown
    cap?: string
    join?: string
    dashed?: boolean
  }

  export interface ElementShadowLike {
    enabled?: boolean
    color?: string
    offsetX?: number
    offsetY?: number
    blur?: number
  }

  export interface ElementCornerRadiiLike {
    topLeft?: number
    topRight?: number
    bottomRight?: number
    bottomLeft?: number
  }

  export interface ElementProps {
    id: string
    type?: string
    name?: string
    layer?: number

    x?: number
    y?: number
    cx?: number
    cy?: number
    width?: number
    height?: number
    rotation?: number
    flipX?: boolean
    flipY?: boolean

    points?: unknown[]
    bezierPoints?: unknown[]

    fill?: ElementFillLike
    stroke?: ElementStrokeLike
    shadow?: ElementShadowLike

    strokeStartArrowhead?: 'none' | 'triangle' | 'diamond' | 'circle' | 'bar' | string
    strokeEndArrowhead?: 'none' | 'triangle' | 'diamond' | 'circle' | 'bar' | string

    cornerRadius?: number
    cornerRadii?: ElementCornerRadiiLike
    ellipseStartAngle?: number
    ellipseEndAngle?: number

    text?: string
    textRuns?: TextRun[]

    asset?: string
    assetUrl?: string
    clipPathId?: string
    clipRule?: 'nonzero' | 'evenodd' | string

    parentId?: string | null
    childIds?: string[]

    show?: boolean

    [key: string]: unknown
  }

  export type ElementInstance = ElementProps & {
    layer: number
    type: string
  }
}
