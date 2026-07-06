/**
 * Font resolution and fallback (Stage 4 & Stage 5).
 *
 * Stage 4 — Font Resolve: matches requested font-family strings against
 * a font registry to find the best available font face.
 *
 * Stage 5 — Font Fallback: when the primary font lacks glyphs for certain
 * characters, finds alternative fonts from the fallback chain.
 */

import type {
  FontRegistry,
  FontMatch,
  FontMetrics,
  FontFaceEntry,
  ResolvedTextStyle,
} from './types.ts'

// ── Default Font Metrics ─────────────────────────────────────────────────────

/** Default metrics for sans-serif fonts (approximate, normalized to 1em). */
const DEFAULT_SANS_METRICS: FontMetrics = {
  ascent: 0.926,
  descent: -0.225,
  lineGap: 0.0,
  capHeight: 0.716,
  xHeight: 0.532,
  unitsPerEm: 1000,
}

/** Default metrics for serif fonts (approximate, normalized to 1em). */
const DEFAULT_SERIF_METRICS: FontMetrics = {
  ascent: 0.923,
  descent: -0.231,
  lineGap: 0.0,
  capHeight: 0.686,
  xHeight: 0.476,
  unitsPerEm: 1000,
}

/** Default metrics for monospace fonts (approximate, normalized to 1em). */
const DEFAULT_MONO_METRICS: FontMetrics = {
  ascent: 0.918,
  descent: -0.227,
  lineGap: 0.0,
  capHeight: 0.702,
  xHeight: 0.520,
  unitsPerEm: 1000,
}

/** Default metrics for CJK fonts (approximate, normalized to 1em). */
const DEFAULT_CJK_METRICS: FontMetrics = {
  ascent: 0.880,
  descent: -0.120,
  lineGap: 0.0,
  unitsPerEm: 1000,
}

/**
 * Returns approximate font metrics for a given family.
 *
 * AI-TEMP: Returns hardcoded approximate metrics. Replace with actual
 * font metrics from font files or browser FontMetrics API when available.
 * @param family Font family name (lowercase for matching).
 */
export function getApproximateMetrics(family: string): FontMetrics {
  const lower = family.toLowerCase()

  if (lower.includes('mono') || lower.includes('console') || lower.includes('courier')) {
    return { ...DEFAULT_MONO_METRICS }
  }

  if (lower.includes('serif') || lower.includes('times') || lower.includes('georgia')) {
    return { ...DEFAULT_SERIF_METRICS }
  }

  // CJK fallback
  if (
    lower.includes('cjk') ||
    lower.includes('hei') ||
    lower.includes('ming') ||
    lower.includes('song') ||
    lower.includes('gothic') ||
    lower.includes('noto sans sc') ||
    lower.includes('noto sans tc') ||
    lower.includes('noto sans jp') ||
    lower.includes('noto sans kr') ||
    lower.includes('pingfang') ||
    lower.includes('hiragino') ||
    lower.includes('yu gothic')
  ) {
    return { ...DEFAULT_CJK_METRICS }
  }

  return { ...DEFAULT_SANS_METRICS }
}

// ── Generic Font Families ────────────────────────────────────────────────────

/**
 * System font fallback stacks for generic CSS font families.
 * Maps generic names to platform-specific system fonts.
 */
const GENERIC_FONT_STACKS: Record<string, readonly string[]> = {
  'serif': ['Georgia', 'Times New Roman', 'Times', 'serif'],
  'sans-serif': ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
  'monospace': ['JetBrains Mono', 'Fira Code', 'SF Mono', 'Menlo', 'Monaco', 'Consolas', 'Courier New', 'monospace'],
  'cursive': ['Comic Sans MS', 'Brush Script MT', 'cursive'],
  'fantasy': ['Impact', 'Papyrus', 'fantasy'],
  'system-ui': ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
}

/** System-level fallback font chain for missing glyph coverage. */
const SYSTEM_FALLBACK_CHAIN: readonly string[] = [
  'system-ui',
  '-apple-system',
  'Segoe UI',
  'Roboto',
  'Helvetica Neue',
  'Arial',
  'Noto Sans SC',   // Simplified Chinese
  'Noto Sans TC',   // Traditional Chinese
  'Noto Sans JP',   // Japanese
  'Noto Sans KR',   // Korean
  'Noto Sans Arabic',
  'Noto Sans Hebrew',
  'Noto Sans Devanagari',
  'Noto Sans Thai',
  'sans-serif',
]

// ── Font Registry Implementation ─────────────────────────────────────────────

/**
 * Creates an in-memory font registry for font matching and fallback.
 *
 * The registry maintains a list of registered font faces and provides
 * methods for font matching (Stage 4) and fallback font selection (Stage 5).
 *
 * @param initialFonts Optional initial set of font faces to register.
 * @returns A FontRegistry instance.
 */
