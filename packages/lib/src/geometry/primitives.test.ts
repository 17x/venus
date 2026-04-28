/// <reference types="node" />
import assert from 'node:assert/strict'
import test from 'node:test'

import {getRectCenter} from './primitives.ts'

test('getRectCenter resolves midpoint from rectangle dimensions', () => {
  const center = getRectCenter({x: 10, y: 20, width: 6, height: 4})

  assert.deepEqual(center, {x: 13, y: 22})
})

