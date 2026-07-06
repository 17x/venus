import type {
  EngineTextNode,
  EngineTextRun,
  EngineTextStyle,
} from '../../scene/types/types.ts'

interface TextLineLayout {
  lineHeight: number
  segments: readonly EngineTextRun[]
}

const LINE_BREAK_CHAR_CODE = 10
const TEXT_ALIGN_CENTER_DIVISOR = 2
const DEFAULT_FONT_WEIGHT = 400
/** When true, empty trailing lines from width-break processing are dropped. */
const STRIP_TRAILING_EMPTY_LINES = true

export interface Canvas2DTextCounters {
  singleLineTextFastPathCount: number
  precomputedTextLineHeightCount: number
}

/**
 * Handles drawTextNode.
 * @param context Rendering context.
 * @param node Target node.
 * @param localRect localRect parameter.
 * @param counters counters parameter.
 */
export function drawTextNode(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  node: EngineTextNode,
  localRect: {x: number; y: number; width: number; height: number} | null,
  counters: Canvas2DTextCounters,
) {
  context.textBaseline = 'top'
  const defaultLineHeight = node.style.lineHeight ?? node.style.fontSize
  const originX = resolveTextAnchorX(node, localRect)
  const lineLayouts = resolveTextLineLayouts(node, counters, context)
  const totalHeight = lineLayouts.reduce((sum, line) => sum + line.lineHeight, 0)
  const originY = resolveTextAnchorY(node, localRect, totalHeight)

  // Resolve the vertical clip boundary when node.height constrains the text box.
  // Lines whose top edge falls beyond this boundary are not drawn.
  const boxHeight = localRect?.height ?? node.height
  const clipBottom = boxHeight != null && boxHeight > 0
    ? originY + boxHeight
    : Number.POSITIVE_INFINITY

  let cursorY = originY
  for (const line of lineLayouts) {
    // Skip lines that start at or beyond the clip bottom (height overflow).
    if (cursorY >= clipBottom) {
      break
    }

    let cursorX = originX
    const baselineY = cursorY
    for (const segment of line.segments) {
      const segmentStyle: EngineTextStyle = {
        ...node.style,
        ...segment.style,
      }

      applyTextStyle(context, segmentStyle)
      const segmentShadow = segment.style?.shadow
      if (segmentShadow) {
        applyTextShadow(context, segmentShadow)
      }

      cursorX = drawTextSpan(context, segment.text, cursorX, baselineY, {
        fill: segment.style?.fill ?? node.style.fill,
        stroke: segment.style?.stroke ?? node.style.stroke,
        strokeWidth: segment.style?.strokeWidth ?? node.style.strokeWidth,
        letterSpacing: segment.style?.letterSpacing ?? node.style.letterSpacing,
      })

      if (segmentShadow) {
        resetTextShadow(context)
      }
    }

    cursorY += line.lineHeight || defaultLineHeight
  }
}

/**
 * Handles resolveTextLineLayouts.
 * @param node Target node.
 * @param counters counters parameter.
 * @param context Rendering context for width measurement.
 */
function resolveTextLineLayouts(
  node: EngineTextNode,
  counters: Canvas2DTextCounters,
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
) {
  const hasExplicitLineBreak = hasNodeExplicitLineBreak(node)

  // Trust single-line fast path only when content really has no line breaks
  // AND no width-constrained wrapping is active.
  const effectiveWrap = resolveEffectiveWrap(node)
  const canUseFastPath =
    node.lineCount === 1 &&
    !hasExplicitLineBreak &&
    (effectiveWrap === 'none' || !node.width || node.width <= 0)

  if (canUseFastPath) {
    counters.singleLineTextFastPathCount += 1
    if (node.runs && node.runs.length > 0) {
      const lineHeight = node.maxLineHeight ?? resolveMaxRunLineHeight(node)
      if (node.maxLineHeight) {
        counters.precomputedTextLineHeightCount += 1
      }

      return [{
        lineHeight,
        segments: node.runs,
      }]
    }

    const lineHeight = node.style.lineHeight ?? node.style.fontSize
    return [{lineHeight, segments: [{text: node.text ?? '', style: undefined}]}]
  }

  // Build lines by \n splitting
  let lines: TextLineLayout[]
  if (node.runs && node.runs.length > 0) {
    lines = splitRunLines(node)
  } else {
    const lineHeight = node.style.lineHeight ?? node.style.fontSize
    const content = node.text ?? ''
    lines = []

    scanTextLines(content, (line) => {
      lines.push({
        lineHeight,
        segments: [{text: line, style: undefined}],
      })
    })
  }

  // Apply width-constrained word/char wrapping when node.width is set
  if (effectiveWrap !== 'none' && node.width && node.width > 0) {
    lines = applyWidthBreaks(lines, node, context)
  }

  return lines
}

