import assert from 'node:assert/strict'
import test from 'node:test'

import {createHoverRuntime, updateHoverRuntime} from './HoverRuntime.ts'

test('hover runtime marks changed only when hit target changes', () => {
  const seeded = createHoverRuntime<{id: string}, {id: string}>({x: 0, y: 0})
  const unchanged = updateHoverRuntime(seeded, {
    screenPoint: {x: 1, y: 1},
    overlayHit: null,
    sceneHit: null,
  })
  assert.equal(unchanged.changed, false)

  const changed = updateHoverRuntime(unchanged, {
    screenPoint: {x: 2, y: 2},
    overlayHit: {id: 'overlay-1'},
    sceneHit: null,
  })
  assert.equal(changed.changed, true)
})
