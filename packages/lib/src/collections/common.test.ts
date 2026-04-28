/// <reference types="node" />
import assert from 'node:assert/strict'
import test from 'node:test'

import {ensureMapValue, setMembership} from './common.ts'

test('ensureMapValue creates one value per key', () => {
  const map = new Map<string, number>()
  let createCount = 0

  const first = ensureMapValue(map, 'a', () => {
    createCount += 1
    return 42
  })
  const second = ensureMapValue(map, 'a', () => {
    createCount += 1
    return 99
  })

  assert.equal(first, 42)
  assert.equal(second, 42)
  assert.equal(createCount, 1)
})

test('setMembership adds and removes values by active flag', () => {
  const set = new Set<string>()

  setMembership(set, 'x', true)
  setMembership(set, 'x', false)

  assert.equal(set.has('x'), false)
})

