/**
 * Core text pipeline types.
 *
 * Defines the data structures that flow through the 13-stage text layout
 * pipeline: Paragraph input → Unicode parsing → run segmentation → font
 * resolution → font fallback → re-segmentation → shaping → glyph runs →
 * measurement → line breaking → line height → glyph positioning → rendering.
 */

// ── Stage 1: Input ───────────────────────────────────────────────────────────

/** Writing direction for a paragraph or text run. */
export type TextDirection = 'ltr' | 'rtl'

/** A style span associates a style descriptor with a character range. */
export interface TextStyleSpan {
  /** 0-based start index (in code units) of this span's range. */
  start: number
  /** Exclusive end index of this span's range. */
  end: number
  /** Font family name for this span. */
  fontFamily?: string
  /** Font size in logical units. */
  fontSize?: number
  /** Font weight (100–900 or 'normal'/'bold'). */
  fontWeight?: number | string
  /** Font style variant. */
  fontStyle?: 'normal' | 'italic' | 'oblique'
  /** Letter spacing in logical units. */
  letterSpacing?: number
  /** Fill color for this span. */
  fill?: string
  /** Stroke color for this span. */
  stroke?: string
  /** Stroke width for this span. */
  strokeWidth?: number
}

/** Input paragraph: the starting point of the text pipeline. */
export interface TextParagraph {
  /** Plain text content (UTF-16 code units). */
  text: string
  /** Per-range style overrides. Sorted by start, non-overlapping. */
  styleSpans?: readonly TextStyleSpan[]
  /** Paragraph width constraint for line breaking. */
  width: number
  /** Line height multiplier (1.0 = default). */
  lineHeight?: number
  /** Primary writing direction. */
  direction?: TextDirection
  /** Horizontal text alignment. */
  align?: 'start' | 'center' | 'end'
  /** Vertical text alignment within the paragraph box. */
  verticalAlign?: 'top' | 'middle' | 'bottom'
  /** Wrapping mode. */
  wrap?: 'none' | 'word' | 'char'
}

// ── Stage 2: Unicode ─────────────────────────────────────────────────────────

/** One grapheme cluster with its position in the source text. */
export interface UnicodeCluster {
  /** The grapheme cluster string (one or more code points). */
  text: string
  /** 0-based start index in the source text (code units). */
  start: number
  /** Exclusive end index in the source text (code units). */
  end: number
}

// ── Stage 3 & 6: Text Runs ───────────────────────────────────────────────────

/** Script classification for Unicode character ranges. */
export type TextScript =
  | 'common'
  | 'latin'
  | 'cyrillic'
  | 'greek'
  | 'arabic'
  | 'hebrew'
  | 'devanagari'
  | 'bengali'
  | 'gurmukhi'
  | 'gujarati'
  | 'oriya'
  | 'tamil'
  | 'telugu'
  | 'kannada'
  | 'malayalam'
  | 'thai'
  | 'lao'
  | 'tibetan'
  | 'myanmar'
  | 'georgian'
  | 'hangul'
  | 'han'
  | 'hiragana'
  | 'katakana'
  | 'bopomofo'
  | 'yi'
  | 'ethiopic'
  | 'cherokee'
  | 'canadianAboriginal'
  | 'mongolian'
  | 'sinhala'
  | 'khmer'
  | 'armenian'
  | 'syriac'
  | 'thaana'
  | 'unknown'

/** One text run: uniform style, script, and direction. */
export interface TextRun {
  /** The plain text of this run. */
  text: string
  /** 0-based start index in the original paragraph text. */
  start: number
  /** Exclusive end index in the original paragraph text. */
  end: number
  /** Uniform style for this run (resolved from paragraph + spans). */
  style: ResolvedTextStyle
  /** Resolved script classification. */
  script: TextScript
  /** Resolved writing direction. */
  direction: TextDirection
}