/**
 * Handles hasNodeExplicitLineBreak.
 * @param node Target node.
 */
function hasNodeExplicitLineBreak(node: EngineTextNode) {
  if ((node.text ?? '').includes('\n')) {
    return true
  }

  return (node.runs ?? []).some((run) => run.text.includes('\n'))
}

/**
 * Handles resolveMaxRunLineHeight.
 * @param node Target node.
 */
function resolveMaxRunLineHeight(node: EngineTextNode) {
  const defaultLineHeight = node.style.lineHeight ?? node.style.fontSize
  return (node.runs ?? []).reduce((maxLineHeight, run) => {
    return Math.max(maxLineHeight, run.style?.lineHeight ?? defaultLineHeight)
  }, defaultLineHeight)
}

/**
 * Handles splitRunLines.
 * @param node Target node.
 */
function splitRunLines(node: EngineTextNode) {
  const defaultLineHeight = node.style.lineHeight ?? node.style.fontSize
  const lines: Array<{lineHeight: number; segments: EngineTextRun[]}> = [
    {
      lineHeight: defaultLineHeight,
      segments: [],
    },
  ]

  for (const run of node.runs ?? []) {
    const runLineHeight = run.style?.lineHeight ?? defaultLineHeight

    scanTextLines(run.text, (part, isLineBreak) => {
      const currentLine = lines[lines.length - 1]
      if (part.length > 0 || currentLine.segments.length === 0) {
        currentLine.segments.push({
          text: part,
          style: run.style,
        })
      }
      currentLine.lineHeight = Math.max(currentLine.lineHeight, runLineHeight)

      if (isLineBreak) {
        lines.push({
          lineHeight: defaultLineHeight,
          segments: [],
        })
      }
    })
  }

  return lines
}

/**
 * Handles scanTextLines.
 * @param text Text content.
 * @param visit visit parameter.
 */
function scanTextLines(
  text: string,
  visit: (part: string, isLineBreak: boolean) => void,
) {
  let start = 0

  for (let index = 0; index < text.length; index += 1) {
    if (text.charCodeAt(index) !== LINE_BREAK_CHAR_CODE) {
      continue
    }

    visit(text.slice(start, index), true)
    start = index + 1
  }

  visit(text.slice(start), false)
}

/**
 * Resolves the effective wrap mode for a text node.
 *
 * When `node.wrap` is explicitly set, use it. When `node.width` is defined
 * but `wrap` is unspecified, default to 'word' wrapping so text boxes with
 * explicit width behave as expected. Text without an explicit width stays
 * unwrapped (backward-compatible).
 *
 * @param node Target text node.
 */
function resolveEffectiveWrap(node: EngineTextNode): 'none' | 'word' | 'char' {
  if (node.wrap) {
    return node.wrap
  }
  // Default: wrap when width is explicitly set, otherwise no wrapping.
  if (node.width != null && node.width > 0) {
    return 'word'
  }
  return 'none'
}

/**
 * Measures the total width of a text segment with the given style applied
 * to the context. Restores the context font afterward.
 *
 * @param context Rendering context.
 * @param text The text to measure.
 * @param node The text node (for base style).
 * @param segmentStyle Optional per-segment style override.
 * @returns The measured width in pixels.
 */
function measureSegmentWidth(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  text: string,
  node: EngineTextNode,
  segmentStyle?: Partial<EngineTextStyle>,
): number {
  if (text.length === 0) return 0

  const style: EngineTextStyle = { ...node.style, ...segmentStyle }
  applyTextStyle(context, style)

  let width = context.measureText(text).width

  // Add letter spacing between chars (excludes the last char's trailing spacing)
  const ls = segmentStyle?.letterSpacing ?? node.style.letterSpacing ?? 0
  if (ls !== 0 && text.length > 1) {
    width += ls * (text.length - 1)
  }

  return width
}

/**
 * Applies width-constrained line breaking to lines already split by \\n.
 *
 * For each line, measures its segments and when the accumulated width
 * exceeds `node.width`, breaks at the appropriate point:
 * - 'word': breaks at the last space before overflow
 * - 'char': breaks right before the overflowing character
 *
 * Style is applied per-segment so mixed-style runs are measured correctly.
 *
 * @param lines Lines from \\n splitting.
 * @param node The text node (provides width, wrap, base style).
 * @param context Rendering context for measurement.
 * @returns New line array with width breaks applied.
 */
