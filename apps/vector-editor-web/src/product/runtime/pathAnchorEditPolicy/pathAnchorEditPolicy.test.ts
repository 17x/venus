import assert from 'node:assert/strict'
import test from 'node:test'
import {
  resolvePathAnchorDeleteBezierPoints,
  resolvePathAnchorInsertBezierPoints,
  resolvePathAnchorToggleBezierPoints,
} from './pathAnchorEditPolicy.ts'

/**
 * Creates one compact bezier list fixture for path anchor policy tests.
 */
function createBezierPointsFixture() {
  return [
    {anchor: {x: 0, y: 0}},
    {anchor: {x: 20, y: 10}},
    {anchor: {x: 40, y: 0}},
    {anchor: {x: 60, y: 20}},
  ]
}

test('path anchor delete removes one anchor when topology minimum is preserved', () => {
  const next = resolvePathAnchorDeleteBezierPoints({
    bezierPoints: createBezierPointsFixture(),
    anchorIndex: 1,
    isClosedPath: false,
  })

  assert.ok(next)
  assert.equal(next.length, 3)
  assert.equal(next[1].anchor.x, 40)
})

test('path anchor delete rejects operation when it breaks closed-path minimum anchors', () => {
  const next = resolvePathAnchorDeleteBezierPoints({
    bezierPoints: [
      {anchor: {x: 0, y: 0}},
      {anchor: {x: 10, y: 10}},
      {anchor: {x: 20, y: 0}},
    ],
    anchorIndex: 1,
    isClosedPath: true,
  })

  assert.equal(next, null)
})

test('path anchor toggle adds smooth handles for corner anchors', () => {
  const next = resolvePathAnchorToggleBezierPoints({
    bezierPoints: createBezierPointsFixture(),
    anchorIndex: 1,
  })

  assert.ok(next)
  assert.ok(next[1].cp1)
  assert.ok(next[1].cp2)
})

test('path anchor toggle removes handles for smooth anchors', () => {
  const next = resolvePathAnchorToggleBezierPoints({
    bezierPoints: [
      {anchor: {x: 0, y: 0}},
      {
        anchor: {x: 20, y: 10},
        cp1: {x: 15, y: 10},
        cp2: {x: 25, y: 10},
      },
      {anchor: {x: 40, y: 0}},
    ],
    anchorIndex: 1,
  })

  assert.ok(next)
  assert.equal(next[1].cp1, undefined)
  assert.equal(next[1].cp2, undefined)
})

test('path anchor insert adds one new anchor after target segment', () => {
  const next = resolvePathAnchorInsertBezierPoints({
    bezierPoints: createBezierPointsFixture(),
    segmentIndex: 1,
    point: {x: 30, y: 8},
  })

  assert.ok(next)
  assert.equal(next.length, 5)
  assert.equal(next[2].anchor.x, 30)
  assert.equal(next[2].anchor.y, 8)
})