/** A fully resolved text style with all optional fields filled. */
export interface ResolvedTextStyle {
  fontFamily: string
  fontSize: number
  fontWeight: number | string
  fontStyle: 'normal' | 'italic' | 'oblique'
  lineHeight: number
  letterSpacing: number
  fill?: string
  stroke?: string
  strokeWidth?: number
}

// ── Stage 4 & 5: Font Resolution ─────────────────────────────────────────────

/** A resolved font match from the font registry. */
export interface FontMatch {
  /** The matched font family name. */
  fontFamily: string
  /** The original requested font family (for fallback tracking). */
  requestedFamily: string
  /** Font weight used for matching. */
  fontWeight: number | string
  /** Font style used for matching. */
  fontStyle: 'normal' | 'italic' | 'oblique'
  /** Whether this match came from the primary font or a fallback. */
  isFallback: boolean
  /** Metrics for this font at 1em size (normalized). */
  metrics: FontMetrics
}

/** Typographic metrics for a font face. */
export interface FontMetrics {
  /** Ascender height normalized to em size. */
  ascent: number
  /** Descender depth normalized to em size (typically negative). */
  descent: number
  /** Line gap normalized to em size. */
  lineGap: number
  /** Cap height normalized to em size. */
  capHeight?: number
  /** x-height normalized to em size. */
  xHeight?: number
  /** Units per em for this font. */
  unitsPerEm: number
}

// ── Stage 7: Shaping ─────────────────────────────────────────────────────────

/** A shaped glyph with positioning data. */
export interface GlyphInfo {
  /** Glyph ID in the font. For browser-based shaping, this may be 0. */
  glyphId: number
  /** Horizontal advance width for this glyph. */
  advance: number
  /** Horizontal offset from the pen position. */
  offsetX: number
  /** Vertical offset from the baseline. */
  offsetY: number
  /** Index into the original text run's character sequence. */
  cluster: number
  /** The original character(s) this glyph represents. */
  char: string
}

/** A run of glyphs sharing the same font. */
export interface GlyphRun {
  /** Glyph-level data for each shaped glyph. */
  glyphs: readonly GlyphInfo[]
  /** The font used for this glyph run. */
  font: FontMatch
  /** Reference to the source text run. */
  sourceRun: TextRun
  /** Total advance width of this glyph run. */
  totalAdvance: number
}

// ── Stage 9: Measurement ─────────────────────────────────────────────────────

/** Width measurement for a run or line. */
export interface TextMeasurement {
  /** Total width in logical units. */
  width: number
  /** Maximum ascent above the baseline. */
  ascent: number
  /** Maximum descent below the baseline. */
  descent: number
}

// ── Stage 10 & 11: Line Breaking & Layout ────────────────────────────────────

/** Line break opportunity classification. */
export type LineBreakClass =
  | 'mandatory'
  | 'space'
  | 'hyphen'
  | 'before'
  | 'after'
  | 'midWord'
  | 'prohibited'

/** One line break opportunity in a glyph sequence. */
export interface LineBreakOpportunity {
  /** Index into the flat glyph sequence. */
  glyphIndex: number
  /** Break classification at this position. */
  breakClass: LineBreakClass
}

/** One shaped line: a sequence of glyph runs that fit within the width. */
export interface ShapedLine {
  /** Glyph runs on this line (in visual order). */
  runs: readonly GlyphRun[]
  /** Start index in the flat glyph sequence. */
  startGlyphIndex: number
  /** Exclusive end index in the flat glyph sequence. */
  endGlyphIndex: number
  /** Total width of glyphs on this line. */
  width: number
}

// ── Stage 11 & 12: Line Height & Glyph Positioning ───────────────────────────

/** Metrics for one laid-out line. */
export interface LineMetrics {
  /** The shaped line this measures. */
  line: ShapedLine
  /** Line ascent (maximum ascent across all runs on this line). */
  ascent: number
  /** Line descent (maximum descent across all runs on this line). */
  descent: number
  /** Computed line height (ascent + descent + line gap). */
  height: number
  /** Baseline Y offset from the top of the line box. */
  baselineY: number
}

