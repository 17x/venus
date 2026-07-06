/**
 * Tests for Unicode grapheme cluster parsing (Stage 2).
 *
 * Validates that parseGraphemeClusters correctly handles:
 * - Basic ASCII text
 * - Multi-byte characters (surrogate pairs)
 * - Combining marks
 * - Zero-width joiners (emoji sequences)
 * - Regional indicators (flags)
 * - Mixed scripts
 */

import { describe, it } from 'node:test'
import * as assert from 'node:assert'
import { parseGraphemeClusters } from './unicode.ts'

describe('parseGraphemeClusters', () => {
  it('returns empty array for empty string', () => {
    const clusters = parseGraphemeClusters('')
    assert.deepStrictEqual(clusters, [])
  })

  it('splits ASCII text into individual characters', () => {
    const clusters = parseGraphemeClusters('abc')
    assert.strictEqual(clusters.length, 3)
    assert.strictEqual(clusters[0].text, 'a')
    assert.strictEqual(clusters[0].start, 0)
    assert.strictEqual(clusters[0].end, 1)
    assert.strictEqual(clusters[1].text, 'b')
    assert.strictEqual(clusters[2].text, 'c')
  })

  it('handles surrogate pairs (emoji)', () => {
    // 😀 is U+1F600 — surrogate pair: \uD83D\uDE00
    const clusters = parseGraphemeClusters('a😀b')
    assert.strictEqual(clusters.length, 3)
    assert.strictEqual(clusters[0].text, 'a')
    assert.strictEqual(clusters[1].text, '😀')
    assert.strictEqual(clusters[1].start, 1)
    assert.strictEqual(clusters[1].end, 3) // spans 2 code units
    assert.strictEqual(clusters[2].text, 'b')
  })

  it('handles combining marks (e + acute accent)', () => {
    // é as e + combining acute accent: e\u0301
    const clusters = parseGraphemeClusters('cafe\u0301')
    assert.strictEqual(clusters.length, 4)
    assert.strictEqual(clusters[3].text, 'e\u0301')
    assert.strictEqual(clusters[3].end - clusters[3].start, 2)
  })

  it('handles zero-width joiner (emoji family)', () => {
    // Man + ZWJ + Woman + ZWJ + Girl: 👨‍👩‍👧
    const family = '\u{1F468}\u200D\u{1F469}\u200D\u{1F467}'
    const clusters = parseGraphemeClusters(family)
    // Should be treated as a single grapheme cluster
    assert.strictEqual(clusters.length, 1)
    assert.strictEqual(clusters[0].text, family)
  })

  it('handles regional indicator pairs (flag)', () => {
    // 🇺🇸 = U+1F1FA U+1F1F8
    const flag = '\u{1F1FA}\u{1F1F8}'
    const clusters = parseGraphemeClusters(flag)
    assert.strictEqual(clusters.length, 1)
    assert.strictEqual(clusters[0].text, flag)
  })

  it('preserves position information', () => {
    const clusters = parseGraphemeClusters('hello')
    for (let i = 0; i < clusters.length; i++) {
      assert.strictEqual(clusters[i].start, i)
      assert.strictEqual(clusters[i].end, i + 1)
    }
  })

  it('handles mixed text with emoji and combining marks', () => {
    const text = 'hi 😀 cafe\u0301'
    const clusters = parseGraphemeClusters(text)
    assert.strictEqual(clusters.length > 5, true) // At least h, i, space, 😀, space, c, a, f, é
  })

  it('handles CJK characters', () => {
    const clusters = parseGraphemeClusters('你好世界')
    assert.strictEqual(clusters.length, 4)
    assert.strictEqual(clusters[0].text, '你')
    assert.strictEqual(clusters[1].text, '好')
    assert.strictEqual(clusters[2].text, '世')
    assert.strictEqual(clusters[3].text, '界')
  })

  it('handles line breaks as individual characters', () => {
    const clusters = parseGraphemeClusters('a\nb')
    assert.strictEqual(clusters.length, 3)
    assert.strictEqual(clusters[0].text, 'a')
    assert.strictEqual(clusters[1].text, '\n')
    assert.strictEqual(clusters[2].text, 'b')
  })
})
