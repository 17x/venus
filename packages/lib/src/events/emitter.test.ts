/// <reference types="node" />
import assert from 'node:assert/strict'
import test from 'node:test'

import {createEventEmitter} from './emitter.ts'

test('createEventEmitter dispatches payloads to registered listeners', () => {
  const emitter = createEventEmitter<number>()
  const values: number[] = []
  emitter.on((value) => {
    values.push(value)
  })

  emitter.emit(2)
  emitter.emit(5)

  assert.deepEqual(values, [2, 5])
})

test('createEventEmitter unsubscribe removes only one listener', () => {
  const emitter = createEventEmitter<string>()
  const values: string[] = []
  const dispose = emitter.on((value) => {
    values.push(`a:${value}`)
  })
  emitter.on((value) => {
    values.push(`b:${value}`)
  })

  dispose()
  emitter.emit('x')

  assert.deepEqual(values, ['b:x'])
})

