import assert from 'node:assert/strict'
import test from 'node:test'

import {createRuntimeReactiveBridge} from '../reactiveBridge.ts'

/**
 * Verifies whole-snapshot subscribers are notified when bridge snapshot changes.
 */
test('reactive bridge patch notifies snapshot subscribers', () => {
  const bridge = createRuntimeReactiveBridge<{count: number}, {type: string}>({count: 0})
  let callCount = 0

  const unsubscribe = bridge.subscribe((snapshot) => {
    callCount += 1
    assert.equal(snapshot.count, 1)
  })

  bridge.patch((current) => ({
    ...current,
    count: current.count + 1,
  }))

  assert.equal(callCount, 1)
  unsubscribe()
})

/**
 * Verifies slice subscribers run only when selected slice changes.
 */
test('reactive bridge subscribeSlice ignores unrelated snapshot updates', () => {
  const bridge = createRuntimeReactiveBridge<
    {selection: string[]; zoom: number},
    {type: string}
  >({selection: [], zoom: 1})
  let sliceCallCount = 0

  const unsubscribe = bridge.subscribeSlice(
    (snapshot) => snapshot.selection,
    (next, previous) => {
      sliceCallCount += 1
      assert.deepEqual(previous, [])
      assert.deepEqual(next, ['shape-a'])
    },
  )

  // Update unrelated slice first, which should not trigger selection subscriber.
  bridge.patch((current) => ({
    ...current,
    zoom: 1.5,
  }))
  bridge.patch((current) => ({
    ...current,
    selection: ['shape-a'],
  }))

  assert.equal(sliceCallCount, 1)
  unsubscribe()
})

/**
 * Verifies query and event dispatch observe latest snapshot values.
 */
test('reactive bridge query and event dispatch expose latest snapshot', () => {
  const bridge = createRuntimeReactiveBridge<
    {editingMode: 'idle' | 'selecting'},
    {type: 'mode.changed'; nextMode: 'idle' | 'selecting'}
  >({editingMode: 'idle'})
  let receivedMode: 'idle' | 'selecting' = 'idle'

  const unsubscribe = bridge.subscribeEvent((event, snapshot) => {
    assert.equal(event.type, 'mode.changed')
    receivedMode = snapshot.editingMode
  })

  bridge.patch((current) => ({
    ...current,
    editingMode: 'selecting',
  }))
  bridge.dispatch({
    type: 'mode.changed',
    nextMode: 'selecting',
  })

  const queriedMode = bridge.query((snapshot) => snapshot.editingMode)
  assert.equal(queriedMode, 'selecting')
  assert.equal(receivedMode, 'selecting')
  unsubscribe()
})