export function createFontRegistry(initialFonts?: readonly FontFaceEntry[]): FontRegistry {
  const fonts: FontFaceEntry[] = initialFonts ? [...initialFonts] : []

  const registry: FontRegistry = {
    register(font: FontFaceEntry): void {
      // Remove any existing entry with same family+weight+style before adding
      const existingIndex = fonts.findIndex(
        (f) =>
          f.family === font.family &&
          f.weight === font.weight &&
          f.style === font.style,
      )
      if (existingIndex >= 0) {
        fonts[existingIndex] = font
      } else {
        fonts.push(font)
      }
    },

    match(
      family: string,
      weight: number | string,
      style: 'normal' | 'italic' | 'oblique',
    ): FontMatch | null {
      return matchFont(fonts, family, weight, style)
    },

    findFallback(
      text: string,
      excludeFamilies: readonly string[],
      weight: number | string,
      style: 'normal' | 'italic' | 'oblique',
    ): FontMatch | null {
      return findFallbackFont(fonts, text, excludeFamilies, weight, style)
    },

    families(): readonly string[] {
      const familySet = new Set(fonts.map((f) => f.family))
      return [...familySet]
    },
  }

  return registry
}

/**
 * Finds the best matching font from the registry for the given request.
 *
 * Match priority:
 * 1. Exact family + weight + style match
 * 2. Exact family + style, closest weight
 * 3. Exact family, any weight/style
 * 4. Generic family expansion (e.g. 'sans-serif' → system sans stack)
 * 5. First available font as last resort
 *
 * @param fonts The registered font faces.
 * @param family Requested font family.
 * @param weight Requested font weight.
 * @param style Requested font style.
 * @returns Best font match or null if no fonts are registered.
 */
function matchFont(
  fonts: readonly FontFaceEntry[],
  family: string,
  weight: number | string,
  style: 'normal' | 'italic' | 'oblique',
): FontMatch | null {
  const normalizedWeight = normalizeWeight(weight)

  // Resolve generic family to a concrete stack
  const familiesToTry = resolveFamilyStack(family)

  for (const tryFamily of familiesToTry) {
    // Priority 1: Exact match
    const exact = fonts.find(
      (f) =>
        f.family.toLowerCase() === tryFamily.toLowerCase() &&
        normalizeWeight(f.weight) === normalizedWeight &&
        f.style === style,
    )
    if (exact) {
      return {
        fontFamily: exact.family,
        requestedFamily: family,
        fontWeight: exact.weight,
        fontStyle: exact.style,
        isFallback: exact.family.toLowerCase() !== family.toLowerCase(),
        metrics: exact.metrics,
      }
    }

    // Priority 2: Same family + style, closest weight
    const sameFamilyAndStyle = fonts.filter(
      (f) =>
        f.family.toLowerCase() === tryFamily.toLowerCase() &&
        f.style === style,
    )
    if (sameFamilyAndStyle.length > 0) {
      const closest = findClosestWeight(sameFamilyAndStyle, normalizedWeight)
      return {
        fontFamily: closest.family,
        requestedFamily: family,
        fontWeight: closest.weight,
        fontStyle: closest.style,
        isFallback: closest.family.toLowerCase() !== family.toLowerCase(),
        metrics: closest.metrics,
      }
    }

    // Priority 3: Same family, any style
    const sameFamily = fonts.filter(
      (f) => f.family.toLowerCase() === tryFamily.toLowerCase(),
    )
    if (sameFamily.length > 0) {
      const closest = findClosestWeight(sameFamily, normalizedWeight)
      return {
        fontFamily: closest.family,
        requestedFamily: family,
        fontWeight: closest.weight,
        fontStyle: closest.style,
        isFallback: closest.family.toLowerCase() !== family.toLowerCase(),
        metrics: closest.metrics,
      }
    }
  }

  // Priority 5: First available font
  if (fonts.length > 0) {
    return {
      fontFamily: fonts[0].family,
      requestedFamily: family,
      fontWeight: fonts[0].weight,
      fontStyle: fonts[0].style,
      isFallback: true,
      metrics: fonts[0].metrics,
    }
  }

  return null
}

/**
 * Resolves a font family name to a concrete list of families to try.
 *
 * Expands generic CSS font families (e.g., 'sans-serif') to platform-specific
 * font stacks, and falls back to system fonts for unknown families.
 * @param family The font family to resolve.
 * @returns Ordered list of font families to try.
 */
function resolveFamilyStack(family: string): readonly string[] {
  const lower = family.toLowerCase()

  // Expand generic families
  const stack = GENERIC_FONT_STACKS[lower]
  if (stack) return stack

  // Try the family itself first, then fall back to the system chain
  return [family, ...SYSTEM_FALLBACK_CHAIN]
}

/**
 * Finds a fallback font that can cover a specific text string.
 *
 * Iterates through the system fallback chain to find a font that can
 * render the given text, excluding fonts already tried.
 *
 * AI-TEMP: This implementation assumes all fonts cover ASCII/Latin and
 * tries system fallback fonts for non-Latin scripts. Full glyph coverage
 * checking requires access to font cmap tables via browser FontFace API
 * or a server-side font analysis service.
 *
 * @param fonts The registered font faces.
 * @param text The text that needs coverage.
 * @param excludeFamilies Font families already tried (to exclude).
 * @param weight Requested weight.
 * @param style Requested style.
 * @returns A fallback font match or null.
 */
