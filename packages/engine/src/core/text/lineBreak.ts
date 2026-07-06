/**
 * Line breaking algorithm (Stage 10).
 *
 * Breaks a flat sequence of glyph runs into lines that fit within the
 * paragraph width, using Unicode Line Breaking Algorithm (UAX #14) rules.
 *
 * Implements greedy line breaking: fills each line until the next glyph
 * (or word) would exceed the paragraph width, then breaks.
 *
 * Handles:
 * - Mandatory breaks (\n, line/paragraph separators)
 * - Space-based word breaks
 * - CJK character breaks
 * - Prohibited breaks (non-breaking spaces, word joiners)
 * - Soft hyphen opportunities
 * - Wrap mode: 'none' bypasses all width-based breaking
 */

import type {
  GlyphRun,
  GlyphInfo,
  ShapedLine,
  LineBreakClass,
} from './types.ts'

// ── Line Break Constants ─────────────────────────────────────────────────────

/** ASCII space character code. */
const SPACE_CHAR_CODE = 0x20

/** ASCII tab character code. */
const TAB_CHAR_CODE = 0x09

/** Unicode line separator. */
const LINE_SEPARATOR = 0x2028

/** Unicode paragraph separator. */
const PARAGRAPH_SEPARATOR = 0x2029

/** Soft hyphen (SHY) — invisible hyphenation opportunity. */
const SOFT_HYPHEN = 0x00ad

/** Hyphen-minus character. */
const HYPHEN_MINUS = 0x002d

/** Non-breaking space. */
const NO_BREAK_SPACE = 0x00a0

/** Zero-width space — break opportunity. */
const ZERO_WIDTH_SPACE = 0x200b

/** Word joiner — prevents breaks. */
const WORD_JOINER = 0x2060

// ── Line Break Classification ────────────────────────────────────────────────

/**
 * Classifies the line break opportunity at a given glyph boundary
 * using simplified UAX #14 rules.
 *
 * AI-TEMP: Simplified UAX #14 implementation covering the most common
 * break classes. Upgrade to full UAX #14 pair-table-based algorithm
 * for conformant line breaking in all scripts; ref Unicode Standard
 * Annex #14.
 *
 * @param glyph The glyph before the break point.
 * @param nextGlyph The glyph after the break point (null at end).
 * @returns Line break classification for this position.
 */
export function classifyLineBreak(
  glyph: GlyphInfo,
  nextGlyph: GlyphInfo | null,
): LineBreakClass {
  if (!nextGlyph) return 'mandatory'

  const cp = glyph.char.codePointAt(0) ?? 0
  const nextCp = nextGlyph.char.codePointAt(0) ?? 0

  // Mandatory breaks: explicit line/paragraph separators
  if (
    cp === LINE_SEPARATOR ||
    cp === PARAGRAPH_SEPARATOR ||
    cp === 0x000a || // LF
    cp === 0x000d    // CR
  ) {
    return 'mandatory'
  }

  // Zero-width space: explicit break opportunity
  if (cp === ZERO_WIDTH_SPACE) return 'space'

  // Soft hyphen: hyphenation opportunity when line is broken
  if (cp === SOFT_HYPHEN) return 'hyphen'

  // Non-breaking space / word joiner: prohibited break
  if (cp === NO_BREAK_SPACE || cp === WORD_JOINER) return 'prohibited'
  if (nextCp === NO_BREAK_SPACE || nextCp === WORD_JOINER) return 'prohibited'

  // Space / tab: break opportunity (space is consumed by the break)
  if (cp === SPACE_CHAR_CODE || cp === TAB_CHAR_CODE) return 'space'

  // CJK characters: break before or after
  if (
    (cp >= 0x4e00 && cp <= 0x9fff) || // CJK Unified
    (cp >= 0x3400 && cp <= 0x4dbf) || // CJK Ext A
    (cp >= 0x3040 && cp <= 0x309f) || // Hiragana
    (cp >= 0x30a0 && cp <= 0x30ff) || // Katakana
    (cp >= 0xac00 && cp <= 0xd7af)    // Hangul
  ) {
    return 'after'
  }

  // Punctuation: break after opening, before closing
  if (isOpeningPunctuation(cp)) return 'after'
  if (isClosingPunctuation(nextCp)) return 'before'

  // Default: break allowed between words (at space boundaries)
  return 'midWord'
}

