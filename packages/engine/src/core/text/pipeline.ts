/**
 * Text layout pipeline orchestrator.
 *
 * Composes the 13-stage text layout pipeline:
 *   1.  Input: TextParagraph
 *   2.  Parse Unicode: text → grapheme clusters
 *   3.  Segment Text Runs: clusters → runs (style/script/direction)
 *   4.  Font Resolve: match font-family → real font
 *   5.  Font Fallback: missing glyphs → fallback fonts
 *   6.  Re-segment: new runs for fallback font boundaries
 *   7.  Shape: characters → glyphs (advances, kerning, OpenType)
 *   8.  Generate Glyph Runs: glyphs + font + metadata
 *   9.  Measure Width: accumulate advances/kerning/spacing
 *  10.  Line Break: break lines at paragraph width
 *  11.  Compute Line Height: ascent/descent/baseline per line
 *  12.  Compute Glyph Positions: final x/y for each glyph
 *  13.  Render: output ready for Canvas2D / WebGL
 *
 * The pipeline accepts a TextParagraph and optional configuration,
 * and returns a TextLayoutResult with all intermediate data plus
 * final positioned glyphs.
 */

import type {
  TextParagraph,
  TextPipelineConfig,
  TextLayoutResult,
  TextRun,
  GlyphRun,
  ShapedLine,
  FontRegistry,
  FontMatch,
  ResolvedTextStyle,
} from './types.ts'
import {
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_SIZE,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_DIRECTION,
  TEXT_WIDTH_ESTIMATE_MULTIPLIER,
} from './types.ts'

import { parseGraphemeClusters } from './unicode.ts'
import { segmentTextRuns } from './textRun.ts'
import {
  createFontRegistry,
  resolveFontForRun,
  getApproximateMetrics,
} from './fontResolver.ts'
import {
  shapeRunWithKerning,
  createGlyphRun,
  estimateTextWidth,
} from './shaper.ts'
import {
  breakLines,
} from './lineBreak.ts'
import {
  computeLineMetrics,
  computeGlyphPositions,
} from './lineLayout.ts'

// ── Pipeline ─────────────────────────────────────────────────────────────────

/**
 * Default pipeline configuration.
 */
const DEFAULT_CONFIG: Required<TextPipelineConfig> = {
  fontRegistry: undefined as unknown as FontRegistry,
  defaultFontFamily: DEFAULT_FONT_FAMILY,
  defaultFontSize: DEFAULT_FONT_SIZE,
  defaultLineHeight: DEFAULT_LINE_HEIGHT,
  defaultDirection: DEFAULT_DIRECTION,
  useBrowserShaping: true,
}

/**
 * Runs the complete 13-stage text layout pipeline.
 *
 * This is the primary entry point for text layout. It takes a paragraph
 * description and produces a full layout result with glyph positions
 * ready for rendering.
 *
 * @param paragraph The input paragraph to lay out.
 * @param config Optional pipeline configuration.
 * @returns Complete text layout result.
 */
export function layoutText(
  paragraph: TextParagraph,
  config?: TextPipelineConfig,
): TextLayoutResult {
  const cfg = resolveConfig(config)

  // ── Stage 1: Input ───────────────────────────────────────────────────
  // (paragraph is already the input)

  // ── Stage 2: Parse Unicode ────────────────────────────────────────────
  const clusters = parseGraphemeClusters(paragraph.text)

  // ── Stage 3: Segment Text Runs ────────────────────────────────────────
  const initialRuns = segmentTextRuns(paragraph, clusters)

  // ── Stage 4: Font Resolve ─────────────────────────────────────────────
  // Resolve fonts for each run using the registry
  const runFonts = initialRuns.map((run) =>
    resolveFontForRun(cfg.fontRegistry, run.style),
  )

  // ── Stage 5: Font Fallback ────────────────────────────────────────────
  // AI-TEMP: Font fallback re-segmentation is deferred. The browser
  // shaper handles fallback natively through Canvas2D, and the engine's
  // font resolution maps to available system fonts. Full per-character
  // fallback requires font cmap access (browser FontFace API or WASM).
  // For now, treat the primary font match as authoritative.
  const runs = initialRuns

  // ── Stage 6: Re-segment (after fallback) ──────────────────────────────
  // (Deferred — see Stage 5 note)

  // ── Stage 7: Shape ────────────────────────────────────────────────────
  // Shape each run into glyphs using browser-based shaping
  const allGlyphRuns: GlyphRun[] = []

  for (let i = 0; i < runs.length; i++) {
    const run = runs[i]
    const font = runFonts[i]

    // Use kerning-aware browser shaping
    const glyphs = cfg.useBrowserShaping
      ? shapeRunWithKerning(run, font)
      : shapeRunWithKerning(run, font) // Always use browser for now

    // ── Stage 8: Generate Glyph Run ───────────────────────────────────
    const glyphRun = createGlyphRun(font, run, glyphs)
    allGlyphRuns.push(glyphRun)
  }

  // ── Stage 9: Measure ──────────────────────────────────────────────────
  // (Measurement is inherent in glyph advances — no separate pass needed)

  // ── Stage 10: Line Break ──────────────────────────────────────────────
  const wrapMode = paragraph.wrap ?? 'word'
  const lines = breakLines(allGlyphRuns, paragraph.width, wrapMode)

  // ── Stage 11: Compute Line Height ─────────────────────────────────────
  const lineHeightMultiplier = paragraph.lineHeight ?? cfg.defaultLineHeight
  const lineMetrics = computeLineMetrics(lines, lineHeightMultiplier)

  // ── Stage 12: Compute Glyph Positions ─────────────────────────────────
  const totalHeight = lineMetrics.reduce((sum, m) => sum + m.height, 0)
  const positionedGlyphs = computeGlyphPositions(
    lineMetrics,
    paragraph.width,
    paragraph.align ?? 'start',
    paragraph.verticalAlign ?? 'top',
    totalHeight,
  )

  // ── Compute bounds ────────────────────────────────────────────────────
  const maxLineWidth = lines.reduce((max, l) => Math.max(max, l.width), 0)
  const bounds = {
    x: 0,
    y: 0,
    width: paragraph.width || maxLineWidth,
    height: totalHeight,
  }

  // Compute max line height across all lines
  const maxLineHeight = lineMetrics.reduce(
    (max, m) => Math.max(max, m.height),
    0,
  )

  // Estimated width for quick bounds checks
  const estimatedWidth = estimateTextWidth(
    paragraph.text,
    cfg.defaultFontSize,
  )

  // ── Stage 13: Result ──────────────────────────────────────────────────
  return {
    lines,
    lineMetrics,
    positionedGlyphs,
    bounds,
    lineCount: lines.length,
    maxLineHeight,
    estimatedWidth,
  }
}

