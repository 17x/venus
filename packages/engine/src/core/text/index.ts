/**
 * Engine Text Module
 *
 * Complete 13-stage text layout pipeline for the Venus engine.
 *
 * Usage:
 *   import { layoutText, parseGraphemeClusters, estimateTextWidth } from '@venus/engine/core/text'
 *
 *   const result = layoutText({
 *     text: 'Hello, world!',
 *     width: 200,
 *     styleSpans: [{ start: 0, end: 5, fontWeight: 'bold' }],
 *   })
 *
 *   // result.positionedGlyphs → ready for rendering
 *   // result.bounds → paragraph bounding box
 *   // result.lines → shaped lines with metrics
 */

// ── Pipeline ─────────────────────────────────────────────────────────────────
export {
  layoutText,
  layoutTextLines,
} from './pipeline.ts'

// ── Stages ───────────────────────────────────────────────────────────────────
export {
  parseGraphemeClusters,
} from './unicode.ts'

export {
  segmentTextRuns,
  resegmentAfterFontFallback,
  classifyCodePoint,
  classifyScript,
  classifyDirection,
  resolveCharStyle,
} from './textRun.ts'

export {
  createFontRegistry,
  resolveFontForRun,
  getApproximateMetrics,
} from './fontResolver.ts'

export {
  shapeRunBrowser,
  shapeRunWithKerning,
  createGlyphRun,
  measureTextRun,
  measureGlyphRun,
  estimateTextWidth,
} from './shaper.ts'

export {
  breakLines,
  classifyLineBreak,
} from './lineBreak.ts'

export {
  computeLineMetrics,
  computeGlyphPositions,
  computeLineVerticalOffset,
} from './lineLayout.ts'

// ── Built-in Shaper ──────────────────────────────────────────────────────────
export {
  createBuiltInTextShaper,
  engineTextNodeToParagraph,
} from './builtInShaper.ts'

// ── Types ────────────────────────────────────────────────────────────────────
export type {
  TextParagraph,
  TextStyleSpan,
  TextDirection,
  UnicodeCluster,
  TextScript,
  TextRun,
  ResolvedTextStyle,
  FontMatch,
  FontMetrics,
  FontFaceEntry,
  FontRegistry,
  GlyphInfo,
  GlyphRun,
  ShapedLine,
  LineMetrics,
  PositionedGlyph,
  TextMeasurement,
  LineBreakClass,
  LineBreakOpportunity,
  TextLayoutResult,
  TextPipelineConfig,
} from './types.ts'

export {
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_SIZE,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_DIRECTION,
  TEXT_WIDTH_ESTIMATE_MULTIPLIER,
} from './types.ts'
