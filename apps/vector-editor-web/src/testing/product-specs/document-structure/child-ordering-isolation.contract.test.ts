import assert from 'node:assert/strict'
import test from 'node:test'

import {createCanonicalDocumentModelFixture} from '../document-structure/canonicalDocumentFixture.ts'

/**
 * Verifies child ordering is deterministic and stable across the canonical fixture.
 */
test('canonical document child ids array preserves deterministic ordering', () => {
  const document = createCanonicalDocumentModelFixture()

  const parents = document.shapes.filter((shape) => shape.childIds && shape.childIds.length > 0)
  assert.equal(parents.length > 0, true)

  parents.forEach((parent) => {
    assert.equal(Array.isArray(parent.childIds), true)
    assert.equal(parent.childIds!.length > 0, true)
    // Verify no duplicate child ids in the same parent
    assert.deepEqual(new Set(parent.childIds!).size, parent.childIds!.length)
    // Verify ordering is stable: same fixture produces same array order
    const document2 = createCanonicalDocumentModelFixture()
    const parent2 = document2.shapes.find((shape) => shape.id === parent.id)
    assert.ok(parent2)
    assert.deepEqual(parent.childIds, parent2?.childIds)
  })
})

/**
 * Verifies parent hierarchy chain expansion is deterministic.
 */
test('parent hierarchy chain expands same shape ids across fixture recreations', () => {
  const expand = () => {
    const document = createCanonicalDocumentModelFixture()
    const byId = new Map(document.shapes.map((shape) => [shape.id, shape]))
    const chains: Record<string, string[]> = {}
    document.shapes.forEach((shape) => {
      const chain: string[] = []
      let current = shape
      while (current.parentId) {
        const parent = byId.get(current.parentId)
        if (!parent) { break }
        chain.push(parent.id)
        current = parent
      }
      chains[shape.id] = chain
    })
    return chains
  }

  assert.deepEqual(expand(), expand())
})
