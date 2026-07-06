/**
 * Unicode grapheme cluster parsing (Stage 2).
 *
 * Breaks a UTF-16 string into grapheme clusters using Unicode Standard
 * Annex #29 rules. Each cluster represents a user-perceived character,
 * which may be composed of multiple code points (e.g. emoji with skin
 * tone modifiers, letters with combining marks).
 */

import type { UnicodeCluster } from './types.ts'

// Extended grapheme cluster boundaries: surrogate pairs, combining marks,
// zero-width joiners, and regional indicator pairs.
const COMBINING_MARK_START = 0x0300
const COMBINING_MARK_END = 0x036f
const COMBINING_MARK_EXT_START = 0x1ab0
const COMBINING_MARK_EXT_END = 0x1aff
const COMBINING_MARK_SUPP_START = 0x1dc0
const COMBINING_MARK_SUPP_END = 0x1dff
const COMBINING_MARK_SYMBOL_START = 0x20d0
const COMBINING_MARK_SYMBOL_END = 0x20ff
const COMBINING_MARK_HALF_START = 0xfe20
const COMBINING_MARK_HALF_END = 0xfe2f
const ZWJ = 0x200d
const REGIONAL_INDICATOR_START = 0x1f1e6
const REGIONAL_INDICATOR_END = 0x1f1ff
const VARIATION_SELECTOR_START = 0xfe00
const VARIATION_SELECTOR_END = 0xfe0f
const VARIATION_SELECTOR_SUPP_START = 0xe0100
const VARIATION_SELECTOR_SUPP_END = 0xe01ef

/** Number of combining mark ranges checked per code point. */
const COMBINING_RANGE_COUNT = 6

/**
 * Checks whether a code point is a combining mark that extends the
 * preceding base character's grapheme cluster.
 * @param cp The Unicode code point to check.
 */
function isCombiningMark(cp: number): boolean {
  return (
    (cp >= COMBINING_MARK_START && cp <= COMBINING_MARK_END) ||
    (cp >= COMBINING_MARK_EXT_START && cp <= COMBINING_MARK_EXT_END) ||
    (cp >= COMBINING_MARK_SUPP_START && cp <= COMBINING_MARK_SUPP_END) ||
    (cp >= COMBINING_MARK_SYMBOL_START && cp <= COMBINING_MARK_SYMBOL_END) ||
    (cp >= COMBINING_MARK_HALF_START && cp <= COMBINING_MARK_HALF_END)
  )
}

/**
 * Checks whether a code point is a variation selector.
 * @param cp The Unicode code point to check.
 */
function isVariationSelector(cp: number): boolean {
  return (
    (cp >= VARIATION_SELECTOR_START && cp <= VARIATION_SELECTOR_END) ||
    (cp >= VARIATION_SELECTOR_SUPP_START && cp <= VARIATION_SELECTOR_SUPP_END)
  )
}

/**
 * Checks whether a code point is a regional indicator (flag emoji).
 * @param cp The Unicode code point to check.
 */
function isRegionalIndicator(cp: number): boolean {
  return cp >= REGIONAL_INDICATOR_START && cp <= REGIONAL_INDICATOR_END
}

/**
 * Breaks a string into grapheme clusters per UAX #29 extended rules.
 *
 * Handles:
 * - Surrogate pairs (UTF-16 → code point decoding)
 * - Combining marks (attached to the preceding base character)
 * - Zero-width joiner sequences (emoji families, etc.)
 * - Regional indicator pairs (flags)
 * - Variation selectors
 *
 * AI-TEMP: Full UAX #29 state machine is deferred; this covers the most
 * common cases for text layout. Extend when CJK/emoji sequences need
 * stricter conformance; ref UAX #29 §3.1.
 *
 * @param text The UTF-16 string to break into clusters.
 * @returns Array of grapheme clusters with position information.
 */
export function parseGraphemeClusters(text: string): UnicodeCluster[] {
  const clusters: UnicodeCluster[] = []
  let i = 0
  const len = text.length

  while (i < len) {
    const start = i
    let cp = text.charCodeAt(i)

    // Decode surrogate pair (UTF-16 high surrogate + low surrogate)
    if (cp >= 0xd800 && cp <= 0xdbff && i + 1 < len) {
      const low = text.charCodeAt(i + 1)
      if (low >= 0xdc00 && low <= 0xdfff) {
        cp = 0x10000 + ((cp - 0xd800) * 0x400) + (low - 0xdc00)
        i += 2
      } else {
        // Lone high surrogate — treat as single code unit
        i += 1
      }
    } else {
      i += 1
    }

    // Extend: absorb following combining marks
    while (i < len) {
      const nextCp = text.charCodeAt(i)

      // Handle surrogate pair for the next character
      let extendedCp = nextCp
      let extendedLen = 1
      if (nextCp >= 0xd800 && nextCp <= 0xdbff && i + 1 < len) {
        const low = text.charCodeAt(i + 1)
        if (low >= 0xdc00 && low <= 0xdfff) {
          extendedCp = 0x10000 + ((nextCp - 0xd800) * 0x400) + (low - 0xdc00)
          extendedLen = 2
        }
      }

      // ZWJ: absorb the ZWJ + next grapheme
      if (extendedCp === ZWJ && i + extendedLen < len) {
        i += extendedLen // consume ZWJ

        // Absorb the next full character (may be surrogate pair)
        if (text.charCodeAt(i) >= 0xd800 && text.charCodeAt(i) <= 0xdbff && i + 1 < len) {
          i += 2
        } else {
          i += 1
        }

        // Continue to absorb combining marks after the ZWJ sequence
        continue
      }

      // Regional indicator pair: absorb exactly two
      if (isRegionalIndicator(cp) && isRegionalIndicator(extendedCp)) {
        i += extendedLen
        break // Only two regional indicators form a pair
      }

      // Variation selector: absorb
      if (isVariationSelector(extendedCp)) {
        i += extendedLen
        continue
      }

      // Combining mark: absorb
      if (isCombiningMark(extendedCp)) {
        i += extendedLen
        continue
      }

      // Stop extending
      break
    }

    clusters.push({
      text: text.slice(start, i),
      start,
      end: i,
    })
  }

  return clusters
}
