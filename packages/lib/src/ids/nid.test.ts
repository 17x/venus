/// <reference types="node" />
import assert from 'node:assert/strict'
import test from 'node:test'

import {createNid, NID_CHARSET} from './nid.ts'

test('createNid uses deterministic random providers for stable output', () => {
  const values = [0, 0.5, 0.999]
  let offset = 0
  const id = createNid(3, () => {
    const value = values[offset] ?? 0
    offset += 1
    return value
  })

  assert.equal(id.length, 3)
  assert.equal(id[0], NID_CHARSET[0])
  assert.equal(id[1], NID_CHARSET[Math.floor(0.5 * NID_CHARSET.length)])
  assert.equal(id[2], NID_CHARSET[Math.floor(0.999 * NID_CHARSET.length)])
})

test('createNid clamps non-finite sizes to an empty identifier', () => {
  assert.equal(createNid(Number.NaN, () => 0.1), '')
})

