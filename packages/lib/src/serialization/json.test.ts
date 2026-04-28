/// <reference types="node" />
import assert from 'node:assert/strict'
import test from 'node:test'

import {parseJsonSafely, stringifyJsonSafely} from './json.ts'

test('parseJsonSafely returns parsed value for valid JSON', () => {
  const value = parseJsonSafely<{id: string}>(JSON.stringify({id: 'a'}))

  assert.deepEqual(value, {id: 'a'})
})

test('parseJsonSafely returns null for invalid JSON', () => {
  const value = parseJsonSafely('{invalid}')

  assert.equal(value, null)
})

test('stringifyJsonSafely returns null for cyclic values', () => {
  const input: {self?: unknown} = {}
  input.self = input

  const value = stringifyJsonSafely(input)

  assert.equal(value, null)
})

