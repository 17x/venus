import assert from 'node:assert/strict'
import test from 'node:test'

import { shouldSkipInteractiveTinyPacket } from './runtimeHelpers.ts'
import type { EngineRenderFrame } from '../../types/index.ts'

function createFrame(scale: number): EngineRenderFrame {
  return {
    scene: {
      revision: 'runtime-helper-test',
      width: 1000,
      height: 1000,
      nodes: [],
    },
    viewport: {
      viewportWidth: 800,
      viewportHeight: 600,
      scale,
      offsetX: 0,
      offsetY: 0,
      matrix: [scale, 0, 0, 0, scale, 0, 0, 0, 1],
    },
    context: {
      quality: 'interactive',
    },
  }
}

test('shouldSkipInteractiveTinyPacket keeps long thin visible geometry', () => {
  assert.equal(
    shouldSkipInteractiveTinyPacket(createFrame(1), 'shape', {width: 80, height: 0.2}),
    false,
  )
})

test('shouldSkipInteractiveTinyPacket skips only fully tiny geometry', () => {
  assert.equal(
    shouldSkipInteractiveTinyPacket(createFrame(1), 'shape', {width: 2, height: 2}),
    true,
  )
})