function applyWidthBreaks(
  lines: TextLineLayout[],
  node: EngineTextNode,
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
): TextLineLayout[] {
  const maxWidth = node.width ?? 0
  if (maxWidth <= 0) return lines

  const wrapMode = resolveEffectiveWrap(node)
  const result: TextLineLayout[] = []

  for (const line of lines) {
    // Build a flat list of measured segments for this line
    const measured: Array<{
      text: string
      style: Partial<EngineTextStyle> | undefined
      width: number
    }> = []

    for (const seg of line.segments) {
      const w = measureSegmentWidth(context, seg.text, node, seg.style)
      measured.push({ text: seg.text, style: seg.style, width: w })
    }

    if (measured.length === 0) {
      result.push(line)
      continue
    }

    // Greedy width-fitting: accumulate segments until overflow, then break
    let currentSegs: EngineTextRun[] = []
    let currentWidth = 0
    let currentMaxLineHeight = line.lineHeight

    for (const m of measured) {
      // If this single segment already exceeds maxWidth (e.g., a very long word
      // or CJK string), we need to break it character-by-character.
      if (currentWidth === 0 && m.width > maxWidth && wrapMode !== 'none') {
        const broken = breakLongSegment(m, node, context, maxWidth, wrapMode)
        // Push all broken pieces as individual lines except the last one,
        // which becomes the start of the current accumulating line.
        for (let bi = 0; bi < broken.length - 1; bi++) {
          result.push({
            lineHeight: currentMaxLineHeight,
            segments: [broken[bi]],
          })
        }
        const last = broken[broken.length - 1]
        currentSegs = [last]
        currentWidth = measureSegmentWidth(context, last.text, node, last.style)
        currentMaxLineHeight = Math.max(
          currentMaxLineHeight,
          last.style?.lineHeight ?? node.style.lineHeight ?? node.style.fontSize,
        )
        continue
      }

      const nextWidth = currentWidth + m.width

      if (nextWidth > maxWidth && currentWidth > 0) {
        // Emit current line and start a new one with this segment
        result.push({
          lineHeight: currentMaxLineHeight,
          segments: currentSegs,
        })
        currentSegs = [{ text: m.text, style: m.style }]
        currentWidth = m.width
        currentMaxLineHeight = m.style?.lineHeight ?? node.style.lineHeight ?? node.style.fontSize
      } else {
        currentSegs.push({ text: m.text, style: m.style })
        currentWidth = nextWidth
        currentMaxLineHeight = Math.max(
          currentMaxLineHeight,
          m.style?.lineHeight ?? node.style.lineHeight ?? node.style.fontSize,
        )
      }
    }

    // Emit remaining segments
    if (currentSegs.length > 0) {
      result.push({
        lineHeight: currentMaxLineHeight,
        segments: currentSegs,
      })
    }
  }

  return result
}

/**
 * Breaks a single segment that exceeds maxWidth into character-level pieces.
 *
 * Used when a single text segment (no spaces) is wider than the available
 * width — e.g., a long CJK string or an unbreakable word in 'char' mode.
 * In 'word' mode, the segment is kept intact (may overflow).
 *
 * @param m The measured segment to break.
 * @param node The text node.
 * @param context Rendering context.
 * @param maxWidth Available width.
 * @param wrapMode The wrapping strategy.
 * @returns Array of broken segments.
 */
function breakLongSegment(
  m: { text: string; style: Partial<EngineTextStyle> | undefined; width: number },
  node: EngineTextNode,
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  maxWidth: number,
  wrapMode: 'word' | 'char',
): EngineTextRun[] {
  if (wrapMode === 'word') {
    // Word mode: don't break mid-word; keep intact even if it overflows.
    return [{ text: m.text, style: m.style }]
  }

  // Char mode: break character by character
  const pieces: EngineTextRun[] = []
  let pieceStart = 0
  let pieceWidth = 0

  for (let i = 0; i < m.text.length; i++) {
    const char = m.text[i]
    const charWidth = measureSegmentWidth(context, char, node, m.style)

    if (pieceWidth + charWidth > maxWidth && pieceWidth > 0) {
      pieces.push({ text: m.text.slice(pieceStart, i), style: m.style })
      pieceStart = i
      pieceWidth = charWidth
    } else {
      pieceWidth += charWidth
    }
  }

  // Emit the last piece
  if (pieceStart < m.text.length) {
    pieces.push({ text: m.text.slice(pieceStart), style: m.style })
  }

  return pieces.length > 0 ? pieces : [{ text: m.text, style: m.style }]
}

