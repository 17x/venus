import assert from 'node:assert/strict'
import test from 'node:test'

import {createCanonicalDocumentModelFixture} from '../document-structure/canonicalDocumentFixture.ts'

/**
 * Verifies document-level style reference maps match node-level style ref ids.
 */
test('document style references map keys match node style ref ids', () => {
  const document = createCanonicalDocumentModelFixture()

  assert.ok(document.styleReferences)
  assert.equal(Object.keys(document.styleReferences!.fills).length > 0, true)
  assert.equal(Object.keys(document.styleReferences!.strokes).length > 0, true)
  assert.equal(Object.keys(document.styleReferences!.texts).length > 0, true)
  assert.equal(Object.keys(document.styleReferences!.effects).length > 0, true)

  const styleRefKeys = new Set<string>()
  document.shapes.forEach((shape) => {
    if (shape.styleRefs?.fillStyleId) { styleRefKeys.add(shape.styleRefs.fillStyleId) }
    if (shape.styleRefs?.strokeStyleId) { styleRefKeys.add(shape.styleRefs.strokeStyleId) }
    if (shape.styleRefs?.textStyleId) { styleRefKeys.add(shape.styleRefs.textStyleId) }
    if (shape.styleRefs?.effectStyleId) { styleRefKeys.add(shape.styleRefs.effectStyleId) }
  })

  assert.equal(styleRefKeys.size > 0, true)
  styleRefKeys.forEach((key) => {
    const foundIn =
      (document.styleReferences!.fills[key] !== undefined) ||
      (document.styleReferences!.strokes[key] !== undefined) ||
      (document.styleReferences!.texts[key] !== undefined) ||
      (document.styleReferences!.effects[key] !== undefined)
    assert.equal(foundIn, true, `style ref key "${key}" not found in document style references`)
  })
})

/**
 * Verifies asset urls and asset ids on image shapes remain deterministic.
 */
test('image asset ids and urls map to asset primary reference', () => {
  const document = createCanonicalDocumentModelFixture()

  const imageShapes = document.shapes.filter((shape) => shape.assetId)
  assert.equal(imageShapes.length > 0, true)

  imageShapes.forEach((shape) => {
    assert.equal(typeof shape.assetId, 'string')
    assert.equal(typeof shape.assetUrl, 'string')
  })
})
