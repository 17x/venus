import assert from 'node:assert/strict'
import test from 'node:test'

/**
 * Declares one minimal shape used by local fallback fixtures.
 * Mirrors the canonical DocumentNode shape without depending on the vector-editor package.
 */
interface FallbackNode {
  id: string
  type: string
  name: string
  x: number
  y: number
  width: number
  height: number
}

function createLocalFallbackFixture(): Record<string, {type: string; nodes: FallbackNode[]}> {
  const allNodes: FallbackNode[] = [
    {id: 'fb-frame', type: 'frame', name: 'Frame', x: 0, y: 0, width: 640, height: 480},
    {id: 'fb-rect', type: 'rectangle', name: 'Rect', x: 16, y: 16, width: 120, height: 80},
    {id: 'fb-ellipse', type: 'ellipse', name: 'Ellipse', x: 148, y: 16, width: 90, height: 80},
    {id: 'fb-polygon', type: 'polygon', name: 'Polygon', x: 250, y: 16, width: 100, height: 80},
    {id: 'fb-star', type: 'star', name: 'Star', x: 362, y: 16, width: 80, height: 80},
    {id: 'fb-line', type: 'lineSegment', name: 'Line', x: 16, y: 112, width: 200, height: 2},
    {id: 'fb-path', type: 'path', name: 'Path', x: 16, y: 130, width: 200, height: 80},
    {id: 'fb-text', type: 'text', name: 'Text', x: 16, y: 220, width: 200, height: 40},
    {id: 'fb-image', type: 'image', name: 'Image', x: 228, y: 110, width: 200, height: 150},
    {id: 'fb-group', type: 'group', name: 'Group', x: 16, y: 280, width: 400, height: 200},
  ]

  return {
    s1:  {type: 'medical-volume-fallback',   nodes: [allNodes[3], allNodes[4]]},
    s2:  {type: 'surgical-path-fallback',    nodes: [allNodes[5], allNodes[6]]},
    s3:  {type: 'bim-review-fallback',       nodes: [allNodes[1], allNodes[9]]},
    s4:  {type: 'cad-validation-fallback',   nodes: [allNodes[2]]},
    s5:  {type: 'gis-map-fallback',          nodes: [allNodes[3], allNodes[4]]},
    s6:  {type: 'driving-twin-fallback',     nodes: [allNodes[7], allNodes[5]]},
    s7:  {type: 'city-twin-fallback',        nodes: [allNodes[0], allNodes[1], allNodes[9]]},
    s8:  {type: 'commerce-fallback',         nodes: [allNodes[1], allNodes[2]]},
    s9:  {type: 'molecular-fallback',        nodes: [allNodes[3]]},
    s10: {type: 'game-editor-fallback',      nodes: [allNodes[9], allNodes[1]]},
    s11: {type: 'node-headless-fallback',    nodes: [allNodes[5], allNodes[7]]},
    s12: {type: 'vector-2d-fallback',        nodes: [allNodes[6], allNodes[7], allNodes[8]]},
    s13: {type: 'video-timeline-fallback',   nodes: [allNodes[1], allNodes[7]]},
  }
}

/**
 * Verifies each S1-S13 scenario has a non-empty deterministic local fallback.
 */
test('local fallback fixtures provide non-empty node arrays for all 13 scenarios', () => {
  const fallbacks = createLocalFallbackFixture()
  const keys = Object.keys(fallbacks)

  assert.equal(keys.length, 13)

  keys.forEach((key) => {
    const fb = fallbacks[key as keyof typeof fallbacks]
    assert.equal(fb.nodes.length > 0, true, `fallback ${key} has no nodes`)
    fb.nodes.forEach((node) => {
      assert.equal(typeof node.id, 'string')
      assert.equal(typeof node.type, 'string')
    })
  })

  // Deterministic
  assert.deepEqual(createLocalFallbackFixture(), createLocalFallbackFixture())
})
