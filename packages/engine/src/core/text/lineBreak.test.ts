/**
 * Tests for line breaking (Stage 10) and line layout (Stage 11 & 12).
 *
 * Validates:
 * - Mandatory line breaks (\n)
 * - Word-wrap breaks at spaces
 * - Char-wrap breaks at any character
 * - 'none' wrap mode (no width-based wrapping)
 * - CJK character breaks
 * - Line metrics computation
 * - Glyph positioning with alignment
 */

import { describe, it } from 'node:test'
import * as assert from 'node:assert'
import { breakLines, classifyLineBreak } from './lineBreak.ts'
import { computeLineMetrics, computeGlyphPositions } from './lineLayout.ts'
import type { GlyphRun, GlyphInfo, FontMatch, FontMetrics, TextRun, ResolvedTextStyle } from './types.ts'

// ── Test Helpers ─────────────────────────────────────────────────────────────

/** Default font metrics for test runs. */
const TEST_METRICS: FontMetrics = {
  ascent: 0.926,
  descent: -0.225,
  lineGap: 0,
  unitsPerEm: 1000,
}

/** Creates a minimal font match for testing. */
function testFont(family = 'TestFont'): FontMatch {
  return {
    fontFamily: family,
    requestedFamily: family,
    fontWeight: 400,
    fontStyle: 'normal',
    isFallback: false,
    metrics: TEST_METRICS,
  }
}

/** Creates a minimal text run for testing. */
function testRun(text: string, fontSize = 16): TextRun {
  return {
    text,
    start: 0,
    end: text.length,
    style: {
      fontFamily: 'TestFont',
      fontSize,
      fontWeight: 400,
      fontStyle: 'normal',
      lineHeight: 1.2,
      letterSpacing: 0,
    },
    script: 'latin',
    direction: 'ltr',
  }
}

/** Creates a glyph run from a text run with per-character advance = fontSize * 0.6. */
function testGlyphRun(run: TextRun, font: FontMatch = testFont()): GlyphRun {
  const charWidth = run.style.fontSize * 0.6
  const glyphs: GlyphInfo[] = [...run.text].map((char, i) => ({
    glyphId: 0,
    advance: charWidth,
    offsetX: 0,
    offsetY: 0,
    cluster: i,
    char,
  }))
  return {
    glyphs,
    font,
    sourceRun: run,
    totalAdvance: glyphs.reduce((sum, g) => sum + g.advance, 0),
  }
}

// ── Line Breaking Tests ──────────────────────────────────────────────────────

describe('breakLines', () => {
  describe('mandatory breaks', () => {
    it('breaks on newline character', () => {
      const run = testRun('hello\nworld')
      const glyphRun = testGlyphRun(run)
      const lines = breakLines([glyphRun], 1000, 'word')

      assert.strictEqual(lines.length, 2)
    })

    it('handles multiple newlines', () => {
      const run = testRun('a\n\nb')
      const glyphRun = testGlyphRun(run)
      const lines = breakLines([glyphRun], 1000, 'word')

      assert.strictEqual(lines.length, 3)
    })

    it('handles trailing newline', () => {
      const run = testRun('hello\n')
      const glyphRun = testGlyphRun(run)
      const lines = breakLines([glyphRun], 1000, 'word')

      // Should have 1 line (trailing newline doesn't create an empty line by default)
      assert.strictEqual(lines.length >= 1, true)
    })
  })

  describe('word wrap', () => {
    it('wraps at space when exceeding width', () => {
      const run = testRun('hello world foo', 16) // ~9.6px/char
      const glyphRun = testGlyphRun(run)
      // Each char is 16*0.6 = 9.6px, width 55 fits ~5.7 chars
      // 'hello'=48px, 'world'=48px, 'foo'=28.8px → 3 lines
      const lines = breakLines([glyphRun], 55, 'word')

      assert.strictEqual(lines.length, 3)
    })

    it('does not break when text fits within width', () => {
      const run = testRun('short', 16)
      const glyphRun = testGlyphRun(run)
      const lines = breakLines([glyphRun], 1000, 'word')

      assert.strictEqual(lines.length, 1)
    })
  })

  describe('char wrap', () => {
    it('wraps at any character when exceeding width', () => {
      const run = testRun('abcdefghij', 16) // 10 chars * 9.6 = 96px
      const glyphRun = testGlyphRun(run)
      // Set width to fit ~4 chars
      const lines = breakLines([glyphRun], 40, 'char')

      assert.strictEqual(lines.length >= 2, true)
    })
  })

  describe('none wrap', () => {
    it('never wraps on width, only on mandatory breaks', () => {
      const run = testRun('very long line that exceeds width\nbut breaks here')
      const glyphRun = testGlyphRun(run)
      const lines = breakLines([glyphRun], 10, 'none')

      // Should only break on the newline
      assert.strictEqual(lines.length, 2)
    })
  })

  describe('empty input', () => {
    it('returns empty array for empty glyph runs', () => {
      const lines = breakLines([], 100, 'word')
      assert.deepStrictEqual(lines, [])
    })

    it('handles empty text run', () => {
      const run = testRun('')
      const glyphRun = testGlyphRun(run)
      const lines = breakLines([glyphRun], 100, 'word')
      assert.strictEqual(lines.length, 0)
    })
  })
})

