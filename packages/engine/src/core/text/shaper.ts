/**
 * Text shaping and glyph run generation (Stage 7 & Stage 8).
 *
 * Stage 7 — Shaping: converts character sequences to glyph IDs with
 * positioning data (advances, offsets). Handles ligatures, kerning,
 * and OpenType feature application.
 *
 * Stage 8 — Glyph Run: groups shaped glyphs into runs sharing the
 * same font, with total advance computed.
 *
 * This module provides both a browser-based shaper (using Canvas2D
 * measureText for advance widths and kerning) and the interface for
 * plugging in an external shaping engine (e.g., HarfBuzz/WASM).
 */

import type {
  TextRun,
  FontMatch,
  GlyphInfo,
  GlyphRun,
  TextMeasurement,
  FontMetrics,
} from './types.ts'

// ── Shaper Interface ─────────────────────────────────────────────────────────

/** Offscreen canvas used for text measurement (shared across all shaper calls). */
let sharedMeasureCanvas: OffscreenCanvas | HTMLCanvasElement | null = null
let sharedMeasureCtx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null = null

/**
 * Returns (and lazily creates) a shared offscreen 2D context for text
 * measurement. Reuses the same context across all calls to avoid
 * per-measurement allocation overhead.
 *
 * Returns null when no Canvas2D API is available (e.g., Node.js without
 * a DOM implementation). Callers must fall back to estimate-based shaping.
 */
function getSharedMeasureContext(): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null {
  if (sharedMeasureCtx) return sharedMeasureCtx

  // Try OffscreenCanvas first (available in browsers and workers)
  if (typeof OffscreenCanvas !== 'undefined') {
    try {
      sharedMeasureCanvas = new OffscreenCanvas(100, 100)
      sharedMeasureCtx = sharedMeasureCanvas.getContext('2d')
    } catch {
      // OffscreenCanvas may be defined but unsupported (e.g., older Node)
    }
  }

  if (!sharedMeasureCtx && typeof HTMLCanvasElement !== 'undefined') {
    try {
      sharedMeasureCanvas = document.createElement('canvas')
      sharedMeasureCtx = (sharedMeasureCanvas as HTMLCanvasElement).getContext('2d')
    } catch {
      // DOM canvas may not be available
    }
  }

  // Return whatever we got (may be null in non-browser environments)
  return sharedMeasureCtx
}

/**
 * Checks whether a Canvas2D measurement context is available for shaping.
 * When false, callers should use estimate-based shaping instead.
 */
export function isBrowserShapingAvailable(): boolean {
  return getSharedMeasureContext() !== null
}

/**
 * Applies font styling to the measurement context.
 * No-op when ctx is null (non-browser environment).
 * @param ctx The 2D rendering context (may be null).
 * @param font The font match to apply.
 * @param fontSize The font size in logical units.
 */
function applyFontToContext(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null,
  font: FontMatch,
  fontSize: number,
): void {
  if (!ctx) return

  const styleParts: string[] = []

  if (font.fontStyle === 'italic' || font.fontStyle === 'oblique') {
    styleParts.push(font.fontStyle)
  }

  if (typeof font.fontWeight === 'number' && font.fontWeight !== 400) {
    styleParts.push(String(font.fontWeight))
  } else if (typeof font.fontWeight === 'string' && font.fontWeight !== 'normal') {
    styleParts.push(font.fontWeight)
  }

  styleParts.push(`${fontSize}px`)
  styleParts.push(`"${font.fontFamily}"`)

  ctx.font = styleParts.join(' ')
}

// ── Browser-Based Shaper ─────────────────────────────────────────────────────

/**
 * Shapes a text run into glyphs using the browser's Canvas2D text
 * measurement API (Stage 7).
 *
 * For each character, measures its advance width using the browser's
 * text shaping engine (which handles kerning, ligatures, and basic
 * OpenType features natively).
 *
 * When no Canvas2D context is available (e.g., Node.js test environment),
 * falls back to estimate-based glyph widths using the font size heuristic.
 *
 * Limitations:
 * - Glyph IDs are set to 0 (browser does not expose glyph IDs)
 * - Ligatures are measured correctly but not decomposed into glyphs
 * - Vertical offsets are always 0 (no vertical shaping)
 * - Complex script shaping (Arabic, Devanagari) depends on browser quality
 *
 * AI-TEMP: Browser-based shaper cannot expose glyph IDs or decompose
 * ligatures. Upgrade path: integrate HarfBuzz/WASM for full glyph-level
 * access when glyph-accurate rendering is needed.
 *
 * @param run The text run to shape.
 * @param font The font to use for shaping.
 * @returns Array of shaped glyphs.
 */
