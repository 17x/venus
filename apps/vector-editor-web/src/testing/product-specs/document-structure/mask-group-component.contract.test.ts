import assert from 'node:assert/strict'
import test from 'node:test'

import {createCanonicalDocumentModelFixture} from '../document-structure/canonicalDocumentFixture.ts'
import {resolveMaskGroupMembers, resolveMaskSourceNode} from '../../../runtime/interaction/maskGroup.ts'

/**
 * Verifies canonical fixture carries valid parent-child group invariants.
 */
test('canonical document parent-child ids form consistent group hierarchy', () => {
  const document = createCanonicalDocumentModelFixture()
  const byId = new Map(document.shapes.map((shape) => [shape.id, shape]))

  const childrenWithParent = document.shapes.filter((shape) => shape.parentId)
  assert.equal(childrenWithParent.length > 0, true)

  childrenWithParent.forEach((child) => {
    const parent = byId.get(child.parentId!)
    assert.ok(parent, `parent ${child.parentId} missing for child ${child.id}`)
    assert.equal(parent.childIds?.includes(child.id), true)
  })

  const parents = document.shapes.filter((shape) => shape.childIds && shape.childIds.length > 0)
  assert.equal(parents.length > 0, true)

  parents.forEach((parent) => {
    parent.childIds!.forEach((childId) => {
      const child = byId.get(childId)
      assert.ok(child, `child ${childId} in parent ${parent.id} childIds missing`)
      assert.equal(child?.parentId, parent.id)
    })
  })
})

/**
 * Verifies mask group membership resolves source and linked shapes deterministically.
 */
test('mask group membership resolves source and linked shapes', () => {
  const document = createCanonicalDocumentModelFixture()

  const maskSource = document.shapes.find((shape) => shape.schema?.maskRole === 'source')
  assert.ok(maskSource)

  const members = resolveMaskGroupMembers(document, maskSource!.id)
  assert.equal(members.length > 0, true)

  const sourceNode = resolveMaskSourceNode(document, maskSource!)
  assert.ok(sourceNode)
})

/**
 * Verifies boolean operation and component fields are deterministic on styled shapes.
 */
test('canonical styled shape carries boolean operation, component id, and component properties', () => {
  const document = createCanonicalDocumentModelFixture()

  const shapesWithBoolean = document.shapes.filter((shape) => shape.booleanOperation)
  assert.equal(shapesWithBoolean.length > 0, true)
  shapesWithBoolean.forEach((shape) => {
    assert.equal(typeof shape.booleanOperation, 'string')
  })

  const shapesWithComponent = document.shapes.filter((shape) => shape.componentId)
  assert.equal(shapesWithComponent.length > 0, true)
  shapesWithComponent.forEach((shape) => {
    assert.equal(typeof shape.componentId, 'string')
    assert.ok(shape.componentProperties)
    assert.equal(typeof shape.componentProperties, 'object')
  })

  const shapesWithClip = document.shapes.filter((shape) => shape.clipPathId)
  assert.equal(shapesWithClip.length > 0, true)
  shapesWithClip.forEach((shape) => {
    assert.equal(typeof shape.clipPathId, 'string')
    assert.equal(typeof shape.clipRule, 'string')
    assert.equal(['evenodd', 'nonzero'].includes(shape.clipRule!), true)
  })
})
