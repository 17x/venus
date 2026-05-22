import type {ShapeType} from '../../../model/index.ts'

/**
 * Maps editor shape kinds to engine render shape kinds.
 * @param type Editor shape type.
 */
export function resolveEngineShapeKind(type: ShapeType): 'rect' | 'ellipse' | 'line' | 'polygon' | 'path' {
  if (type === 'ellipse') {
    return 'ellipse'
  }
  if (type === 'lineSegment') {
    return 'line'
  }
  if (type === 'polygon' || type === 'star') {
    return 'polygon'
  }
  if (type === 'path') {
    return 'path'
  }
  if (type === 'group') {
    return 'rect'
  }
  if (type === 'frame') {
    return 'rect'
  }
  return 'rect'
}

/**
 * Converts editor text alignment values to engine text alignment values.
 * @param value Editor textAlign value.
 */
export function resolveEngineTextAlign(value: unknown): 'start' | 'center' | 'end' | undefined {
  if (value === 'left') {
    return 'start'
  }
  if (value === 'center') {
    return 'center'
  }
  if (value === 'right') {
    return 'end'
  }
  return undefined
}

/**
 * Reads one optional text-run shadow payload from unknown style data.
 * @param style Unknown text style payload.
 */
export function readRunShadow(style: unknown) {
  if (!style || typeof style !== 'object') {
    return undefined
  }

  const shadow = (style as {shadow?: unknown}).shadow
  if (!shadow || typeof shadow !== 'object') {
    return undefined
  }

  const value = shadow as {
    color?: unknown
    offsetX?: unknown
    offsetY?: unknown
    blur?: unknown
  }

  const color = typeof value.color === 'string' ? value.color : undefined
  const offsetX = typeof value.offsetX === 'number' ? value.offsetX : undefined
  const offsetY = typeof value.offsetY === 'number' ? value.offsetY : undefined
  const blur = typeof value.blur === 'number' ? value.blur : undefined

  if (color === undefined && offsetX === undefined && offsetY === undefined && blur === undefined) {
    return undefined
  }

  return {
    color,
    offsetX,
    offsetY,
    blur,
  }
}

/**
 * Reads one optional paragraph style payload from unknown text-run style data.
 * @param style Unknown text style payload.
 */
export function readRunParagraphStyle(style: unknown) {
  if (!style || typeof style !== 'object') {
    return undefined
  }

  const value = style as {
    paragraphIndentLeft?: unknown
    paragraphIndentFirst?: unknown
    paragraphIndentRight?: unknown
    paragraphSpaceBeforeLine?: unknown
    paragraphSpaceAfterLine?: unknown
  }

  const paragraphIndentLeft = typeof value.paragraphIndentLeft === 'number' ? value.paragraphIndentLeft : undefined
  const paragraphIndentFirst = typeof value.paragraphIndentFirst === 'number' ? value.paragraphIndentFirst : undefined
  const paragraphIndentRight = typeof value.paragraphIndentRight === 'number' ? value.paragraphIndentRight : undefined
  const paragraphSpaceBeforeLine = typeof value.paragraphSpaceBeforeLine === 'number' ? value.paragraphSpaceBeforeLine : undefined
  const paragraphSpaceAfterLine = typeof value.paragraphSpaceAfterLine === 'number' ? value.paragraphSpaceAfterLine : undefined

  if (
    paragraphIndentLeft === undefined &&
    paragraphIndentFirst === undefined &&
    paragraphIndentRight === undefined &&
    paragraphSpaceBeforeLine === undefined &&
    paragraphSpaceAfterLine === undefined
  ) {
    return undefined
  }

  return {
    paragraphIndentLeft,
    paragraphIndentFirst,
    paragraphIndentRight,
    paragraphSpaceBeforeLine,
    paragraphSpaceAfterLine,
  }
}