export function shapeRunBrowser(
  run: TextRun,
  font: FontMatch,
): GlyphInfo[] {
  const ctx = getSharedMeasureContext()
  applyFontToContext(ctx, font, run.style.fontSize)

  const glyphs: GlyphInfo[] = []

  for (let i = 0; i < run.text.length; i++) {
    const char = run.text[i]

    // Use browser measurement when available, otherwise estimate
    let charWidth: number
    if (ctx) {
      charWidth = ctx.measureText(char).width
    } else {
      charWidth = estimateCharWidth(char, run.style.fontSize)
    }

    glyphs.push({
      glyphId: 0, // Browser does not expose glyph IDs
      advance: charWidth,
      offsetX: 0,
      offsetY: 0,
      cluster: i,
      char,
    })
  }

  return glyphs
}

/**
 * Estimates the width of a single character based on its Unicode properties.
 *
 * Used as a fallback when Canvas2D measurement is unavailable.
 * CJK characters are roughly square (width ≈ fontSize), Latin characters
 * average ~0.6 × fontSize.
 *
 * @param char The character to estimate width for.
 * @param fontSize The font size.
 * @returns Estimated character width.
 */
function estimateCharWidth(char: string, fontSize: number): number {
  const cp = char.codePointAt(0) ?? 0

  // CJK characters — roughly square
  if (
    (cp >= 0x4e00 && cp <= 0x9fff) ||
    (cp >= 0x3400 && cp <= 0x4dbf) ||
    (cp >= 0x3000 && cp <= 0x303f) ||
    (cp >= 0x3040 && cp <= 0x309f) ||
    (cp >= 0x30a0 && cp <= 0x30ff) ||
    (cp >= 0xac00 && cp <= 0xd7af) ||
    (cp >= 0xff00 && cp <= 0xffef)
  ) {
    return fontSize
  }

  // Space — typically 0.25–0.33 × fontSize
  if (cp === 0x0020 || cp === 0x00a0) {
    return fontSize * 0.3
  }

  // Latin default
  return fontSize * 0.6
}

/**
 * Shapes a text run using character-level measurement with kerning
 * awareness. Measures pairs of characters to detect kerning adjustments.
 *
 * This provides more accurate advance widths than per-character measurement
 * alone, as it captures kerning between adjacent characters.
 *
 * When no Canvas2D context is available, falls back to estimate-based widths
 * (no kerning detection).
 *
 * @param run The text run to shape.
 * @param font The font to use for shaping.
 * @returns Array of shaped glyphs with kerning-adjusted advances.
 */
export function shapeRunWithKerning(
  run: TextRun,
  font: FontMatch,
): GlyphInfo[] {
  const ctx = getSharedMeasureContext()
  applyFontToContext(ctx, font, run.style.fontSize)

  const glyphs: GlyphInfo[] = []
  const text = run.text

  if (text.length === 0) return glyphs

  // Fallback path: use estimate-based widths when no canvas context
  if (!ctx) {
    for (let i = 0; i < text.length; i++) {
      glyphs.push({
        glyphId: 0,
        advance: estimateCharWidth(text[i], run.style.fontSize),
        offsetX: 0,
        offsetY: 0,
        cluster: i,
        char: text[i],
      })
    }
    return glyphs
  }

  // Browser path: measure each character and its pair with the next for kerning
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const singleWidth = ctx.measureText(char).width

    let advance = singleWidth

    // Kerning detection: measure the pair and compare to sum of singles
    if (i < text.length - 1) {
      const nextChar = text[i + 1]
      const pairWidth = ctx.measureText(char + nextChar).width
      const nextSingleWidth = ctx.measureText(nextChar).width
      const sumWidth = singleWidth + nextSingleWidth

      // If pair is narrower than sum, kerning is applied — adjust this glyph's advance
      if (pairWidth < sumWidth) {
        advance = pairWidth - nextSingleWidth
      }
    }

    glyphs.push({
      glyphId: 0,
      advance,
      offsetX: 0,
      offsetY: 0,
      cluster: i,
      char,
    })
  }

  return glyphs
}

