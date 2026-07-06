/**
 * Line layout: line height calculation and glyph positioning
 * (Stage 11 & Stage 12).
 *
 * Stage 11 — Line Height Calculation: computes ascent, descent, and
 * baseline for each line based on font metrics and line-height settings.
 *
 * Stage 12 — Glyph Positioning: computes final x/y positions for each
 * glyph in the paragraph, accounting for alignment and line stacking.
 */

import type {
  ShapedLine,
  LineMetrics,
  PositionedGlyph,
} from './types.ts'

/**
 * Computes line metrics for each shaped line (Stage 11).
 *
 * Calculates ascent, descent, height, and baseline Y for each line.
 * The line height is determined by the maximum of: the paragraph's
 * line-height setting × fontSize vs. the natural line height from
 * font metrics (ascent + descent + lineGap).
 *
 * @param lines Shaped lines.
 * @param lineHeightMultiplier Line height multiplier (e.g., 1.2).
 * @returns Line metrics for each line.
 */
export function computeLineMetrics(
  lines: readonly ShapedLine[],
  lineHeightMultiplier: number,
): LineMetrics[] {
  return lines.map((line) => {
    let maxAscent = 0
    let maxDescent = 0
    let maxFontSize = 0

    // Find maximum ascent/descent across all runs on this line
    for (const run of line.runs) {
      const fontSize = run.sourceRun.style.fontSize
      const metrics = run.font.metrics
      const ascent = (metrics.ascent / metrics.unitsPerEm) * fontSize
      const descent = Math.abs(metrics.descent / metrics.unitsPerEm) * fontSize

      if (ascent > maxAscent) maxAscent = ascent
      if (descent > maxDescent) maxDescent = descent
      if (fontSize > maxFontSize) maxFontSize = fontSize
    }

    // Compute line height: max(natural height, line-height × fontSize)
    const naturalHeight = maxAscent + maxDescent
    const specifiedHeight = maxFontSize * lineHeightMultiplier
    const height = Math.max(naturalHeight, specifiedHeight)

    // Distribute extra space equally above and below the natural metrics
    const extraSpace = height - naturalHeight
    const halfExtra = extraSpace / 2
    const finalAscent = maxAscent + halfExtra
    const baselineY = finalAscent

    return {
      line,
      ascent: finalAscent,
      descent: maxDescent + halfExtra,
      height,
      baselineY,
    }
  })
}

/**
 * Computes final glyph positions for all lines (Stage 12).
 *
 * Positions each glyph with its final x/y coordinates, accounting for:
 * - Line stacking (Y accumulates line heights)
 * - Horizontal alignment (start/center/end)
 * - Letter spacing between glyphs
 *
 * @param metrics Line metrics from Stage 11.
 * @param paragraphWidth The paragraph width for alignment.
 * @param align Horizontal alignment mode.
 * @param verticalAlign Vertical alignment mode.
 * @param totalHeight Total height of all lines for vertical alignment.
 * @returns All glyphs with final positions.
 */
export function computeGlyphPositions(
  metrics: readonly LineMetrics[],
  paragraphWidth: number,
  align: 'start' | 'center' | 'end',
  verticalAlign: 'top' | 'middle' | 'bottom',
  totalHeight: number,
): PositionedGlyph[] {
  const result: PositionedGlyph[] = []

  // Compute total content height for vertical alignment offset
  const contentHeight = metrics.reduce((sum, m) => sum + m.height, 0)
  let verticalOffset = 0

  if (verticalAlign === 'middle') {
    verticalOffset = (totalHeight - contentHeight) / 2
  } else if (verticalAlign === 'bottom') {
    verticalOffset = totalHeight - contentHeight
  }

  let cursorY = verticalOffset

  for (let lineIdx = 0; lineIdx < metrics.length; lineIdx++) {
    const lm = metrics[lineIdx]
    const line = lm.line

    // Compute horizontal alignment offset for this line
    const alignmentOffset = computeAlignmentOffset(line.width, paragraphWidth, align)

    let cursorX = alignmentOffset

    for (const run of line.runs) {
      const letterSpacing = run.sourceRun.style.letterSpacing

      for (let gi = 0; gi < run.glyphs.length; gi++) {
        const glyph = run.glyphs[gi]

        result.push({
          glyph,
          x: cursorX + glyph.offsetX,
          y: cursorY + lm.baselineY + glyph.offsetY,
          lineIndex: lineIdx,
          font: run.font,
          fill: run.sourceRun.style.fill,
          stroke: run.sourceRun.style.stroke,
          strokeWidth: run.sourceRun.style.strokeWidth,
        })

        cursorX += glyph.advance + (gi < run.glyphs.length - 1 ? letterSpacing : 0)
      }
    }

    cursorY += lm.height
  }

  return result
}

/**
 * Computes the horizontal offset for a line based on alignment.
 * @param lineWidth The actual width of the line's content.
 * @param paragraphWidth The paragraph box width.
 * @param align Alignment mode.
 * @returns Offset from the left edge.
 */
function computeAlignmentOffset(
  lineWidth: number,
  paragraphWidth: number,
  align: 'start' | 'center' | 'end',
): number {
  if (align === 'center') {
    return (paragraphWidth - lineWidth) / 2
  }
  if (align === 'end') {
    return paragraphWidth - lineWidth
  }
  return 0
}

/**
 * Computes the vertical offset for a single line based on vertical alignment.
 *
 * AI-TEMP: Currently unused in the main pipeline (vertical alignment is
 * applied at the paragraph level). Exported for external callers that
 * need per-line vertical alignment.
 *
 * @param lineHeight The line's total height.
 * @param lineMetrics The line's ascent/descent metrics.
 * @param availableHeight The available vertical space.
 * @param verticalAlign Vertical alignment mode.
 * @returns Y offset from the top of available space.
 */
export function computeLineVerticalOffset(
  lineHeight: number,
  lineMetrics: { ascent: number; descent: number },
  availableHeight: number,
  verticalAlign: 'top' | 'middle' | 'bottom',
): number {
  if (verticalAlign === 'middle') {
    return (availableHeight - lineHeight) / 2
  }
  if (verticalAlign === 'bottom') {
    return availableHeight - lineHeight
  }
  return 0
}
