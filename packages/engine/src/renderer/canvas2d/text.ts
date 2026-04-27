import type {
  EngineTextNode,
  EngineTextRun,
  EngineTextStyle,
} from '../../scene/types.ts'

interface TextLineLayout {
  lineHeight: number
  segments: readonly EngineTextRun[]
}

export interface Canvas2DTextCounters {
  singleLineTextFastPathCount: number
  precomputedTextLineHeightCount: number
}

export function drawTextNode(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  node: EngineTextNode,
  localRect: {x: number; y: number; width: number; height: number} | null,
  counters: Canvas2DTextCounters,
) {
  context.textBaseline = 'top'
  const defaultLineHeight = node.style.lineHeight ?? node.style.fontSize
  const originX = resolveTextAnchorX(node, localRect)
  const lineLayouts = resolveTextLineLayouts(node, counters)
  const totalHeight = lineLayouts.reduce((sum, line) => sum + line.lineHeight, 0)
  const originY = resolveTextAnchorY(node, localRect, totalHeight)

  let cursorY = originY
  for (const line of lineLayouts) {
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

function resolveTextLineLayouts(node: EngineTextNode, counters: Canvas2DTextCounters) {
  if (node.lineCount === 1) {
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

  if (node.runs && node.runs.length > 0) {
    return splitRunLines(node)
  }

  const lineHeight = node.style.lineHeight ?? node.style.fontSize
  const content = node.text ?? ''
  const lines: TextLineLayout[] = []

  scanTextLines(content, (line) => {
    lines.push({
      lineHeight,
      segments: [{text: line, style: undefined}],
    })
  })

  return lines
}

function resolveMaxRunLineHeight(node: EngineTextNode) {
  const defaultLineHeight = node.style.lineHeight ?? node.style.fontSize
  return (node.runs ?? []).reduce((maxLineHeight, run) => {
    return Math.max(maxLineHeight, run.style?.lineHeight ?? defaultLineHeight)
  }, defaultLineHeight)
}

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

function scanTextLines(
  text: string,
  visit: (part: string, isLineBreak: boolean) => void,
) {
  let start = 0

  for (let index = 0; index < text.length; index += 1) {
    if (text.charCodeAt(index) !== 10) {
      continue
    }

    visit(text.slice(start, index), true)
    start = index + 1
  }

  visit(text.slice(start), false)
}

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
    return x + width / 2
  }
  if (node.style.align === 'end') {
    return x + width
  }
  return x
}

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
    return y + (height - lineHeight) / 2
  }
  if (node.style.verticalAlign === 'bottom') {
    return y + height - lineHeight
  }
  return y
}

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

function applyTextStyle(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  style: EngineTextStyle,
) {
  const fontWeight = style.fontWeight ?? 400
  const fontStyle = style.fontStyle ?? 'normal'
  context.font = `${fontStyle} ${fontWeight} ${style.fontSize}px ${style.fontFamily}`
  context.fillStyle = style.fill ?? '#111111'
  context.textAlign = resolveCanvasTextAlign(style.align)
}

function applyTextShadow(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  shadow: NonNullable<EngineTextStyle['shadow']>,
) {
  context.shadowColor = shadow.color ?? 'rgba(0,0,0,0)'
  context.shadowBlur = shadow.blur ?? 0
  context.shadowOffsetX = shadow.offsetX ?? 0
  context.shadowOffsetY = shadow.offsetY ?? 0
}

function resetTextShadow(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
) {
  // Reset per-run shadow state so later segments do not inherit stale effects.
  context.shadowColor = 'rgba(0,0,0,0)'
  context.shadowBlur = 0
  context.shadowOffsetX = 0
  context.shadowOffsetY = 0
}

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