// ── Glyph Run Generation ─────────────────────────────────────────────────────

/**
 * Generates a complete glyph run from shaped glyphs (Stage 8).
 *
 * Computes total advance and attaches font/source-run metadata.
 *
 * @param font The font used for this glyph run.
 * @param sourceRun The source text run.
 * @param glyphs The shaped glyphs for this run.
 * @returns A complete glyph run.
 */
export function createGlyphRun(
  font: FontMatch,
  sourceRun: TextRun,
  glyphs: readonly GlyphInfo[],
): GlyphRun {
  // Compute total advance from glyph advances + letter spacing
  const letterSpacing = sourceRun.style.letterSpacing
  const spacingTotal = letterSpacing * Math.max(0, glyphs.length - 1)
  const glyphAdvance = glyphs.reduce((sum, g) => sum + g.advance, 0)
  const totalAdvance = glyphAdvance + spacingTotal

  return {
    glyphs,
    font,
    sourceRun,
    totalAdvance,
  }
}

// ── Text Measurement ─────────────────────────────────────────────────────────

/**
 * Measures the width and vertical metrics of a text run (Stage 9).
 *
 * Uses the font's metrics table to compute ascent, descent, and
 * total advance width. Falls back to estimate-based width when
 * no Canvas2D context is available.
 *
 * @param run The text run to measure.
 * @param font The font to use for measurement.
 * @returns Width and vertical metrics.
 */
export function measureTextRun(
  run: TextRun,
  font: FontMatch,
): TextMeasurement {
  const ctx = getSharedMeasureContext()
  applyFontToContext(ctx, font, run.style.fontSize)

  const fontSize = run.style.fontSize

  // Convert normalized font metrics to pixel values at the current font size
  const ascent = (font.metrics.ascent / font.metrics.unitsPerEm) * fontSize
  const descent = Math.abs(font.metrics.descent / font.metrics.unitsPerEm) * fontSize

  // Use browser measurement when available, otherwise estimate
  let width: number
  if (ctx) {
    width = ctx.measureText(run.text).width
  } else {
    width = estimateTextWidth(run.text, fontSize)
  }

  return {
    width: width + run.style.letterSpacing * Math.max(0, run.text.length - 1),
    ascent,
    descent,
  }
}

/**
 * Measures the width of a glyph run using its pre-computed total advance.
 * @param glyphRun The glyph run to measure.
 * @returns Width and vertical metrics.
 */
export function measureGlyphRun(glyphRun: GlyphRun): TextMeasurement {
  const fontSize = glyphRun.sourceRun.style.fontSize
  const m = glyphRun.font.metrics

  return {
    width: glyphRun.totalAdvance,
    ascent: (m.ascent / m.unitsPerEm) * fontSize,
    descent: Math.abs(m.descent / m.unitsPerEm) * fontSize,
  }
}

/**
 * Quick best-effort text width estimate when full shaping is not available.
 *
 * Uses the character-count × fontSize × multiplier heuristic. This is the
 * same estimate used across the engine's bounds estimation code, now
 * centralized in the text module.
 *
 * @param text The text content.
 * @param fontSize The font size.
 * @returns Estimated width in logical units.
 */
export function estimateTextWidth(text: string, fontSize: number): number {
  if (text.length === 0) return 0

  // CJK characters are roughly square (width ≈ fontSize)
  // Latin characters average about 0.5–0.6 × fontSize
  // Use a weighted estimate based on character ranges
  let cjkCount = 0
  let latinCount = 0

  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0
    if (
      (cp >= 0x4e00 && cp <= 0x9fff) || // CJK Unified
      (cp >= 0x3400 && cp <= 0x4dbf) || // CJK Ext A
      (cp >= 0x3000 && cp <= 0x303f) || // CJK Symbols
      (cp >= 0x3040 && cp <= 0x309f) || // Hiragana
      (cp >= 0x30a0 && cp <= 0x30ff) || // Katakana
      (cp >= 0xac00 && cp <= 0xd7af) || // Hangul
      (cp >= 0xff00 && cp <= 0xffef)    // Halfwidth/Fullwidth
    ) {
      cjkCount += 1
    } else {
      latinCount += 1
    }
  }

  // CJK: ~1.0 × fontSize, Latin: ~0.6 × fontSize
  return (cjkCount * fontSize + latinCount * fontSize * 0.6)
}