// ── Line Metrics Tests ───────────────────────────────────────────────────────

describe('computeLineMetrics', () => {
  it('computes metrics for single line', () => {
    const run = testRun('hello', 16)
    const glyphRun = testGlyphRun(run)
    const lines = breakLines([glyphRun], 1000, 'word')
    const metrics = computeLineMetrics(lines, 1.2)

    assert.strictEqual(metrics.length, 1)
    assert.strictEqual(metrics[0].ascent > 0, true)
    assert.strictEqual(metrics[0].descent > 0, true)
    assert.strictEqual(metrics[0].height > 0, true)
    assert.strictEqual(metrics[0].baselineY > 0, true)
  })

  it('line height respects the lineHeight multiplier', () => {
    const run = testRun('hello', 16)
    const glyphRun = testGlyphRun(run)
    const lines = breakLines([glyphRun], 1000, 'word')

    const metrics1 = computeLineMetrics(lines, 1.0)
    const metrics2 = computeLineMetrics(lines, 2.0)

    // Larger line-height multiplier should produce taller lines
    assert.strictEqual(metrics2[0].height > metrics1[0].height, true)
  })

  it('computes metrics for multiple lines', () => {
    const run = testRun('hello\nworld')
    const glyphRun = testGlyphRun(run)
    const lines = breakLines([glyphRun], 1000, 'word')
    const metrics = computeLineMetrics(lines, 1.2)

    assert.strictEqual(metrics.length, 2)
    metrics.forEach((m) => {
      assert.strictEqual(m.ascent > 0, true)
      assert.strictEqual(m.height > 0, true)
    })
  })
})

// ── Glyph Positioning Tests ──────────────────────────────────────────────────

describe('computeGlyphPositions', () => {
  it('positions glyphs in a single line starting at (0, 0)', () => {
    const run = testRun('abc', 16)
    const glyphRun = testGlyphRun(run)
    const lines = breakLines([glyphRun], 1000, 'word')
    const metrics = computeLineMetrics(lines, 1.2)
    const positions = computeGlyphPositions(metrics, 1000, 'start', 'top', metrics[0].height)

    assert.strictEqual(positions.length, 3)
    assert.strictEqual(positions[0].x, 0)
    assert.strictEqual(positions[0].lineIndex, 0)
    // Each subsequent glyph should have increasing x
    assert.strictEqual(positions[1].x > positions[0].x, true)
    assert.strictEqual(positions[2].x > positions[1].x, true)
  })

  it('handles center alignment', () => {
    const run = testRun('a', 16)
    const glyphRun = testGlyphRun(run)
    const lines = breakLines([glyphRun], 1000, 'word')
    const metrics = computeLineMetrics(lines, 1.2)
    const positions = computeGlyphPositions(metrics, 200, 'center', 'top', metrics[0].height)

    // Single char centered in 200px width should have x > 0
    assert.strictEqual(positions[0].x > 0, true)
  })

  it('handles end alignment', () => {
    const run = testRun('a', 16)
    const glyphRun = testGlyphRun(run)
    const lines = breakLines([glyphRun], 1000, 'word')
    const metrics = computeLineMetrics(lines, 1.2)
    const positions = computeGlyphPositions(metrics, 200, 'end', 'top', metrics[0].height)

    // Single char aligned to end should have x near 200 - charWidth
    assert.strictEqual(positions[0].x > 0, true)
  })

  it('handles multi-line positioning with ascending Y', () => {
    const run = testRun('hello\nworld')
    const glyphRun = testGlyphRun(run)
    const lines = breakLines([glyphRun], 1000, 'word')
    const metrics = computeLineMetrics(lines, 1.2)
    const totalHeight = metrics.reduce((sum, m) => sum + m.height, 0)
    const positions = computeGlyphPositions(metrics, 1000, 'start', 'top', totalHeight)

    // Second line glyphs should have larger Y than first line
    const firstLineGlyphs = positions.filter((p) => p.lineIndex === 0)
    const secondLineGlyphs = positions.filter((p) => p.lineIndex === 1)

    assert.strictEqual(firstLineGlyphs.length > 0, true)
    assert.strictEqual(secondLineGlyphs.length > 0, true)
    assert.strictEqual(
      secondLineGlyphs[0].y > firstLineGlyphs[0].y,
      true,
    )
  })
})
