/**
 * Text run segmentation (Stage 3 & Stage 6).
 *
 * Stage 3 — Initial run segmentation: splits the paragraph into runs by
 * style boundaries, then refines by script and direction changes.
 *
 * Stage 6 — Font-fallback re-segmentation: after font fallback resolution,
 * re-splits runs where different fallback fonts are used for different
 * character ranges within the same original run.
 */

import type {
  TextParagraph,
  TextStyleSpan,
  TextRun,
  ResolvedTextStyle,
  TextScript,
  TextDirection,
  UnicodeCluster,
  FontMatch,
} from './types.ts'
import { DEFAULT_FONT_FAMILY, DEFAULT_FONT_SIZE, DEFAULT_LINE_HEIGHT, DEFAULT_DIRECTION } from './types.ts'

/**
 * Resolves the full style for a character position by merging paragraph
 * defaults with applicable style spans.
 * @param paragraph The input paragraph.
 * @param charIndex The character index to resolve style for.
 * @returns Fully resolved style.
 */
export function resolveCharStyle(
  paragraph: TextParagraph,
  charIndex: number,
): ResolvedTextStyle {
  const spans = paragraph.styleSpans ?? []

  // Find the applicable span for this character index
  const span = spans.find((s) => charIndex >= s.start && charIndex < s.end)

  return {
    fontFamily: span?.fontFamily ?? DEFAULT_FONT_FAMILY,
    fontSize: span?.fontSize ?? DEFAULT_FONT_SIZE,
    fontWeight: span?.fontWeight ?? 400,
    fontStyle: span?.fontStyle ?? 'normal',
    lineHeight: paragraph.lineHeight ?? DEFAULT_LINE_HEIGHT,
    letterSpacing: span?.letterSpacing ?? 0,
    fill: span?.fill,
    stroke: span?.stroke,
    strokeWidth: span?.strokeWidth,
  }
}

/**
 * Determines the Unicode script of a code point.
 *
 * Uses coarse Unicode block ranges for common scripts. For production use,
 * a full UAX #24 script database is recommended.
 * AI-TEMP: Coarse range-based script detection; upgrade to full UAX #24
 * script property database for correct script segmentation of mixed-script
 * text; ref Unicode Standard Annex #24.
 *
 * @param cp The Unicode code point to classify.
 * @returns Script classification.
 */
