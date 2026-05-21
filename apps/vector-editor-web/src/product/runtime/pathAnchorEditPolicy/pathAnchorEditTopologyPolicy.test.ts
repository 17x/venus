import assert from 'node:assert/strict'
import test from 'node:test'
import {
  resolvePathSegmentSplitBezierPoints,
  resolvePathToggleClosedBezierPoints,
} from './pathAnchorEditPolicy.ts'

/**
 * Creates one open-path bezier fixture for topology policy tests.
 */
function createOpenPathBezierFixture() {
  return [
    {anchor: {x: 0, y: 0}},
    {anchor: {x: 30, y: 10}},
    {anchor: {x: 60, y: 0}},
  ]
}

test('path segment split inserts one anchor after selected segment index', () => {
  const next = resolvePathSegmentSplitBezierPoints({
    bezierPoints: createOpenPathBezierFixture(),
    segmentIndex: 1,
    point: {x: 45, y: 6},
  })

  assert.ok(next)
  assert.equal(next.length, 4)
  assert.equal(next[2].anchor.x, 45)
  assert.equal(next[2].anchor.y, 6)
})

test('path segment split rejects out-of-range segment index', () => {
  const next = resolvePathSegmentSplitBezierPoints({
    bezierPoints: createOpenPathBezierFixture(),
    segmentIndex: 2,
    point: {x: 45, y: 6},
  })

  assert.equal(next, null)
})

test('path toggle closed appends duplicated head anchor when path is open', () => {
  const next = resolvePathToggleClosedBezierPoints({
    bezierPoints: createOpenPathBezierFixture(),
    isClosedPath: false,
  })

  assert.ok(next)
  assert.equal(next.length, 4)
  assert.equal(next[0].anchor.x, next[next.length - 1].anchor.x)
  assert.equal(next[0].anchor.y, next[next.length - 1].anchor.y)
})

test('path toggle closed removes duplicated tail anchor when path is closed', () => {
  const next = resolvePathToggleClosedBezierPoints({
    bezierPoints: [
      {anchor: {x: 0, y: 0}},
      {anchor: {x: 30, y: 10}},
      {anchor: {x: 60, y: 0}},
      {anchor: {x: 0, y: 0}},
    ],
    isClosedPath: true,
  })

  assert.ok(next)
  assert.equal(next.length, 3)
  assert.notEqual(next[0].anchor.x === next[next.length - 1].anchor.x && next[0].anchor.y === next[next.length - 1].anchor.y, true)
})

test('path toggle closed rejects closing when anchor count is below closed-path minimum', () => {
  const next = resolvePathToggleClosedBezierPoints({
    bezierPoints: [
      {anchor: {x: 0, y: 0}},
      {anchor: {x: 30, y: 10}},
    ],
    isClosedPath: false,
  })

  assert.equal(next, null)
})