/**
 * Quick layout that only computes line breaks and metrics without full
 * glyph positioning. Useful for bounds estimation and hit-testing where
 * individual glyph positions are not needed.
 *
 * @param paragraph The input paragraph.
 * @param config Optional pipeline configuration.
 * @returns A partial result with lines and line metrics only.
 */
export function layoutTextLines(
  paragraph: TextParagraph,
  config?: TextPipelineConfig,
): Pick<TextLayoutResult, 'lines' | 'lineMetrics' | 'lineCount' | 'maxLineHeight' | 'estimatedWidth' | 'bounds'> {
  const cfg = resolveConfig(config)

  const clusters = parseGraphemeClusters(paragraph.text)
  const initialRuns = segmentTextRuns(paragraph, clusters)
  const runFonts = initialRuns.map((run) =>
    resolveFontForRun(cfg.fontRegistry, run.style),
  )

  const allGlyphRuns: GlyphRun[] = []
  for (let i = 0; i < initialRuns.length; i++) {
    const glyphs = shapeRunWithKerning(initialRuns[i], runFonts[i])
    allGlyphRuns.push(createGlyphRun(runFonts[i], initialRuns[i], glyphs))
  }

  const wrapMode = paragraph.wrap ?? 'word'
  const lines = breakLines(allGlyphRuns, paragraph.width, wrapMode)

  const lineHeightMultiplier = paragraph.lineHeight ?? cfg.defaultLineHeight
  const lineMetrics = computeLineMetrics(lines, lineHeightMultiplier)

  const maxLineWidth = lines.reduce((max, l) => Math.max(max, l.width), 0)
  const totalHeight = lineMetrics.reduce((sum, m) => sum + m.height, 0)

  return {
    lines,
    lineMetrics,
    lineCount: lines.length,
    maxLineHeight: lineMetrics.reduce((max, m) => Math.max(max, m.height), 0),
    estimatedWidth: estimateTextWidth(paragraph.text, cfg.defaultFontSize),
    bounds: {
      x: 0,
      y: 0,
      width: paragraph.width || maxLineWidth,
      height: totalHeight,
    },
  }
}

/**
 * Resolves pipeline configuration by merging with defaults.
 * @param config User-provided configuration (optional).
 * @returns Fully resolved configuration.
 */
function resolveConfig(config?: TextPipelineConfig): Required<TextPipelineConfig> {
  return {
    fontRegistry: config?.fontRegistry ?? DEFAULT_CONFIG.fontRegistry,
    defaultFontFamily: config?.defaultFontFamily ?? DEFAULT_CONFIG.defaultFontFamily,
    defaultFontSize: config?.defaultFontSize ?? DEFAULT_CONFIG.defaultFontSize,
    defaultLineHeight: config?.defaultLineHeight ?? DEFAULT_CONFIG.defaultLineHeight,
    defaultDirection: config?.defaultDirection ?? DEFAULT_CONFIG.defaultDirection,
    useBrowserShaping: config?.useBrowserShaping ?? DEFAULT_CONFIG.useBrowserShaping,
  }
}

// ── Re-exports for convenience ───────────────────────────────────────────────

export { parseGraphemeClusters } from './unicode.ts'
export { segmentTextRuns, classifyCodePoint, classifyScript, classifyDirection, resolveCharStyle } from './textRun.ts'
export { createFontRegistry, resolveFontForRun, getApproximateMetrics } from './fontResolver.ts'
export { shapeRunBrowser, shapeRunWithKerning, createGlyphRun, measureTextRun, measureGlyphRun, estimateTextWidth } from './shaper.ts'
export { breakLines } from './lineBreak.ts'
export { computeLineMetrics, computeGlyphPositions } from './lineLayout.ts'
