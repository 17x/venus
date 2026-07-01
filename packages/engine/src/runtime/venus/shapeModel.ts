import type {VenusDocumentModelType} from './Venus.ts'

export type VenusShapeModelFamily = 'engine-shape' | 'text' | 'container' | 'image'

export interface VenusShapeModelSpec {
  type: VenusDocumentModelType
  family: VenusShapeModelFamily
  files: readonly string[]
  proxy: string
  inherits: readonly string[]
  minimalCreate: readonly string[]
  bounds: string
  geometry: readonly string[]
  pathExpansion: string
  commonRender: readonly string[]
}

export const VENUS_COMMON_RENDER_PROPERTIES = [
  'visible / locked: shared selection and visibility gates',
  'opacity / appearance.opacity: node or subtree opacity',
  'blendMode / appearance.blendMode: renderer blend mode hint',
  'fill / fills / appearance.fills: fill paint layers for filled geometry and text',
  'stroke / strokes / strokeWidth / strokeAlign / strokeDashArray / strokeCap / strokeJoin / appearance.strokes: stroke paint and stroke geometry controls',
  'shadow / innerShadow / layerBlur / appearance.effects: visual effects projected to renderer fields',
] as const

export const VENUS_SHAPE_MODEL_SPECS: readonly VenusShapeModelSpec[] = [
  {
    type: 'rect',
    family: 'engine-shape',
    files: ['runtime/venus/Venus.ts', 'runtime/venus/VenusNodeProxy.ts', 'renderer/canvas2d/shapes.ts'],
    proxy: 'VenusRectProxy',
    inherits: ['VenusNodeProxy'],
    minimalCreate: ['type', 'width', 'height'],
    bounds: 'x/y are the local top-left of the rectangle bounds; width/height are the rendered box.',
    geometry: ['cornerRadius', 'cornerRadii'],
    pathExpansion: 'Can expand to a path made of four straight edges plus optional quadratic corner arcs.',
    commonRender: ['fill', 'stroke', 'multi fill paints', 'multi stroke paints', 'stroke alignment', 'dash/cap/join', 'opacity', 'blend/effects'],
  },
  {
    type: 'ellipse',
    family: 'engine-shape',
    files: ['runtime/venus/Venus.ts', 'runtime/venus/VenusNodeProxy.ts', 'renderer/canvas2d/shapes.ts'],
    proxy: 'VenusEllipseProxy',
    inherits: ['VenusNodeProxy'],
    minimalCreate: ['type', 'width', 'height'],
    bounds: 'x/y are the local top-left of the ellipse bounds; width/height are the containing box.',
    geometry: ['ellipseStartAngle', 'ellipseEndAngle', 'ellipseDrawWedgeLine'],
    pathExpansion: 'Can expand to an arc path. Full ellipses become cubic bezier contours; partial arcs can optionally include wedge edges to center.',
    commonRender: ['fill', 'stroke', 'multi fill paints', 'multi stroke paints', 'stroke alignment', 'dash/cap/join', 'opacity', 'blend/effects'],
  },
  {
    type: 'line',
    family: 'engine-shape',
    files: ['runtime/venus/Venus.ts', 'runtime/venus/VenusNodeProxy.ts', 'renderer/canvas2d/shapes.ts'],
    proxy: 'VenusLineProxy',
    inherits: ['VenusNodeProxy'],
    minimalCreate: ['type', 'points'],
    bounds: 'points[0] and points[1] are the anchor points. x/y plus width/height remain compatibility fields derived from start and end.',
    geometry: ['points[0] start anchor', 'points[1] end anchor', 'x/y start compatibility', 'width/height end delta compatibility'],
    pathExpansion: 'Already equivalent to an open two-anchor path.',
    commonRender: ['stroke', 'multi stroke paints', 'stroke width', 'dash/cap/join', 'opacity', 'blend/effects'],
  },
  {
    type: 'text',
    family: 'text',
    files: ['runtime/venus/Venus.ts', 'runtime/venus/VenusNodeProxy.ts', 'renderer/canvas2d/canvas2d.ts'],
    proxy: 'VenusTextProxy',
    inherits: ['VenusNodeProxy'],
    minimalCreate: ['type', 'text'],
    bounds: 'x/y are the text box origin. width/height are optional editor bounds used for layout and transforms.',
    geometry: ['text', 'runs', 'fontSize', 'fontWeight', 'lineHeight'],
    pathExpansion: 'Not implemented as path expansion; future text outlining should live in a font/text module.',
    commonRender: ['fill', 'multi fill paints', 'opacity', 'blend/effects'],
  },
  {
    type: 'group',
    family: 'container',
    files: ['runtime/venus/Venus.ts', 'runtime/venus/VenusNodeProxy.ts'],
    proxy: 'VenusGroupProxy',
    inherits: ['VenusNodeProxy'],
    minimalCreate: ['type', 'children'],
    bounds: 'x/y are parent transform translation. The visual bounds are derived from children; width/height are not group-owned geometry.',
    geometry: ['children'],
    pathExpansion: 'Not a shape path. It is a scene tree container that composes child paths.',
    commonRender: ['subtree opacity', 'blend/effects on composed children'],
  },
  {
    type: 'clip',
    family: 'container',
    files: ['runtime/venus/Venus.ts', 'runtime/venus/VenusNodeProxy.ts'],
    proxy: 'VenusClipProxy',
    inherits: ['VenusGroupProxy', 'VenusNodeProxy'],
    minimalCreate: ['type', 'clipPath', 'children'],
    bounds: 'Clip bounds come from clipPath first, then children. x/y/width/height are not container-owned geometry.',
    geometry: ['clipPath', 'children'],
    pathExpansion: 'The clipPath can be path-expanded if its node type supports it; the clip container itself cannot.',
    commonRender: ['subtree opacity', 'blend/effects on clipped composition'],
  },
  {
    type: 'mask',
    family: 'container',
    files: ['runtime/venus/Venus.ts', 'runtime/venus/VenusNodeProxy.ts'],
    proxy: 'VenusMaskProxy',
    inherits: ['VenusGroupProxy', 'VenusNodeProxy'],
    minimalCreate: ['type', 'clipPath', 'children'],
    bounds: 'Mask bounds come from clipPath first, then children. x/y/width/height are not container-owned geometry.',
    geometry: ['clipPath', 'children'],
    pathExpansion: 'The mask path can be path-expanded if its node type supports it; the mask container itself cannot.',
    commonRender: ['subtree opacity', 'blend/effects on masked composition'],
  },
  {
    type: 'polygon',
    family: 'engine-shape',
    files: ['runtime/venus/Venus.ts', 'runtime/venus/VenusNodeProxy.ts', 'renderer/canvas2d/shapes.ts'],
    proxy: 'VenusPolygonProxy',
    inherits: ['VenusNodeProxy'],
    minimalCreate: ['type', 'width', 'height', 'points'],
    bounds: 'x/y/width/height are the editor bounds for transforms and proxy resizing. points hold the actual vertex geometry and are rescaled when bounds are patched.',
    geometry: ['points', 'closed'],
    pathExpansion: 'Already equivalent to a closed point-list path.',
    commonRender: ['fill', 'stroke', 'multi fill paints', 'multi stroke paints', 'stroke alignment', 'dash/cap/join', 'opacity', 'blend/effects'],
  },
  {
    type: 'path',
    family: 'engine-shape',
    files: ['runtime/venus/Venus.ts', 'runtime/venus/VenusNodeProxy.ts', 'renderer/canvas2d/shapes.ts'],
    proxy: 'VenusPathProxy',
    inherits: ['VenusNodeProxy'],
    minimalCreate: ['type', 'width', 'height', 'points or bezierPoints'],
    bounds: 'x/y/width/height are editor bounds for transforms and proxy resizing. points/bezierPoints hold the rendered geometry and are translated/scaled when bounds are patched.',
    geometry: ['points', 'bezierPoints', 'closed', 'strokeStartArrowhead', 'strokeEndArrowhead'],
    pathExpansion: 'This is the native path form.',
    commonRender: ['fill only when closed', 'stroke', 'multi fill paints for closed paths', 'multi stroke paints', 'stroke alignment', 'dash/cap/join', 'opacity', 'blend/effects'],
  },
  {
    type: 'image',
    family: 'image',
    files: ['runtime/venus/Venus.ts', 'runtime/venus/VenusNodeProxy.ts', 'renderer/canvas2d/canvas2d.ts'],
    proxy: 'VenusImageProxy',
    inherits: ['VenusNodeProxy'],
    minimalCreate: ['type', 'width', 'height', 'assetId'],
    bounds: 'x/y are the image quad top-left; width/height are the rendered quad size.',
    geometry: ['assetId', 'sourceRect', 'naturalSize', 'imageSmoothing'],
    pathExpansion: 'Not path-expandable. It renders as an image quad.',
    commonRender: ['opacity', 'blend/effects'],
  },
] as const
