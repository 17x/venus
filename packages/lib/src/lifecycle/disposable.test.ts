/// <reference types="node" />
import assert from 'node:assert/strict'
import test from 'node:test'

import {DisposableStore, type Disposable} from './disposable.ts'

test('DisposableStore disposes items in reverse add order', () => {
  const store = new DisposableStore()
  const order: string[] = []

  const first: Disposable = {
    dispose: () => {
      order.push('first')
    },
  }
  const second: Disposable = {
    dispose: () => {
      order.push('second')
    },
  }

  store.add(first)
  store.add(second)
  store.clear()

  assert.deepEqual(order, ['second', 'first'])
})

test('DisposableStore disposes new entries immediately after dispose', () => {
  const store = new DisposableStore()
  const order: string[] = []

  store.dispose()
  store.add({
    dispose: () => {
      order.push('late')
    },
  })

  assert.deepEqual(order, ['late'])
})