/**
 * Checks whether a code point is an opening punctuation character
 * that should stick to the following text.
 * @param cp The code point to check.
 */
function isOpeningPunctuation(cp: number): boolean {
  return (
    cp === 0x0028 || // (
    cp === 0x005b || // [
    cp === 0x007b || // {
    cp === 0x300c || // 「
    cp === 0x300e || // 『
    cp === 0xff08 || // （
    cp === 0xff3b || // ［
    cp === 0xff5b    // ｛
  )
}

/**
 * Checks whether a code point is a closing punctuation character
 * that should stick to the preceding text.
 * @param cp The code point to check.
 */
function isClosingPunctuation(cp: number): boolean {
  return (
    cp === 0x0029 || // )
    cp === 0x005d || // ]
    cp === 0x007d || // }
    cp === 0x3001 || // 、
    cp === 0x3002 || // 。
    cp === 0x300d || // 」
    cp === 0x300f || // 』
    cp === 0xff09 || // ）
    cp === 0xff3d || // ］
    cp === 0xff5d || // ｝
    cp === 0xff0c || // ，
    cp === 0xff0e    // ．
  )
}

// ── Line Breaking ────────────────────────────────────────────────────────────

/**
 * Breaks a sequence of glyph runs into shaped lines that fit within
 * the paragraph width (Stage 10).
 *
 * Implements greedy line breaking: fills each line until the next glyph
 * (or word) would exceed the paragraph width, then breaks.
 *
 * Handles:
 * - Mandatory breaks (\n, line/paragraph separators)
 * - Space-based word breaks
 * - CJK character breaks
 * - Prohibited breaks (non-breaking spaces, word joiners)
 * - Soft hyphen opportunities
 * - Wrap mode: 'none' bypasses all width-based breaking
 *
 * @param glyphRuns Flat sequence of glyph runs in logical order.
 * @param paragraphWidth Maximum line width (0 = no limit).
 * @param wrapMode Wrapping strategy.
 * @returns Array of shaped lines.
 */
export function breakLines(
  glyphRuns: readonly GlyphRun[],
  paragraphWidth: number,
  wrapMode: 'none' | 'word' | 'char',
): ShapedLine[] {
  // Flatten all glyphs into a single sequence for line breaking
  const flatGlyphs: Array<{ glyph: GlyphInfo; runIndex: number }> = []
  for (let ri = 0; ri < glyphRuns.length; ri++) {
    for (const glyph of glyphRuns[ri].glyphs) {
      flatGlyphs.push({ glyph, runIndex: ri })
    }
  }

  if (flatGlyphs.length === 0) return []

  const lines: ShapedLine[] = []
  let lineStart = 0
  let lineWidth = 0

  // Collect run boundaries for reconstructing GlyphRun[] per line
  const runStarts: number[] = [0]
  for (let ri = 0; ri < glyphRuns.length; ri++) {
    runStarts.push(runStarts[runStarts.length - 1] + glyphRuns[ri].glyphs.length)
  }

  for (let i = 0; i < flatGlyphs.length; i++) {
    const { glyph } = flatGlyphs[i]
    const cp = glyph.char.codePointAt(0) ?? 0

    // Mandatory break: always break regardless of width
    if (
      cp === 0x000a || // LF
      cp === 0x000d || // CR
      cp === LINE_SEPARATOR ||
      cp === PARAGRAPH_SEPARATOR
    ) {
      // Emit line up to (but not including) the mandatory break character
      lines.push(buildLine(glyphRuns, flatGlyphs, lineStart, i, runStarts))
      lineStart = i + 1
      lineWidth = 0
      continue
    }

    const glyphAdvance = glyph.advance

    // 'none' wrap mode: never break on width, only on mandatory breaks
    if (wrapMode === 'none') {
      lineWidth += glyphAdvance
      continue
    }

    // Check if this glyph would exceed the line width
    const nextWidth = lineWidth + glyphAdvance

    if (paragraphWidth > 0 && lineWidth > 0 && nextWidth > paragraphWidth) {
      // Need to break. Find the best break point.
      const breakPoint = findBestBreakPoint(flatGlyphs, lineStart, i, wrapMode)

      if (breakPoint > lineStart) {
        lines.push(buildLine(glyphRuns, flatGlyphs, lineStart, breakPoint, runStarts))
        lineStart = breakPoint
        // Re-measure the line width starting from the break point
        lineWidth = 0
        for (let j = lineStart; j <= i; j++) {
          lineWidth += flatGlyphs[j].glyph.advance
        }
      } else {
        // Cannot break — force the glyph onto this line anyway (char wrap fallback)
        lineWidth = nextWidth
      }
    } else {
      lineWidth = nextWidth
    }
  }

  // Emit remaining glyphs as the last line
  if (lineStart < flatGlyphs.length) {
    lines.push(buildLine(glyphRuns, flatGlyphs, lineStart, flatGlyphs.length, runStarts))
  }

  return lines
}

