import assert from 'node:assert/strict'
import test from 'node:test'

import {createOperationLifecycleManager} from './OperationLifecycle.ts'

test('operation lifecycle manager tracks begin/update/commit', () => {
  const manager = createOperationLifecycleManager<'pan'>({dragThresholdPx: 4})
  const begun = manager.begin({
    id: 'op-1',
    type: 'pan',
    startedAt: 1,
    screen: {x: 10, y: 20},
  })
  assert.equal(begun.id, 'op-1')
  assert.equal(manager.getPhase(), 'pending')

  const updated = manager.update({x: 18, y: 24})
  assert.equal(updated?.deltaScreen.x, 8)
  assert.equal(updated?.deltaScreen.y, 4)
  assert.equal(manager.getPhase(), 'active')

  const committing = manager.markCommitting()
  assert.equal(committing, 'committing')

  const committed = manager.commit()
  assert.equal(committed?.id, 'op-1')
  assert.equal(manager.getCurrent(), null)
  assert.equal(manager.getPhase(), 'completed')
})
