import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createPointerSelectorState,
  resolvePointerSelectorPointerDown,
  resolvePointerSelectorPointerMove,
  resolvePointerSelectorPointerUp,
} from './PointerSelector.ts'
import type {SelectorEngine, SelectorQueryOptions, SelectorRect} from './SelectorContracts.ts'

/**
 * Creates deterministic selector engine fixture for pointer-selector tests.
 */
function createSelectorEngineFixture(): SelectorEngine<string> {
  return {
    selectPoint(_point, _options) {
      return ['shape-click']
    },
    selectRect(_rect: SelectorRect, _options: SelectorQueryOptions) {
      return ['shape-marquee']
    },
  }
}

test('pointer selector resolves click selection on pointer-up from pending phase', () => {
  const selector = createSelectorEngineFixture()
  const down = resolvePointerSelectorPointerDown({x: 10, y: 10})

  const up = resolvePointerSelectorPointerUp(down.state, {
    pointWorld: {x: 10, y: 10},
    selector,
  })

  assert.equal(up.selection?.mode, 'replace')
  assert.deepEqual(up.selection?.targetIds, ['shape-click'])
  assert.equal(up.state.phase, 'idle')
})

test('pointer selector resolves marquee selection after drag threshold crossing', () => {
  const selector = createSelectorEngineFixture()
  const down = resolvePointerSelectorPointerDown({x: 10, y: 10})

  const move = resolvePointerSelectorPointerMove(down.state, {
    pointWorld: {x: 30, y: 35},
    pointScreen: {x: 30, y: 35},
    startScreen: {x: 10, y: 10},
  })

  assert.equal(move.state.phase, 'marquee')
  assert.equal(move.overlays.length, 1)

  const up = resolvePointerSelectorPointerUp(move.state, {
    pointWorld: {x: 30, y: 35},
    selector,
    modifiers: {shiftKey: true},
  })

  assert.equal(up.selection?.mode, 'add')
  assert.deepEqual(up.selection?.targetIds, ['shape-marquee'])
  assert.equal(up.state.phase, 'idle')
})

test('pointer selector move from idle keeps state unchanged', () => {
  const idle = createPointerSelectorState()
  const move = resolvePointerSelectorPointerMove(idle, {
    pointWorld: {x: 20, y: 20},
    pointScreen: {x: 20, y: 20},
    startScreen: null,
  })

  assert.equal(move.state.phase, 'idle')
  assert.equal(move.overlays.length, 0)
})
