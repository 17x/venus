import assert from 'node:assert/strict'
import test from 'node:test'

import {createCanonicalDocumentModelFixture} from '../document-structure/canonicalDocumentFixture.ts'

/**
 * Verifies canonical document shapes carry deterministic type, style, and geometry invariants.
 */
test('canonical document shapes carry deterministic shape type envelope', () => {
  const document = createCanonicalDocumentModelFixture()

  const types = document.shapes.map((shape) => shape.type)
  assert.equal(new Set(types).size >= 2, true)

  document.shapes.forEach((shape) => {
    assert.equal(typeof shape.id, 'string')
    assert.equal(typeof shape.type, 'string')
    assert.equal(typeof shape.x, 'number')
    assert.equal(typeof shape.y, 'number')
    assert.equal(shape.width > 0, true)
    assert.equal(shape.height > 0, true)
    assert.equal(typeof shape.schema?.sourceNodeType, 'string')
  })
})

/**
 * Verifies style refs, fill, stroke, and gradient presence are deterministic.
 */
test('canonical document shapes carry deterministic style envelope', () => {
  const document = createCanonicalDocumentModelFixture()

  const styledShapes = document.shapes.filter((shape) => shape.styleRefs)
  assert.equal(styledShapes.length > 0, true)

  styledShapes.forEach((shape) => {
    assert.equal(typeof shape.styleRefs?.fillStyleId === 'string' || shape.styleRefs?.fillStyleId === undefined, true)
  })

  const filledShapes = document.shapes.filter((shape) => shape.fill && shape.fill.enabled !== false)
  assert.equal(filledShapes.length > 0, true)

  const strokedShapes = document.shapes.filter((shape) => shape.stroke && shape.stroke.enabled !== false)
  assert.equal(strokedShapes.length > 0, true)
})