/**
 * Finds the best break point before the overflow glyph.
 *
 * For 'word' wrap: breaks at the last space before the overflow.
 * For 'char' wrap: breaks right before the overflow glyph.
 *
 * @param flatGlyphs Flat glyph sequence.
 * @param lineStart Start index of the current line.
 * @param overflowIndex Index of the glyph that would overflow.
 * @param wrapMode The wrapping mode.
 * @returns The index to break at (exclusive end of the line).
 */
function findBestBreakPoint(
  flatGlyphs: Array<{ glyph: GlyphInfo; runIndex: number }>,
  lineStart: number,
  overflowIndex: number,
  wrapMode: 'word' | 'char',
): number {
  if (wrapMode === 'char') {
    // Break right before the overflowing character
    return overflowIndex
  }

  // Word wrap: search backward for a space or CJK break opportunity
  for (let j = overflowIndex - 1; j > lineStart; j--) {
    const cp = flatGlyphs[j].glyph.char.codePointAt(0) ?? 0

    // Space: break after it (consume the space at end of line)
    if (cp === SPACE_CHAR_CODE) {
      return j + 1 // Include the space at end of line
    }

    // Tab: break after it
    if (cp === TAB_CHAR_CODE) {
      return j + 1
    }
  }

  // No good break point — force break at overflow
  return overflowIndex
}

/**
 * Builds a ShapedLine from a range of the flat glyph sequence.
 *
 * Reconstructs GlyphRun[] from the flat sequence, preserving original
 * run boundaries.
 *
 * @param runs Original glyph runs.
 * @param flatGlyphs Flat glyph sequence.
 * @param start Start index (inclusive).
 * @param end End index (exclusive).
 * @param runStarts Cumulative glyph counts at each run boundary.
 * @returns A shaped line.
 */
function buildLine(
  runs: readonly GlyphRun[],
  flatGlyphs: Array<{ glyph: GlyphInfo; runIndex: number }>,
  start: number,
  end: number,
  runStarts: readonly number[],
): ShapedLine {
  // Skip mandatory break characters at the end of the line
  let effectiveEnd = end
  while (effectiveEnd > start) {
    const cp = flatGlyphs[effectiveEnd - 1].glyph.char.codePointAt(0) ?? 0
    if (
      cp === 0x000a || cp === 0x000d ||
      cp === LINE_SEPARATOR || cp === PARAGRAPH_SEPARATOR
    ) {
      effectiveEnd -= 1
    } else {
      break
    }
  }

  // Build run slices for the line
  const lineRuns: GlyphRun[] = []
  let totalWidth = 0

  for (let ri = 0; ri < runs.length; ri++) {
    const runGlyphStart = runStarts[ri]
    const runGlyphEnd = runStarts[ri + 1]

    // Find overlap between [start, effectiveEnd) and [runGlyphStart, runGlyphEnd)
    const overlapStart = Math.max(start, runGlyphStart)
    const overlapEnd = Math.min(effectiveEnd, runGlyphEnd)

    if (overlapStart >= overlapEnd) continue

    const localStart = overlapStart - runGlyphStart
    const localEnd = overlapEnd - runGlyphStart
    const glyphSlice = runs[ri].glyphs.slice(localStart, localEnd)

    const sliceAdvance = glyphSlice.reduce((sum, g) => sum + g.advance, 0)
    totalWidth += sliceAdvance

    lineRuns.push({
      glyphs: glyphSlice,
      font: runs[ri].font,
      sourceRun: runs[ri].sourceRun,
      totalAdvance: sliceAdvance,
    })
  }

  return {
    runs: lineRuns,
    startGlyphIndex: start,
    endGlyphIndex: effectiveEnd,
    width: totalWidth,
  }
}

