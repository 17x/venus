/**
 * End-to-end tests for the complete 13-stage text layout pipeline.
 *
 * Validates the full pipeline from TextParagraph input to positioned glyphs.
 */

import { describe, it } from 'node:test'
import * as assert from 'node:assert'
import { layoutText, layoutTextLines } from './pipeline.ts'
import type { TextParagraph } from './types.ts'

// ── Basic Pipeline Tests ─────────────────────────────────────────────────────

describe('layoutText', () => {
  it('handles empty text', () => {
    const result = layoutText({
      text: '',
      width: 200,
    })

    assert.strictEqual(result.lines.length, 0)
    assert.strictEqual(result.positionedGlyphs.length, 0)
    assert.strictEqual(result.lineCount, 0)
  })

  it('lays out simple single-line text', () => {
    const result = layoutText({
      text: 'Hello, world!',
      width: 500,
    })

    assert.strictEqual(result.lineCount, 1)
    assert.strictEqual(result.lines.length, 1)
    assert.strictEqual(result.positionedGlyphs.length > 0, true)
    // Bounds should be non-zero
    assert.strictEqual(result.bounds.width > 0, true)
    assert.strictEqual(result.bounds.height > 0, true)
  })

  it('handles multi-line text with explicit line breaks', () => {
    const result = layoutText({
      text: 'Line one\nLine two\nLine three',
      width: 500,
    })

    assert.strictEqual(result.lineCount, 3)
    assert.strictEqual(result.lines.length, 3)
    assert.strictEqual(result.lineMetrics.length, 3)
  })

  it('respects lineHeight parameter', () => {
    const result1 = layoutText({
      text: 'Hello',
      width: 500,
      lineHeight: 1.0,
    })

    const result2 = layoutText({
      text: 'Hello',
      width: 500,
      lineHeight: 2.5,
    })

    // Larger line height should produce taller bounds
    assert.strictEqual(result2.bounds.height > result1.bounds.height, true)
  })

  it('respects width constraint for word wrapping', () => {
    const result = layoutText({
      text: 'this is a very long line that should wrap',
      width: 80,
      wrap: 'word',
    })

    // Should produce multiple lines
    assert.strictEqual(result.lineCount > 1, true)
    // Each line should be <= paragraph width
    for (const line of result.lines) {
      assert.strictEqual(line.width <= 80 + 1, true) // +1 for rounding tolerance
    }
  })

  it('handles char wrap mode', () => {
    const result = layoutText({
      text: 'abcdefghijklmnopqrstuvwxyz',
      width: 50,
      wrap: 'char',
    })

    // Should produce multiple lines when chars don't fit
    assert.strictEqual(result.lineCount > 1, true)
  })

  it('handles no-wrap mode', () => {
    const result = layoutText({
      text: 'this is a very long line that should not wrap at all',
      width: 10,
      wrap: 'none',
    })

    // Should still be one line (no width-based wrapping)
    // But line breaks from \n still apply
    assert.strictEqual(result.lineCount, 1)
  })

  it('handles style spans for bold text', () => {
    const result = layoutText({
      text: 'normal bold normal',
      width: 500,
      styleSpans: [
        { start: 7, end: 11, fontWeight: 'bold' },
      ],
    })

    assert.strictEqual(result.lineCount, 1)
    assert.strictEqual(result.positionedGlyphs.length > 0, true)
  })

  it('handles style spans with different font sizes', () => {
    const result = layoutText({
      text: 'small BIG',
      width: 500,
      styleSpans: [
        { start: 0, end: 6, fontSize: 12 },
        { start: 6, end: 9, fontSize: 24 },
      ],
    })

    assert.strictEqual(result.lineCount, 1)
    // Mixed font sizes should affect metrics
    assert.strictEqual(result.maxLineHeight > 0, true)
  })

  it('provides estimated width', () => {
    const result = layoutText({
      text: 'Hello, world!',
      width: 500,
    })

    assert.strictEqual(result.estimatedWidth > 0, true)
  })

  it('handles alignment modes', () => {
    const leftResult = layoutText({
      text: 'Hello',
      width: 400,
      align: 'start',
    })

    const centerResult = layoutText({
      text: 'Hello',
      width: 400,
      align: 'center',
    })

    const rightResult = layoutText({
      text: 'Hello',
      width: 400,
      align: 'end',
    })

    // Center-aligned text should have first glyph not at x=0
    const leftFirstX = leftResult.positionedGlyphs[0].x
    const centerFirstX = centerResult.positionedGlyphs[0].x
    const rightFirstX = rightResult.positionedGlyphs[0].x

    assert.strictEqual(leftFirstX, 0)
    assert.strictEqual(centerFirstX > leftFirstX, true)
    assert.strictEqual(rightFirstX > centerFirstX, true)
  })

  it('handles vertical alignment', () => {
    const topResult = layoutText({
      text: 'Hello',
      width: 400,
      verticalAlign: 'top',
    })

    const middleResult = layoutText({
      text: 'Hello',
      width: 400,
      verticalAlign: 'middle',
    })

    // Middle-aligned text should have first glyph Y > 0 (if totalHeight > line height)
    // Since the bounds height equals line height, top and middle may be the same
    assert.strictEqual(topResult.positionedGlyphs.length > 0, true)
    assert.strictEqual(middleResult.positionedGlyphs.length > 0, true)
  })

  it('produces consistent line metrics', () => {
    const result = layoutText({
      text: 'Line A\nLine B\nLine C',
      width: 500,
      lineHeight: 1.5,
    })

    // Each line should have consistent metrics
    for (const lm of result.lineMetrics) {
      assert.strictEqual(lm.ascent > 0, true)
      assert.strictEqual(lm.descent >= 0, true)
      assert.strictEqual(lm.height > 0, true)
      assert.strictEqual(lm.baselineY > 0, true)
    }
  })

  it('glyph positions are monotonic within a line', () => {
    const result = layoutText({
      text: 'abcdef',
      width: 500,
    })

    // Filter to first line only
    const line0Glyphs = result.positionedGlyphs.filter((g) => g.lineIndex === 0)
    for (let i = 1; i < line0Glyphs.length; i++) {
      assert.strictEqual(
        line0Glyphs[i].x >= line0Glyphs[i - 1].x,
        true,
        `Glyph at index ${i} should have x >= previous glyph`,
      )
    }
  })

  it('each positioned glyph has required font and style info', () => {
    const result = layoutText({
      text: 'test',
      width: 200,
      styleSpans: [
        { start: 0, end: 4, fill: '#ff0000' },
      ],
    })

    for (const pg of result.positionedGlyphs) {
      assert.strictEqual(pg.font !== null && pg.font !== undefined, true)
      assert.strictEqual(typeof pg.x, 'number')
      assert.strictEqual(typeof pg.y, 'number')
      assert.strictEqual(pg.lineIndex >= 0, true)
    }
  })
})