export function classifyCodePoint(cp: number): TextScript {
  // ASCII
  if (cp <= 0x007f) return 'common'

  // Latin extensions
  if ((cp >= 0x0080 && cp <= 0x024f) || (cp >= 0x1e00 && cp <= 0x1eff)) return 'latin'

  // Greek
  if ((cp >= 0x0370 && cp <= 0x03ff) || (cp >= 0x1f00 && cp <= 0x1fff)) return 'greek'

  // Cyrillic
  if ((cp >= 0x0400 && cp <= 0x04ff) || (cp >= 0x0500 && cp <= 0x052f)) return 'cyrillic'

  // Hebrew
  if (cp >= 0x0590 && cp <= 0x05ff) return 'hebrew'

  // Arabic + supplements
  if ((cp >= 0x0600 && cp <= 0x06ff) ||
      (cp >= 0x0750 && cp <= 0x077f) ||
      (cp >= 0xfb50 && cp <= 0xfdff) ||
      (cp >= 0xfe70 && cp <= 0xfeff)) return 'arabic'

  // Syriac
  if ((cp >= 0x0700 && cp <= 0x074f) || (cp >= 0x0860 && cp <= 0x086f)) return 'syriac'

  // Thaana
  if (cp >= 0x0780 && cp <= 0x07bf) return 'thaana'

  // Devanagari
  if (cp >= 0x0900 && cp <= 0x097f) return 'devanagari'

  // Bengali
  if (cp >= 0x0980 && cp <= 0x09ff) return 'bengali'

  // Gurmukhi
  if (cp >= 0x0a00 && cp <= 0x0a7f) return 'gurmukhi'

  // Gujarati
  if (cp >= 0x0a80 && cp <= 0x0aff) return 'gujarati'

  // Oriya
  if (cp >= 0x0b00 && cp <= 0x0b7f) return 'oriya'

  // Tamil
  if (cp >= 0x0b80 && cp <= 0x0bff) return 'tamil'

  // Telugu
  if (cp >= 0x0c00 && cp <= 0x0c7f) return 'telugu'

  // Kannada
  if (cp >= 0x0c80 && cp <= 0x0cff) return 'kannada'

  // Malayalam
  if (cp >= 0x0d00 && cp <= 0x0d7f) return 'malayalam'

  // Sinhala
  if (cp >= 0x0d80 && cp <= 0x0dff) return 'sinhala'

  // Thai
  if (cp >= 0x0e00 && cp <= 0x0e7f) return 'thai'

  // Lao
  if (cp >= 0x0e80 && cp <= 0x0eff) return 'lao'

  // Tibetan
  if (cp >= 0x0f00 && cp <= 0x0fff) return 'tibetan'

  // Myanmar
  if (cp >= 0x1000 && cp <= 0x109f) return 'myanmar'

  // Georgian
  if (cp >= 0x10a0 && cp <= 0x10ff) return 'georgian'

  // Hangul Jamo
  if ((cp >= 0x1100 && cp <= 0x11ff) ||
      (cp >= 0x3130 && cp <= 0x318f) ||
      (cp >= 0xac00 && cp <= 0xd7af)) return 'hangul'

  // Ethiopic
  if (cp >= 0x1200 && cp <= 0x137f) return 'ethiopic'

  // Cherokee
  if (cp >= 0x13a0 && cp <= 0x13ff) return 'cherokee'

  // Canadian Aboriginal Syllabics
  if ((cp >= 0x1400 && cp <= 0x167f) || (cp >= 0x18b0 && cp <= 0x18ff)) return 'canadianAboriginal'

  // Mongolian
  if (cp >= 0x1800 && cp <= 0x18af) return 'mongolian'

  // Khmer
  if ((cp >= 0x1780 && cp <= 0x17ff) || (cp >= 0x19e0 && cp <= 0x19ff)) return 'khmer'

  // Yi
  if ((cp >= 0xa000 && cp <= 0xa4cf) || (cp >= 0xa490 && cp <= 0xa4cf)) return 'yi'

  // CJK Unified Ideographs
  if ((cp >= 0x4e00 && cp <= 0x9fff) ||
      (cp >= 0x3400 && cp <= 0x4dbf) ||
      (cp >= 0x20000 && cp <= 0x2a6df) ||
      (cp >= 0x2a700 && cp <= 0x2b73f) ||
      (cp >= 0x2b740 && cp <= 0x2b81f) ||
      (cp >= 0x2b820 && cp <= 0x2ceaf) ||
      (cp >= 0x2ceb0 && cp <= 0x2ebef) ||
      (cp >= 0x30000 && cp <= 0x3134f) ||
      (cp >= 0x31350 && cp <= 0x323af)) return 'han'

  // Hiragana
  if (cp >= 0x3040 && cp <= 0x309f) return 'hiragana'

  // Katakana
  if ((cp >= 0x30a0 && cp <= 0x30ff) || (cp >= 0x31f0 && cp <= 0x31ff)) return 'katakana'

  // Bopomofo
  if ((cp >= 0x3100 && cp <= 0x312f) || (cp >= 0x31a0 && cp <= 0x31bf)) return 'bopomofo'

  // Armenian
  if (cp >= 0x0530 && cp <= 0x058f) return 'armenian'

  // Common: punctuation, symbols, marks, numbers
  if ((cp >= 0x2000 && cp <= 0x206f) || // General Punctuation
      (cp >= 0x2070 && cp <= 0x209f) || // Superscripts/Subscripts
      (cp >= 0x20a0 && cp <= 0x20cf) || // Currency Symbols
      (cp >= 0x2100 && cp <= 0x214f) || // Letterlike Symbols
      (cp >= 0x2150 && cp <= 0x218f) || // Number Forms
      (cp >= 0x2190 && cp <= 0x21ff) || // Arrows
      (cp >= 0x2200 && cp <= 0x22ff) || // Math Operators
      (cp >= 0x2300 && cp <= 0x23ff) || // Misc Technical
      (cp >= 0x2460 && cp <= 0x24ff) || // Enclosed Alphanumerics
      (cp >= 0x2500 && cp <= 0x257f) || // Box Drawing
      (cp >= 0x2580 && cp <= 0x259f) || // Block Elements
      (cp >= 0x25a0 && cp <= 0x25ff) || // Geometric Shapes
      (cp >= 0x2600 && cp <= 0x26ff) || // Misc Symbols
      (cp >= 0x2700 && cp <= 0x27bf) || // Dingbats
      (cp >= 0x2e00 && cp <= 0x2e7f) || // Supplemental Punctuation
      (cp >= 0x3000 && cp <= 0x303f) || // CJK Symbols/Punctuation
      (cp >= 0xfe30 && cp <= 0xfe4f))   // CJK Compatibility Forms
    return 'common'

  return 'unknown'
}