/**
 * Handles resolveTextAnchorX.
 * @param node Target node.
 * @param localRect localRect parameter.
 */
function resolveTextAnchorX(
  node: EngineTextNode,
  localRect: {x: number; y: number; width: number; height: number} | null,
) {
  const x = localRect?.x ?? node.x
  const width = localRect?.width ?? node.width
  if (!width) {
    return x
  }
  if (node.style.align === 'center') {
    return x + width / TEXT_ALIGN_CENTER_DIVISOR
  }
  if (node.style.align === 'end') {
    return x + width
  }
  return x
}

/**
 * Handles resolveTextAnchorY.
 * @param node Target node.
 * @param localRect localRect parameter.
 * @param lineHeight lineHeight parameter.
 */
function resolveTextAnchorY(
  node: EngineTextNode,
  localRect: {x: number; y: number; width: number; height: number} | null,
  lineHeight: number,
) {
  const y = localRect?.y ?? node.y
  const height = localRect?.height ?? node.height
  if (!height) {
    return y
  }

  if (node.style.verticalAlign === 'middle') {
    return y + (height - lineHeight) / TEXT_ALIGN_CENTER_DIVISOR
  }
  if (node.style.verticalAlign === 'bottom') {
    return y + height - lineHeight
  }
  return y
}

/**
 * Handles drawTextSpan.
 * @param context Rendering context.
 * @param text Text content.
 * @param x x parameter.
 * @param y y parameter.
 * @param options Options object for this operation.
 */
function drawTextSpan(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options: {
    fill?: string
    stroke?: string
    strokeWidth?: number
    letterSpacing?: number
  },
) {
  const letterSpacing = options.letterSpacing ?? 0
  if (letterSpacing === 0) {
    if (options.fill && options.fill !== 'transparent') {
      context.fillText(text, x, y)
    }
    if (options.stroke && options.strokeWidth && options.strokeWidth > 0) {
      context.strokeStyle = options.stroke
      context.lineWidth = options.strokeWidth
      context.strokeText(text, x, y)
    }
    return x + context.measureText(text).width
  }

  let cursorX = x
  for (const char of text) {
    if (options.fill && options.fill !== 'transparent') {
      context.fillText(char, cursorX, y)
    }
    if (options.stroke && options.strokeWidth && options.strokeWidth > 0) {
      context.strokeStyle = options.stroke
      context.lineWidth = options.strokeWidth
      context.strokeText(char, cursorX, y)
    }
    cursorX += context.measureText(char).width + letterSpacing
  }
  return cursorX
}

/**
 * Handles applyTextStyle.
 * @param context Rendering context.
 * @param style Style configuration.
 */
function applyTextStyle(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  style: EngineTextStyle,
) {
  const fontWeight = style.fontWeight ?? DEFAULT_FONT_WEIGHT
  const fontStyle = style.fontStyle ?? 'normal'
  context.font = `${fontStyle} ${fontWeight} ${style.fontSize}px ${style.fontFamily}`
  context.fillStyle = style.fill ?? '#111111'
  context.textAlign = resolveCanvasTextAlign(style.align)
}

/**
 * Handles applyTextShadow.
 * @param context Rendering context.
 * @param shadow shadow parameter.
 */
function applyTextShadow(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  shadow: NonNullable<EngineTextStyle['shadow']>,
) {
  context.shadowColor = shadow.color ?? 'rgba(0,0,0,0)'
  context.shadowBlur = shadow.blur ?? 0
  context.shadowOffsetX = shadow.offsetX ?? 0
  context.shadowOffsetY = shadow.offsetY ?? 0
}

/**
 * Handles resetTextShadow.
 * @param context Rendering context.
 */
function resetTextShadow(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
) {
  // Reset per-run shadow state so later segments do not inherit stale effects.
  context.shadowColor = 'rgba(0,0,0,0)'
  context.shadowBlur = 0
  context.shadowOffsetX = 0
  context.shadowOffsetY = 0
}

/**
 * Handles resolveCanvasTextAlign.
 * @param align align parameter.
 */
function resolveCanvasTextAlign(
  align: EngineTextStyle['align'],
): CanvasTextAlign {
  switch (align) {
    case 'center':
      return 'center'
    case 'end':
      return 'right'
    case 'start':
    default:
      return 'left'
  }
}
