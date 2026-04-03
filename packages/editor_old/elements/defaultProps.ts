import {
  AnchorPoint,
  Appearance,
  BezierPoint,
  BorderRadius,
  Fill,
  Gradient,
  HorizontalAlign,
  Point,
  Shadow,
  Stroke,
  TextFontProps,
  Transform,
  VerticalAlign,
} from '~/elements/props'

export const DEFAULT_CX = 0
export const DEFAULT_CY = 0
export const DEFAULT_WIDTH = 10
export const DEFAULT_HEIGHT = 10

export const DEFAULT_BORDER_RADIUS: BorderRadius = [0, 0, 0, 0]

export const DEFAULT_POINT: Point = {
  x: 0,
  y: 0,
}

export const DEFAULT_ANCHOR_POINT: AnchorPoint = {
  x: 0,
  y: 0,
  type: 'corner',
  leftDirection: null,
  rightDirection: null,
}

export const DEFAULT_STROKE: Stroke = {
  enabled: true,
  color: '#000000',
  weight: 1,
  cap: 'butt',
  join: 'miter',
  dashed: false,
}

export const DEFAULT_FILL: Fill = {
  enabled: false,
  color: '#FFFFFF',
}

export const DEFAULT_TEXT_FILL: Fill = {
  enabled: false,
  color: '#000000',
}

export const DEFAULT_TRANSFORM: Transform = {
  cx: 0,
  cy: 0,
  rotation: 0,
  width: 0,
  height: 0,
/*  shear: {
    angle: 0,
    axis: 'horizontal',
  },*/
}

export const DEFAULT_APPEARANCE: Appearance = {
  effects: [],
  multipleFills: false,
  multipleStrokes: false,
}

export const DEFAULT_SHADOW: Shadow = {
  type: 'drop',
  color: '#000000',
  offsetX: 0,
  offsetY: 0,
  blur: 0,
  spread: 0,
  opacity: 1,
  blendMode: 'normal',
  enabled: false,
}

export const DEFAULT_GRADIENT: Gradient = {
  type: 'linear',
  angle: 0,
  stops: [
    {offset: 0, color: '#000000', opacity: 1},
    {offset: 1, color: '#FFFFFF', opacity: 1},
  ],
}

export const DEFAULT_OPACITY = 100
export const DEFAULT_ROTATION = 0

export const DEFAULT_TEXT_FONT: TextFontProps = {
  family: 'sans-serif',
  size: 12,
  weight: 'normal',
  underline: false,
  italic: false,
  lineHeight: 1.2,
  letterSpacing: 1,
}

export const DEFAULT_FONT: TextFontProps = {
  family: 'sans-serif',
  size: 12,
  weight: 'normal',
  underline: false,
  italic: false,
  lineHeight: 1.2,
  letterSpacing: 1,
}

export const DEFAULT_VERTICAL_ALIGN: VerticalAlign = 'top'
export const DEFAULT_HORIZONTAL_ALIGN: HorizontalAlign = 'left'

export const DEFAULT_BEZIER_POINT: BezierPoint = {
  anchor: {x: 0, y: 0},
  cp1: {x: 0, y: 0},
  cp2: {x: 0, y: 0},
  type: 'corner',
  symmetric: true,
}