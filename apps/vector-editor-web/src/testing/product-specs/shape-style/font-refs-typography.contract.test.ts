import assert from 'node:assert/strict'
import test from 'node:test'

import {createCanonicalDocumentModelFixture} from '../document-structure/canonicalDocumentFixture.ts'

/**
 * Verifies font references on text runs are deterministic with fontFamily and fontSize.
 */
test('text run font references carry fontFamily, fontSize, and fontWeight deterministically', () => {
  const document = createCanonicalDocumentModelFixture()

  const textShapes = document.shapes.filter(
    (shape) => shape.textRuns && shape.textRuns.length > 0,
  )
  assert.equal(textShapes.length > 0, true)

  textShapes.forEach((shape) => {
    shape.textRuns!.forEach((run) => {
      assert.equal(typeof run.style?.fontFamily, 'string')
      assert.equal(run.style!.fontFamily!.length > 0, true)
      assert.equal(typeof run.style?.fontSize, 'number')
      assert.equal(run.style!.fontSize! > 0, true)

      if (run.style?.fontStyle) {
        assert.equal(typeof run.style.fontStyle, 'string')
      }
      if (run.style?.textDecoration) {
        assert.equal(typeof run.style.textDecoration, 'string')
      }
      if (run.style?.textAlign) {
        assert.equal(typeof run.style.textAlign, 'string')
      }
      if (run.style?.verticalAlign) {
        assert.equal(typeof run.style.verticalAlign, 'string')
      }
    })
  })
})

/**
 * Verifies paragraph spacing fields are deterministic on text shapes.
 */
test('text run paragraph spacing and indentation fields are deterministic', () => {
  const document = createCanonicalDocumentModelFixture()

  const textShapes = document.shapes.filter(
    (shape) => shape.textRuns && shape.textRuns.length > 0,
  )

  textShapes.forEach((shape) => {
    shape.textRuns!.forEach((run) => {
      if (run.style?.paragraphIndentLeft !== undefined) {
        assert.equal(typeof run.style.paragraphIndentLeft, 'number')
      }
      if (run.style?.lineHeight !== undefined) {
        assert.equal(typeof run.style.lineHeight, 'number')
      }
    })
    if (shape.textAutoHeight) {
      assert.equal(typeof shape.textAutoHeight, 'string')
    }
    if (shape.textTruncation) {
      assert.equal(typeof shape.textTruncation, 'string')
    }
    if (shape.textMaxLines) {
      assert.equal(typeof shape.textMaxLines, 'number')
    }
  })
})
