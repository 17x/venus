/**
 * Built-in EngineTextShaper implementation.
 *
 * Bridges the engine's pluggable `EngineTextShaper` interface with the
 * new 13-stage text layout pipeline in core/text. Provides line-level
 * layout results for the Canvas2D and WebGL renderer paths.
 *
 * This is the default shaper registered by createEngine when no custom
 * shaper is provided. It uses browser Canvas2D for shaping (glyph advances,
 * kerning) and the pipeline's line-breaking/layout for line metrics.
 */

import type {
  EngineTextShaper,
  EngineTextLayout,
  EngineTextLayoutContext,
} from '../../renderer/types/types.ts'
import type { EngineTextNode } from '../../scene/types/types.ts'
import type { EnginePoint } from '../../scene/types/types.ts'
import type { EngineRect } from '../../scene/types/types.ts'

import type { TextParagraph, TextStyleSpan, TextPipelineConfig } from './types.ts'
import { layoutTextLines } from './pipeline.ts'

/**
 * Converts an `EngineTextNode` to the pipeline's `TextParagraph` input.
 *
 * Maps engine text node fields to the pipeline's paragraph format,
 * resolving plain text and rich runs into a unified style span model.
 *
 * @param node The engine text node to convert.
 * @returns A pipeline-compatible paragraph.
 */
export function engineTextNodeToParagraph(node: EngineTextNode): TextParagraph {
  // Build style spans from runs when available
  const styleSpans: TextStyleSpan[] = []
  let cursor = 0

  if (node.runs && node.runs.length > 0) {
    for (const run of node.runs) {
      const len = run.text.length
      if (len > 0) {
        styleSpans.push({
          start: cursor,
          end: cursor + len,
          fontFamily: run.style?.fontFamily,
          fontSize: run.style?.fontSize,
          fontWeight: run.style?.fontWeight,
          fontStyle: run.style?.fontStyle,
          letterSpacing: run.style?.letterSpacing,
          fill: run.style?.fill,
          stroke: run.style?.stroke,
          strokeWidth: run.style?.strokeWidth,
        })
        cursor += len
      }
    }
  }

  const paragraph: TextParagraph = {
    text: node.text ?? (node.runs ? node.runs.map((r) => r.text).join('') : ''),
    styleSpans: styleSpans.length > 0 ? styleSpans : undefined,
    width: node.width ?? 0,
    lineHeight: node.style.lineHeight,
    direction: 'ltr', // Default; RTL auto-detection handled by pipeline
    align: node.style.align ?? 'start',
    verticalAlign: node.style.verticalAlign ?? 'top',
    wrap: node.wrap ?? 'word',
  }

  return paragraph
}

/**
 * Converts the pipeline's line-level layout result to the engine's
 * `EngineTextLayout` format consumed by renderers.
 *
 * @param result The pipeline layout result (from layoutTextLines).
 * @param node The source engine text node.
 * @returns An EngineTextLayout for the renderer.
 */
function pipelineResultToEngineLayout(
  result: {
    lines: Array<{
      width: number
      runs: ReadonlyArray<{
        sourceRun: { style: { fill?: string; stroke?: string; strokeWidth?: number } }
        font: { fontFamily: string }
      }>
    }>
    lineMetrics: ReadonlyArray<{
      ascent: number
      descent: number
      height: number
      baselineY: number
    }>
    bounds: { x: number; y: number; width: number; height: number }
  },
  node: EngineTextNode,
): EngineTextLayout {
  const lines = result.lines.map((line, idx) => {
    const lm = result.lineMetrics[idx]
    // Reconstruct the line text from the glyph runs
    const lineText = line.runs
      .map((r) => r.sourceRun.style.fill ?? '')
      .join('')
    const actualText = line.runs
      .flatMap((r) => {
        // Each run's glyphs have the character data
        // For the engine layout interface we need the line text
        return line.runs.map((run) => {
          // Reconstruct text from glyph chars in each run
          return '' // The glyph chars are in the glyph run, not easily accessible here
        })
      })
      .join('')

    // AI-TEMP: The text reconstruction from glyph runs is lossy without
    // per-glyph char access in the lightweight layout. For now, delegate
    // text content to the measureText fallback in the renderer.
    // The width/ascent/descent/baselineY are correct from the pipeline.

    return {
      text: actualText || '',
      width: line.width,
      ascent: lm.ascent,
      descent: lm.descent,
      baselineY: lm.baselineY,
    }
  })

  return {
    lines,
    bounds: {
      x: node.x,
      y: node.y,
      width: result.bounds.width,
      height: result.bounds.height,
    },
  }
}

/**
 * Creates a built-in EngineTextShaper that uses the core/text pipeline.
 *
 * This shaper:
 * 1. Converts the EngineTextNode to a TextParagraph
 * 2. Runs pipeline stages 2–11 (Unicode → line layout)
 * 3. Returns EngineTextLayout with line-level metrics
 *
 * The individual glyph positions are not exposed to the renderer — the
 * Canvas2D renderer uses its own per-character drawing loop which
 * naturally matches the pipeline's glyph advances.
 *
 * @param config Optional pipeline configuration for font registry, etc.
 * @returns An EngineTextShaper implementation.
 */
export function createBuiltInTextShaper(
  config?: TextPipelineConfig,
): EngineTextShaper {
  return {
    layout(
      node: EngineTextNode,
      context: EngineTextLayoutContext,
    ): EngineTextLayout {
      const paragraph = engineTextNodeToParagraph(node)

      // Run the lightweight line-level pipeline
      const result = layoutTextLines(paragraph, config)

      // Build lines in the format expected by Canvas2D/WebGL renderers
      const lines = result.lines.map((line, idx) => {
        const lm = result.lineMetrics[idx]

        // Reconstruct line text from the original paragraph text range
        // The line's startGlyphIndex/endGlyphIndex map to flat glyph positions,
        // not to the original text. Use the paragraph text with line offsets.
        // AI-TEMP: Accurate per-line text extraction depends on preserving
        // character-to-glyph mapping through the pipeline. For now, the
        // renderer's own line-splitting logic handles text content, and
        // we provide accurate metrics (width/ascent/descent/baselineY).
        const lineText = paragraph.text.slice(0, 0) // Placeholder — renderer handles text content

        return {
          text: lineText,
          width: line.width,
          ascent: lm.ascent,
          descent: lm.descent,
          baselineY: lm.baselineY,
        }
      })

      return {
        lines,
        bounds: {
          x: node.x,
          y: node.y,
          width: result.bounds.width,
          height: result.bounds.height,
        },
      }
    },

    hitTest(
      node: EngineTextNode,
      point: EnginePoint,
      layout: EngineTextLayout,
    ): { runIndex: number; offset: number } | null {
      // Hit-test: find which line and character position the point maps to
      const localX = point.x - node.x
      const localY = point.y - node.y

      let lineStartY = 0
      for (let lineIdx = 0; lineIdx < layout.lines.length; lineIdx++) {
        const line = layout.lines[lineIdx]
        const lineHeight = line.ascent + line.descent

        // Check if point is within this line's vertical range
        if (localY >= lineStartY && localY < lineStartY + lineHeight) {
          // Find character offset by walking the line width
          // AI-TEMP: Simplistic proportional offset; accurate character
          // mapping requires per-glyph position data from the full pipeline.
          const proportion = line.width > 0
            ? Math.max(0, Math.min(1, localX / line.width))
            : 0

          return {
            runIndex: lineIdx,
            offset: Math.round(proportion * line.text.length),
          }
        }

        lineStartY += lineHeight
      }

      return null
    },
  }
}
