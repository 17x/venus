import assert from 'node:assert/strict'
import test from 'node:test'

import {resolveSelectionChromeBounds} from './derivedState.overlays.ts'

const previewBounds = {minX: 20, minY: 30, maxX: 120, maxY: 130}
const engineBounds = {minX: 0, minY: 0, maxX: 100, maxY: 100}

test('resolveSelectionChromeBounds uses preview bounds during active transform', () => {
  assert.deepEqual(
    resolveSelectionChromeBounds({
      transformPreviewActive: true,
      previewBounds,
      engineBounds,
    }),
    previewBounds,
  )
})

test('resolveSelectionChromeBounds uses engine bounds outside active transform', () => {
  assert.deepEqual(
    resolveSelectionChromeBounds({
      transformPreviewActive: false,
      previewBounds,
      engineBounds,
    }),
    engineBounds,
  )
})