/** One glyph with its final rendered position. */
export interface PositionedGlyph {
  /** The underlying glyph info. */
  glyph: GlyphInfo
  /** Final X position in paragraph-local coordinates. */
  x: number
  /** Final Y position (baseline) in paragraph-local coordinates. */
  y: number
  /** Index of the line this glyph belongs to. */
  lineIndex: number
  /** The font used for this glyph. */
  font: FontMatch
  /** Fill color resolved for this glyph. */
  fill?: string
  /** Stroke color resolved for this glyph. */
  stroke?: string
  /** Stroke width resolved for this glyph. */
  strokeWidth?: number
}

// ── Stage 13: Complete Layout Result ─────────────────────────────────────────

/** Result of the full text layout pipeline. */
export interface TextLayoutResult {
  /** All shaped lines in visual order. */
  lines: readonly ShapedLine[]
  /** Line metrics for each line. */
  lineMetrics: readonly LineMetrics[]
  /** All glyphs with final positions, in visual order. */
  positionedGlyphs: readonly PositionedGlyph[]
  /** Bounding box of the laid-out paragraph. */
  bounds: { x: number; y: number; width: number; height: number }
  /** Total number of lines. */
  lineCount: number
  /** Maximum line height across all lines. */
  maxLineHeight: number
  /** Estimated width for quick bounds checks (best-effort). */
  estimatedWidth: number
}

// ── Font Registry ────────────────────────────────────────────────────────────

/** A registered font face available for matching. */
export interface FontFaceEntry {
  /** Font family name. */
  family: string
  /** Font weight. */
  weight: number | string
  /** Font style. */
  style: 'normal' | 'italic' | 'oblique'
  /** Font metrics at 1em. */
  metrics: FontMetrics
  /** Source URL or system font indicator. */
  source?: string
}

/** Font registry for resolving and fallback font matching. */
export interface FontRegistry {
  /** Register a font face for matching. */
  register(font: FontFaceEntry): void
  /** Find the best matching font for a request. */
  match(
    family: string,
    weight: number | string,
    style: 'normal' | 'italic' | 'oblique',
  ): FontMatch | null
  /** Find a fallback font that covers the given text. */
  findFallback(
    text: string,
    excludeFamilies: readonly string[],
    weight: number | string,
    style: 'normal' | 'italic' | 'oblique',
  ): FontMatch | null
  /** List all registered font families. */
  families(): readonly string[]
}

// ── Pipeline Configuration ───────────────────────────────────────────────────

/** Configuration options for the text layout pipeline. */
export interface TextPipelineConfig {
  /** Font registry for resolving font families. */
  fontRegistry?: FontRegistry
  /** Default font family when none is specified. */
  defaultFontFamily?: string
  /** Default font size when none is specified. */
  defaultFontSize?: number
  /** Default line height multiplier (e.g. 1.2). */
  defaultLineHeight?: number
  /** Default paragraph direction. */
  defaultDirection?: TextDirection
  /** Whether to use browser Canvas2D for shaping (default: true). */
  useBrowserShaping?: boolean
}

// ── Default Constants ────────────────────────────────────────────────────────

/** Default font family used when none is specified. */
export const DEFAULT_FONT_FAMILY = 'sans-serif'

/** Default font size in logical units. */
export const DEFAULT_FONT_SIZE = 16

/** Default line height multiplier. */
export const DEFAULT_LINE_HEIGHT = 1.2

/** Heuristic width-per-character ratio for quick estimation. */
export const TEXT_WIDTH_ESTIMATE_MULTIPLIER = 0.6

/** Default text direction when none is specified. */
export const DEFAULT_DIRECTION: TextDirection = 'ltr'
