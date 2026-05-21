import assert from 'node:assert/strict'
import test from 'node:test'

import {shouldClearTransformPreviewOnPointerUp} from '../pointerReleaseCommitPolicy.ts'

test('clears preview when transform resolved but no command was produced', () => {
  const shouldClear = shouldClearTransformPreviewOnPointerUp({
    hasResolvedTransformCommit: true,
    hasTransformCommand: false,
    hasTransformPreview: true,
  })

  assert.equal(shouldClear, true)
})

test('keeps preview when transform command exists and commit sync will clear later', () => {
  const shouldClear = shouldClearTransformPreviewOnPointerUp({
    hasResolvedTransformCommit: true,
    hasTransformCommand: true,
    hasTransformPreview: true,
  })

  assert.equal(shouldClear, false)
})

test('clears stale preview when no transform commit resolved on pointer-up', () => {
  const shouldClear = shouldClearTransformPreviewOnPointerUp({
    hasResolvedTransformCommit: false,
    hasTransformCommand: false,
    hasTransformPreview: true,
  })

  assert.equal(shouldClear, true)
})

test('does not clear when neither commit nor preview exists', () => {
  const shouldClear = shouldClearTransformPreviewOnPointerUp({
    hasResolvedTransformCommit: false,
    hasTransformCommand: false,
    hasTransformPreview: false,
  })

  assert.equal(shouldClear, false)
})
