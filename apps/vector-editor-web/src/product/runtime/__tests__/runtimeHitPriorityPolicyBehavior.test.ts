import assert from 'node:assert/strict'
import test from 'node:test'

import {
  resolveRuntimeHitPriorityPlan,
  resolveRuntimePointerSelectorPhase,
} from '../hitPriorityPolicy.ts'

test('pointer-down in selector tool prioritizes control-point before object', () => {
  const plan = resolveRuntimeHitPriorityPlan({
    tool: 'selector',
    stage: 'pointer-down',
  })

  assert.deepEqual(plan.lanes, ['control-point', 'object'])
})

test('pointer-move marquee phase locks to overlay lane', () => {
  const plan = resolveRuntimeHitPriorityPlan({
    tool: 'selector',
    stage: 'pointer-move',
    pointerSelectorPhase: 'marquee',
  })

  assert.deepEqual(plan.lanes, ['overlay'])
})

test('pointer-move in direct selector uses control-point then object', () => {
  const plan = resolveRuntimeHitPriorityPlan({
    tool: 'dselector',
    stage: 'pointer-move',
    pointerSelectorPhase: 'idle',
  })

  assert.deepEqual(plan.lanes, ['control-point', 'object'])
})

test('non-selector tool keeps object-only hit policy', () => {
  const plan = resolveRuntimeHitPriorityPlan({
    tool: 'pencil',
    stage: 'pointer-move',
    pointerSelectorPhase: 'marquee',
  })

  assert.deepEqual(plan.lanes, ['object'])
})

test('pointer selector phase resolver normalizes unsupported tokens', () => {
  const unknownPhase = resolveRuntimePointerSelectorPhase('dragging')
  const knownPhase = resolveRuntimePointerSelectorPhase('pending')

  assert.equal(unknownPhase, 'unknown')
  assert.equal(knownPhase, 'pending')
})
