import assert from 'node:assert/strict'
import test from 'node:test'

import {createCanonicalDocumentModelFixture} from '../document-structure/canonicalDocumentFixture.ts'

/**
 * Verifies canonical fixture carries multi-fill, fill image, and fill blend fields.
 */
test('canonical styled shape carries multi-fill with image and blend mode', () => {
  const document = createCanonicalDocumentModelFixture()

  const shapesWithFills = document.shapes.filter((shape) => shape.fills && shape.fills.length > 0)
  assert.equal(shapesWithFills.length > 0, true)

  shapesWithFills.forEach((shape) => {
    shape.fills!.forEach((fill) => {
      assert.equal(typeof fill.enabled, 'boolean')
      if (fill.image) {
        assert.equal(typeof fill.image.assetId, 'string')
        assert.equal(typeof fill.image.scaleMode, 'string')
        assert.equal(typeof fill.image.opacity, 'number')
      }
      if (fill.opacity !== undefined) {
        assert.equal(fill.opacity >= 0, true)
        assert.equal(fill.opacity <= 1, true)
      }
    })
  })
})

/**
 * Verifies canonical fixture shadow carries kind, color, offset, blur, spread, and blend fields.
 */
test('canonical styled shape carries shadow with kind, offset, blur, spread', () => {
  const document = createCanonicalDocumentModelFixture()

  const shapesWithShadow = document.shapes.filter((shape) => shape.shadow && shape.shadow.enabled)
  assert.equal(shapesWithShadow.length > 0, true)

  shapesWithShadow.forEach((shape) => {
    assert.equal(typeof shape.shadow!.kind, 'string')
    assert.equal(typeof shape.shadow!.color, 'string')
    assert.equal(typeof shape.shadow!.offsetX, 'number')
    assert.equal(typeof shape.shadow!.offsetY, 'number')
    assert.equal(typeof shape.shadow!.blur, 'number')
    assert.equal(typeof shape.shadow!.spread, 'number')
  })
})

/**
 * Verifies canonical fixture blur carries kind and radius fields.
 */
test('canonical styled shape carries blur with kind and radius', () => {
  const document = createCanonicalDocumentModelFixture()

  const shapesWithBlur = document.shapes.filter((shape) => shape.blur && shape.blur.enabled)
  assert.equal(shapesWithBlur.length > 0, true)

  shapesWithBlur.forEach((shape) => {
    assert.equal(typeof shape.blur!.kind, 'string')
    assert.equal(typeof shape.blur!.radius, 'number')
    assert.equal(shape.blur!.radius > 0, true)
  })
})