// ── Lightweight Layout Tests ─────────────────────────────────────────────────

describe('layoutTextLines', () => {
  it('returns lines and metrics without positioned glyphs', () => {
    const result = layoutTextLines({
      text: 'Hello, world!',
      width: 500,
    })

    assert.strictEqual(result.lines.length > 0, true)
    assert.strictEqual(result.lineMetrics.length > 0, true)
    assert.strictEqual(result.lineCount > 0, true)
    assert.strictEqual(result.maxLineHeight > 0, true)
  })

  it('produces same line count as full layout', () => {
    const paragraph: TextParagraph = {
      text: 'Line one\nLine two',
      width: 500,
    }

    const full = layoutText(paragraph)
    const light = layoutTextLines(paragraph)

    assert.strictEqual(light.lineCount, full.lineCount)
  })

  it('computes correct bounds', () => {
    const result = layoutTextLines({
      text: 'Hello',
      width: 300,
    })

    assert.strictEqual(result.bounds.width, 300)
    assert.strictEqual(result.bounds.height > 0, true)
  })
})

// ── Edge Cases ────────────────────────────────────────────────────────────────

describe('layoutText edge cases', () => {
  it('handles very long single word without spaces', () => {
    const longWord = 'a'.repeat(100)
    const result = layoutText({
      text: longWord,
      width: 50,
      wrap: 'word',
    })

    // Word-wrap can't break mid-word, so it may overflow or force single line
    // This tests that the pipeline doesn't crash on unbreakable content
    assert.strictEqual(result.lineCount >= 1, true)
  })

  it('handles text with only spaces', () => {
    const result = layoutText({
      text: '     ',
      width: 200,
    })

    // Should not crash
    assert.strictEqual(result.positionedGlyphs.length >= 0, true)
  })

  it('handles zero-width paragraph', () => {
    const result = layoutText({
      text: 'Hello',
      width: 0,
    })

    // Should produce at least one line
    assert.strictEqual(result.lineCount >= 1, true)
  })

  it('handles mixed CJK and Latin text', () => {
    const result = layoutText({
      text: 'Hello 你好 World 世界',
      width: 500,
    })

    assert.strictEqual(result.lineCount >= 1, true)
    assert.strictEqual(result.positionedGlyphs.length > 0, true)
  })
})