/**
 * Classifies the script of a text string based on its primary code points.
 *
 * Returns the most frequent non-common script, falling back to 'common'
 * for ASCII/punctuation-heavy text.
 * @param text The text to classify.
 * @returns Dominant script classification.
 */
export function classifyScript(text: string): TextScript {
  const scriptCounts = new Map<TextScript, number>()
  let totalChars = 0

  for (const ch of text) {
    const cp = ch.codePointAt(0)
    if (cp === undefined) continue

    const script = classifyCodePoint(cp)
    scriptCounts.set(script, (scriptCounts.get(script) ?? 0) + 1)
    totalChars += 1
  }

  if (totalChars === 0) return 'common'

  // Find the dominant non-common script
  let dominantScript: TextScript = 'common'
  let maxCount = 0

  for (const [script, count] of scriptCounts) {
    if (script !== 'common' && count > maxCount) {
      maxCount = count
      dominantScript = script
    }
  }

  return dominantScript
}

/**
 * Determines the text direction for a character based on its code point.
 *
 * Uses a simplified bidi classification: strong RTL characters (Arabic,
 * Hebrew, Syriac, Thaana) return 'rtl', everything else returns 'ltr'.
 * AI-TEMP: Simplified bidi classification without UAX #9 algorithm;
 * upgrade to full Unicode Bidirectional Algorithm for correct mixed-
 * direction text layout; ref Unicode Standard Annex #9.
 *
 * @param cp The Unicode code point.
 * @returns Text direction for this character.
 */
export function classifyDirection(cp: number): TextDirection {
  // Arabic block + supplements
  if ((cp >= 0x0600 && cp <= 0x06ff) ||
      (cp >= 0x0750 && cp <= 0x077f) ||
      (cp >= 0xfb50 && cp <= 0xfdff) ||
      (cp >= 0xfe70 && cp <= 0xfeff)) return 'rtl'

  // Hebrew block
  if ((cp >= 0x0590 && cp <= 0x05ff) ||
      (cp >= 0xfb1d && cp <= 0xfb4f)) return 'rtl'

  // Syriac
  if ((cp >= 0x0700 && cp <= 0x074f) || (cp >= 0x0860 && cp <= 0x086f)) return 'rtl'

  // Thaana
  if (cp >= 0x0780 && cp <= 0x07bf) return 'rtl'

  // RTL marks and formatting
  if ((cp >= 0x200e && cp <= 0x200f) || // LRM, RLM
      (cp >= 0x202a && cp <= 0x202e))   // LRE, RLE, PDF, LRO, RLO
    return 'rtl'

  return 'ltr'
}