function findFallbackFont(
  fonts: readonly FontFaceEntry[],
  text: string,
  excludeFamilies: readonly string[],
  weight: number | string,
  style: 'normal' | 'italic' | 'oblique',
): FontMatch | null {
  const excludeSet = new Set(excludeFamilies.map((f) => f.toLowerCase()))
  const normalizedWeight = normalizeWeight(weight)

  // Try each system fallback font
  for (const fbFamily of SYSTEM_FALLBACK_CHAIN) {
    if (excludeSet.has(fbFamily.toLowerCase())) continue

    const match = matchFont(fonts, fbFamily, weight, style)
    if (match) {
      match.isFallback = true
      return match
    }
  }

  // If no registered fonts match, create a virtual fallback with estimated metrics
  // that the shaper can use for measurement
  return {
    fontFamily: SYSTEM_FALLBACK_CHAIN[0],
    requestedFamily: SYSTEM_FALLBACK_CHAIN[0],
    fontWeight: normalizedWeight,
    fontStyle: style,
    isFallback: true,
    metrics: getApproximateMetrics(SYSTEM_FALLBACK_CHAIN[0]),
  }
}

/**
 * Normalizes a font weight value to a standard numeric weight.
 * @param weight Font weight as number or string (e.g., 'bold', 'normal').
 * @returns Numeric weight value (100–900).
 */
function normalizeWeight(weight: number | string): number {
  if (typeof weight === 'number') {
    return Math.max(100, Math.min(900, Math.round(weight / 100) * 100))
  }

  switch (weight.toString().toLowerCase()) {
    case 'thin':
    case 'hairline':
      return 100
    case 'extralight':
    case 'ultralight':
      return 200
    case 'light':
      return 300
    case 'normal':
    case 'regular':
      return 400
    case 'medium':
      return 500
    case 'semibold':
    case 'demibold':
      return 600
    case 'bold':
      return 700
    case 'extrabold':
    case 'ultrabold':
      return 800
    case 'black':
    case 'heavy':
      return 900
    default:
      return 400
  }
}

/**
 * Finds the font with the closest weight to the target.
 *
 * Prefers exact match, then the next heavier weight, then the next lighter.
 * @param fonts Font candidates (same family, same style).
 * @param targetWeight Target numeric weight.
 * @returns Closest font face.
 */
function findClosestWeight(
  fonts: readonly FontFaceEntry[],
  targetWeight: number,
): FontFaceEntry {
  let best = fonts[0]
  let bestDiff = Math.abs(normalizeWeight(best.weight) - targetWeight)

  for (let i = 1; i < fonts.length; i++) {
    const diff = Math.abs(normalizeWeight(fonts[i].weight) - targetWeight)
    // Prefer heavier when same distance (CSS font matching rule)
    if (
      diff < bestDiff ||
      (diff === bestDiff && normalizeWeight(fonts[i].weight) > normalizeWeight(best.weight))
    ) {
      best = fonts[i]
      bestDiff = diff
    }
  }

  return best
}

/**
 * Resolves a font match for a text run (Stage 4 entry point).
 *
 * Attempts to match the run's font family, falling back through the
 * system chain if no exact match is found.
 *
 * @param registry The font registry (or null for system-only fallback).
 * @param style The resolved text style to match.
 * @returns A font match result.
 */
export function resolveFontForRun(
  registry: FontRegistry | null,
  style: ResolvedTextStyle,
): FontMatch {
  if (registry) {
    const match = registry.match(style.fontFamily, style.fontWeight, style.fontStyle)
    if (match) return match
  }

  // No registry or no match — use approximate metrics
  return {
    fontFamily: style.fontFamily,
    requestedFamily: style.fontFamily,
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
    isFallback: false,
    metrics: getApproximateMetrics(style.fontFamily),
  }
}

/**
 * Resolves a font for a character using the fallback chain (Stage 5).
 *
 * When the primary font can't render a character, this searches the
 * fallback chain for a font that can.
 *
 * @param registry The font registry.
 * @param char The character that needs coverage.
 * @param primaryFont The primary font that lacked coverage.
 * @param style The text style for matching.
 * @returns A fallback font match.
 */
export function resolveFallbackForChar(
  registry: FontRegistry | null,
  char: string,
  primaryFont: FontMatch,
  style: ResolvedTextStyle,
): FontMatch {
  if (registry) {
    const fallback = registry.findFallback(char, [primaryFont.fontFamily], style.fontWeight, style.fontStyle)
    if (fallback) return fallback
  }

  // No registry — use a different system font
  return {
    fontFamily: SYSTEM_FALLBACK_CHAIN[0],
    requestedFamily: style.fontFamily,
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
    isFallback: true,
    metrics: getApproximateMetrics(SYSTEM_FALLBACK_CHAIN[0]),
  }
}
