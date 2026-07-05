// Unit test for the registry produced by createCanvasElementRegistry.
// Covers register / registerMany / get / has / list / unregister behavior so the
// extensibility contract stays stable as the runtime evolves.
import assert from 'node:assert/strict'
import test from 'node:test'

import {createCanvasElementRegistry, type CanvasElementBehavior} from './extensibility.ts'

// Helper: minimal behavior stub that satisfies the structural contract without
// exercising real rendering or hit-test code paths.
const makeBehavior = (type: string): CanvasElementBehavior => ({
  type,
  render: () => {},
  hitTest: () => false,
})

test('createCanvasElementRegistry seeds initial behaviors', () => {
  const registry = createCanvasElementRegistry([makeBehavior('a'), makeBehavior('b')])
  assert.equal(registry.has('a'), true)
  assert.equal(registry.has('b'), true)
  // Listing must reflect all seeded behaviors regardless of insertion order semantics.
  assert.equal(registry.list().length, 2)
})

test('register replaces an existing behavior with the same type key', () => {
  const registry = createCanvasElementRegistry()
  const first = makeBehavior('shape')
  const second = makeBehavior('shape')
  registry.register(first)
  registry.register(second)
  // Map-based storage means the most recent registration must win.
  assert.equal(registry.get('shape'), second)
  assert.equal(registry.list().length, 1)
})

test('registerMany adds all behaviors in one pass', () => {
  const registry = createCanvasElementRegistry()
  registry.registerMany([makeBehavior('x'), makeBehavior('y')])
  assert.equal(registry.has('x'), true)
  assert.equal(registry.has('y'), true)
})

test('unregister removes a behavior and clears has()/get()', () => {
  const registry = createCanvasElementRegistry([makeBehavior('z')])
  registry.unregister('z')
  assert.equal(registry.has('z'), false)
  assert.equal(registry.get('z'), undefined)
})

test('get returns undefined for unknown type without throwing', () => {
  const registry = createCanvasElementRegistry()
  assert.equal(registry.get('missing'), undefined)
})
