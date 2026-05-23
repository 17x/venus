import {
  applyAffineMatrixToPoint,
} from '../shapeTransform.ts'
import type { EngineEditorHitTestNode, EngineEditorPoint } from '../hitTest.ts'
import type {
  EngineGeometryBounds,
  EngineGeometryOutline,
} from './geometryPayloadTypes.ts'
import type { GeometryMatrix2D } from './geometryPayloadTransform.ts'

const TEXT_FONT_SIZE_MIN = 8
const TEXT_FONT_SIZE_FALLBACK = 14
const TEXT_LINE_HEIGHT_MULTIPLIER = 1.2
const ALIGN_MIDDLE_DIVISOR = 2
const APPROX_CHAR_WIDTH_MULTIPLIER = 0.56
const TEXT_BASELINE_OFFSET_MULTIPLIER = 0.8

/**
 * Resolves text line-edge outlines so vector can render text edge contours.
 * @param node Text-capable node candidate.
 * @param bounds Node bounds used to estimate line placement.
 * @param matrix World transform matrix for emitted outline points.
 */
export function resolveTextLineOutlines(
  node: EngineEditorHitTestNode,
  bounds: EngineGeometryBounds,
  matrix: GeometryMatrix2D,
): EngineGeometryOutline[] {
  const textData = resolveNodeTextData(node)
  if (!textData.text || textData.text.length === 0) {
    return []
  }

  const lines = textData.text.split(/\r?\n/)
  if (lines.length === 0) {
    return []
  }

  const firstRunStyle = textData.textRuns?.[0]?.style
  const fontSize = Math.max(TEXT_FONT_SIZE_MIN, firstRunStyle?.fontSize ?? TEXT_FONT_SIZE_FALLBACK)
  const lineHeight = Math.max(fontSize, firstRunStyle?.lineHeight ?? fontSize * TEXT_LINE_HEIGHT_MULTIPLIER)
  const textAlign = firstRunStyle?.textAlign ?? 'left'
  const verticalAlign = firstRunStyle?.verticalAlign ?? 'top'
  const contentHeight = lineHeight * lines.length
  const verticalOffset = verticalAlign === 'middle'
    ? (bounds.maxY - bounds.minY - contentHeight) / ALIGN_MIDDLE_DIVISOR
    : verticalAlign === 'bottom'
      ? (bounds.maxY - bounds.minY - contentHeight)
      : 0
  const topY = bounds.minY + Math.max(0, verticalOffset)

  const lineOutlines: EngineGeometryOutline[] = []
  lines.forEach((line, index) => {
    const trimmedLength = line.length
    const approxCharWidth = fontSize * APPROX_CHAR_WIDTH_MULTIPLIER
    const estimatedWidth = Math.min(bounds.maxX - bounds.minX, trimmedLength * approxCharWidth)
    const lineLeft = textAlign === 'center'
      ? (bounds.minX + bounds.maxX - estimatedWidth) / ALIGN_MIDDLE_DIVISOR
      : textAlign === 'right'
        ? (bounds.maxX - estimatedWidth)
        : bounds.minX
    const lineTop = topY + index * lineHeight
    const lineRight = Math.max(lineLeft, lineLeft + estimatedWidth)
    const baselineY = Math.min(
      bounds.maxY,
      Math.max(bounds.minY, lineTop + fontSize * TEXT_BASELINE_OFFSET_MULTIPLIER),
    )

    if (lineRight <= lineLeft) {
      return
    }

    // Emit per-line baseline segments so hover/marquee text overlays stay lightweight.
    lineOutlines.push({
      kind: 'polyline',
      points: resolveTransformedPoints([
        {x: lineLeft, y: baselineY},
        {x: lineRight, y: baselineY},
      ], matrix),
      closed: false,
    })
  })

  return lineOutlines
}

/**
 * Resolves text payload from optional node fields without changing hit-test contracts.
 * @param node Node carrying optional text payload fields.
 */
function resolveNodeTextData(node: EngineEditorHitTestNode): {
  text: string | null
  textRuns: Array<{style?: {fontSize?: number; lineHeight?: number; textAlign?: 'left' | 'center' | 'right'; verticalAlign?: 'top' | 'middle' | 'bottom'}}> | null
} {
  const candidateNode = node as EngineEditorHitTestNode & {
    text?: string
    textRuns?: Array<{style?: {fontSize?: number; lineHeight?: number; textAlign?: 'left' | 'center' | 'right'; verticalAlign?: 'top' | 'middle' | 'bottom'}}>
  }
  return {
    text: typeof candidateNode.text === 'string' ? candidateNode.text : null,
    textRuns: Array.isArray(candidateNode.textRuns) ? candidateNode.textRuns : null,
  }
}

/**
 * Resolves transformed points for one geometry contour under node matrix.
 * @param points Source points in local coordinates.
 * @param matrix Affine matrix used to project points into world coordinates.
 */
function resolveTransformedPoints(
  points: readonly EngineEditorPoint[],
  matrix: GeometryMatrix2D,
): EngineEditorPoint[] {
  return points.map((point) => applyAffineMatrixToPoint(matrix, point))
}
