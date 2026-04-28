import assert from 'node:assert/strict'
import test from 'node:test'

import type {ViewportIntent} from './ViewportIntent.ts'

/**
 * Returns the discriminant so tests can validate union branch compatibility.
 */
function getIntentType(intent: ViewportIntent): ViewportIntent['type'] {
  return intent.type
}

test('ViewportIntent supports pan-by and zoom-at branches', () => {
  // Assert common interactive intents stay available for wheel and gesture reducers.
  const panType = getIntentType({type: 'pan-by', dx: 10, dy: -4})
  const zoomType = getIntentType({type: 'zoom-at', scaleDelta: 0.2, anchor: {x: 4, y: 8}})

  assert.equal(panType, 'pan-by')
  assert.equal(zoomType, 'zoom-at')
})

test('ViewportIntent supports fit and none control branches', () => {
  // Assert non-gesture viewport control signals remain part of the public contract.
  const fitSelectionType = getIntentType({type: 'fit-selection'})
  const fitContentType = getIntentType({type: 'fit-content'})
  const noneType = getIntentType({type: 'none'})

  assert.equal(fitSelectionType, 'fit-selection')
  assert.equal(fitContentType, 'fit-content')
  assert.equal(noneType, 'none')
})

