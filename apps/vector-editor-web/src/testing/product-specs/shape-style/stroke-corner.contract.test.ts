import assert from 'node:assert/strict'
import test from 'node:test'

import {createCanonicalDocumentModelFixture} from '../document-structure/canonicalDocumentFixture.ts'

/**
 * Verifies canonical stroke carries dash pattern, custom dash, align, cap, join, and weight fields.
 */
test('canonical styled shape carries stroke with dash, cap, join, align, and weight', () => {
  const document = createCanonicalDocumentModelFixture()

  const shapesWithStrokes = document.shapes.filter((shape) => shape.strokes && shape.strokes.length > 0)
  assert.equal(shapesWithStrokes.length > 0, true)

  shapesWithStrokes.forEach((shape) => {
    shape.strokes!.forEach((stroke) => {
      assert.equal(typeof stroke.enabled, 'boolean')
      assert.equal(typeof stroke.color, 'string')
      assert.equal(typeof stroke.weight, 'number')
      if (stroke.dashPattern) {
        assert.equal(typeof stroke.dashPattern, 'string')
      }
      if (stroke.customDash) {
        assert.equal(Array.isArray(stroke.customDash), true)
        assert.equal(stroke.customDash.length >= 2, true)
      }
      if (stroke.align) {
        assert.equal(['center', 'inside', 'outside'].includes(stroke.align), true)
      }
      if (stroke.cap) {
        assert.equal(['none', 'round', 'square'].includes(stroke.cap), true)
      }
      if (stroke.join) {
        assert.equal(['bevel', 'round', 'miter'].includes(stroke.join), true)
      }
    })
  })
})

/**
 * Verifies canonical cornerRadii, cornerRadius, ellipse angles, and boolean operation fields.
 */
test('canonical styled shape carries cornerRadii, ellipse angles, and boolean operation', () => {
  const document = createCanonicalDocumentModelFixture()

  const shapesWithCorners = document.shapes.filter(
    (shape) => shape.cornerRadii && Object.values(shape.cornerRadii).some((v) => v > 0),
  )
  assert.equal(shapesWithCorners.length > 0, true)

  shapesWithCorners.forEach((shape) => {
    assert.equal(typeof shape.cornerRadii!.topLeft, 'number')
    assert.equal(typeof shape.cornerRadii!.topRight, 'number')
    assert.equal(typeof shape.cornerRadii!.bottomRight, 'number')
    assert.equal(typeof shape.cornerRadii!.bottomLeft, 'number')
  })

  const shapesWithEllipse = document.shapes.filter(
    (shape) => shape.ellipseStartAngle !== undefined || shape.ellipseEndAngle !== undefined,
  )
  assert.equal(shapesWithEllipse.length > 0, true)

  shapesWithEllipse.forEach((shape) => {
    if (shape.ellipseStartAngle !== undefined) {
      assert.equal(typeof shape.ellipseStartAngle, 'number')
    }
    if (shape.ellipseEndAngle !== undefined) {
      assert.equal(typeof shape.ellipseEndAngle, 'number')
    }
  })

  const shapesWithBoolean = document.shapes.filter((shape) => shape.booleanOperation)
  assert.equal(shapesWithBoolean.length > 0, true)
  shapesWithBoolean.forEach((shape) => {
    assert.equal(typeof shape.booleanOperation, 'string')
  })
})
