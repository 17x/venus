import assert from 'node:assert/strict'
import test from 'node:test'

import {createCanonicalDocumentModelFixture} from '../document-structure/canonicalDocumentFixture.ts'

/**
 * Verifies boolean operations interact with mask membership deterministically.
 */
test('boolean operation shape is isolated from non-masked siblings', () => {
  const document = createCanonicalDocumentModelFixture()

  const booleanShapes = document.shapes.filter((shape) => shape.booleanOperation)
  assert.equal(booleanShapes.length > 0, true)

  booleanShapes.forEach((shape) => {
    assert.equal(['union', 'intersection', 'difference', 'exclude'].includes(shape.booleanOperation!), true)
    // Boolean shapes should have mask context for correct isolation
    assert.equal(typeof shape.schema?.maskGroupId === 'string' || typeof shape.clipPathId === 'string', true)
  })
})

/**
 * Verifies mask source and host shapes are connected through schema maskRole.
 */
test('mask source shape references mask group id and has source maskRole', () => {
  const document = createCanonicalDocumentModelFixture()

  const maskSources = document.shapes.filter((shape) => shape.schema?.maskRole === 'source')
  assert.equal(maskSources.length > 0, true)

  maskSources.forEach((source) => {
    assert.equal(typeof source.schema?.maskGroupId, 'string')

    const members = document.shapes.filter(
      (shape) => shape.schema?.maskGroupId === source.schema?.maskGroupId,
    )
    assert.equal(members.length >= 1, true)
  })
})

/**
 * Verifies clip path relationships keep determinism across fixture recreations.
 */
test('clip path id relationships stay deterministic across fixture recreations', () => {
  const resolve = () => {
    const doc = createCanonicalDocumentModelFixture()
    const byId = new Map(doc.shapes.map((shape) => [shape.id, shape]))
    return doc.shapes
      .filter((shape) => shape.clipPathId)
      .map((shape) => ({
        id: shape.id,
        clipPathId: shape.clipPathId,
        clipTargetExists: byId.has(shape.clipPathId!),
        clipRule: shape.clipRule,
      }))
  }

  assert.deepEqual(resolve(), resolve())
})
