import assert from 'node:assert/strict'
import test from 'node:test'

import {createCanonicalDocumentModelFixture} from '../document-structure/canonicalDocumentFixture.ts'

/**
 * Verifies canonical fixture contains path geometry fields deterministically.
 */
test('canonical path shape carries points, bezier points, and arrowhead fields', () => {
  const document = createCanonicalDocumentModelFixture()
  const pathShapes = document.shapes.filter((shape) => shape.type === 'path')

  assert.equal(pathShapes.length > 0, true)

  pathShapes.forEach((shape) => {
    assert.equal(shape.points && shape.points.length > 0, true)
    assert.equal(shape.bezierPoints && shape.bezierPoints.length > 0, true)
    assert.equal(typeof shape.strokeStartArrowhead, 'string')
    assert.equal(typeof shape.strokeEndArrowhead, 'string')
  })
})

/**
 * Verifies canonical text shape carries text, text runs, and typography fields.
 */
test('canonical text shape carries text payload and text run style fields', () => {
  const document = createCanonicalDocumentModelFixture()
  const textShapes = document.shapes.filter((shape) => typeof shape.text === 'string' && shape.text.length > 0)

  assert.equal(textShapes.length > 0, true)

  textShapes.forEach((shape) => {
    assert.equal(shape.textRuns && shape.textRuns.length > 0, true)
    shape.textRuns!.forEach((run) => {
      assert.equal(typeof run.start, 'number')
      assert.equal(typeof run.end, 'number')
      assert.equal(run.end > run.start, true)
      assert.equal(typeof run.style?.fontFamily, 'string')
      assert.equal(typeof run.style?.fontSize, 'number')
      assert.equal(typeof run.style?.fontWeight === 'number' || run.style?.fontWeight === undefined, true)
    })
  })
})

/**
 * Verifies canonical fill/stroke shapes carry gradient payload fields.
 */
test('canonical styled shapes carry gradient type, stops, and geometry fields', () => {
  const document = createCanonicalDocumentModelFixture()
  const gradientFills = document.shapes
    .flatMap((shape) => (shape.fills ?? []))
    .filter((fill) => fill.gradient)

  assert.equal(gradientFills.length > 0, true)

  gradientFills.forEach((fill) => {
    assert.equal(['diamond', 'angular', 'linear', 'radial'].includes(fill.gradient!.type), true)
    assert.equal(fill.gradient!.stops.length >= 2, true)
    fill.gradient!.stops.forEach((stop) => {
      assert.equal(typeof stop.offset, 'number')
      assert.equal(typeof stop.color, 'string')
    })
  })
})