/**
 * Segments clusters into initial text runs by style, script, and direction
 * boundaries (Stage 3).
 *
 * Each text run has uniform: style (resolved), script, and direction.
 *
 * @param paragraph The input paragraph.
 * @param clusters The pre-parsed grapheme clusters.
 * @returns Array of text runs with uniform properties.
 */
export function segmentTextRuns(
  paragraph: TextParagraph,
  clusters: readonly UnicodeCluster[],
): TextRun[] {
  if (clusters.length === 0) return []

  const paragraphDirection = paragraph.direction ?? DEFAULT_DIRECTION
  const runs: TextRun[] = []

  // Resolve the first cluster's properties to seed the first run
  let runStart = clusters[0].start
  let runEnd = clusters[0].end
  let runStyle = resolveCharStyle(paragraph, clusters[0].start)
  let runScript = classifyScript(clusters[0].text)
  let runDirection = classifyDirection(clusters[0].text.codePointAt(0) ?? 0)

  for (let i = 1; i < clusters.length; i++) {
    const cluster = clusters[i]
    const clusterCp = cluster.text.codePointAt(0) ?? 0
    const clusterStyle = resolveCharStyle(paragraph, cluster.start)
    const clusterScript = classifyScript(cluster.text)
    const clusterDirection = classifyDirection(clusterCp)

    // Check if any property changed — if so, emit the current run
    const styleChanged =
      clusterStyle.fontFamily !== runStyle.fontFamily ||
      clusterStyle.fontSize !== runStyle.fontSize ||
      clusterStyle.fontWeight !== runStyle.fontWeight ||
      clusterStyle.fontStyle !== runStyle.fontStyle

    const scriptChanged = clusterScript !== runScript && clusterScript !== 'common' && runScript !== 'common'
    const directionChanged = clusterDirection !== runDirection

    if (styleChanged || scriptChanged || directionChanged) {
      // Emit current run
      runs.push({
        text: paragraph.text.slice(runStart, runEnd),
        start: runStart,
        end: runEnd,
        style: runStyle,
        script: runScript,
        direction: runDirection,
      })

      // Start new run with this cluster's properties
      runStart = cluster.start
      runStyle = clusterStyle
      runScript = clusterScript
      runDirection = clusterDirection
    }

    runEnd = cluster.end
  }

  // Emit final run
  runs.push({
    text: paragraph.text.slice(runStart, runEnd),
    start: runStart,
    end: runEnd,
    style: runStyle,
    script: runScript,
    direction: runDirection,
  })

  return runs
}

/**
 * Re-segments text runs after font fallback resolution (Stage 6).
 *
 * When a font fallback results in different fonts for different characters
 * within a single run, this splits the run at font-change boundaries so
 * each resulting run has a single font.
 *
 * @param runs The initial text runs.
 * @param resolveFont A function that returns the font match for a character.
 * @returns Re-segmented text runs with uniform font assignment.
 */
export function resegmentAfterFontFallback(
  runs: readonly TextRun[],
  resolveFont: (
    char: string,
    style: ResolvedTextStyle,
    excludeFamilies: readonly string[],
  ) => FontMatch,
): TextRun[] {
  const result: TextRun[] = []

  for (const run of runs) {
    if (run.text.length === 0) continue

    let segStart = 0
    let currentFont = resolveFont(run.text[0], run.style, [])

    for (let i = 1; i < run.text.length; i++) {
      const charFont = resolveFont(run.text[i], run.style, [])

      // Font changed — emit segment
      if (charFont.fontFamily !== currentFont.fontFamily) {
        result.push({
          text: run.text.slice(segStart, i),
          start: run.start + segStart,
          end: run.start + i,
          style: run.style,
          script: run.script,
          direction: run.direction,
        })

        segStart = i
        currentFont = charFont
      }
    }

    // Emit final segment
    result.push({
      text: run.text.slice(segStart),
      start: run.start + segStart,
      end: run.end,
      style: run.style,
      script: run.script,
      direction: run.direction,
    })
  }

  return result
}
