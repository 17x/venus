/// <reference types="node" />
import assert from 'node:assert/strict'
import test from 'node:test'

import {applyPatchBatch, resolvePatchBatchUpdateKind} from './batch.ts'

test('resolvePatchBatchUpdateKind returns null for empty patch lists', () => {
  const updateKind = resolvePatchBatchUpdateKind([], () => true)

  assert.equal(updateKind, null)
})

test('resolvePatchBatchUpdateKind returns flags when all patches are flags-only', () => {
  const updateKind = resolvePatchBatchUpdateKind(
    [{type: 'set-selected-index'}, {type: 'set-selected-index'}],
    (patch) => patch.type === 'set-selected-index',
  )

  assert.equal(updateKind, 'flags')
})

test('applyPatchBatch applies patches when update kind is resolved', () => {
  const patches = [{type: 'full'}]
  let applyCount = 0

  const updateKind = applyPatchBatch(
    patches,
    (patch) => patch.type === 'set-selected-index',
    () => {
      applyCount += 1
    },
  )

  assert.equal(updateKind, 'full')
  assert.equal(applyCount, 1)
})

