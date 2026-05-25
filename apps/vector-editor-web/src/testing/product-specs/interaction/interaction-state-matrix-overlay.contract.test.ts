import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createRuntimeInteractionStateMatrixInstructions,
  createRuntimeInteractionStateMatrixOutput,
} from '../../../runtime/overlay/interactionStateMatrix.ts'

/**
 * Creates one canonical matrix input used by overlay routing contract checks.
 */
function createMatrixInputFixture() {
  return {
    states: ['hover', 'marquee', 'selected', 'handles', 'cursor'] as const,
    bounds: {
      minX: 120,
      minY: 140,
      maxX: 420,
      maxY: 340,
    },
    cursorIntent: {type: 'crosshair'} as const,
  }
}

test('interaction-state matrix resolves deterministic overlay instruction coverage', () => {
  const input = createMatrixInputFixture()
  const instructions = createRuntimeInteractionStateMatrixInstructions(input)

  assert.ok(instructions.length >= 5)

  const byId = new Map(instructions.map((instruction) => [instruction.id, instruction]))
  assert.equal(byId.has('state-matrix:selected'), true)
  assert.equal(byId.has('state-matrix:hover'), true)
  assert.equal(byId.has('state-matrix:marquee'), true)
  assert.equal(byId.has('state-matrix:cursor'), true)

  const handleInstructions = instructions.filter((instruction) => instruction.id.startsWith('state-matrix:handle:'))
  assert.equal(handleInstructions.length, 8)

  const layerSet = new Set(instructions.map((instruction) => instruction.layerId))
  assert.equal(layerSet.has('overlay.selection'), true)
  assert.equal(layerSet.has('overlay.hover'), true)
  assert.equal(layerSet.has('overlay.marquee'), true)
  assert.equal(layerSet.has('overlay.handles'), true)
  assert.equal(layerSet.has('overlay.guides'), true)
})

test('interaction-state matrix adapts instructions into engine overlay draw nodes', () => {
  const input = createMatrixInputFixture()
  const output = createRuntimeInteractionStateMatrixOutput(input)

  assert.equal(output.instructions.length, output.engineOverlayNodes.length)
  assert.ok(output.engineOverlayNodes.every((node) => node.coordinate === 'world'))
  assert.ok(output.engineOverlayNodes.some((node) => node.type === 'polyline'))
  assert.ok(output.engineOverlayNodes.some((node) => node.type === 'circle'))
  assert.ok(output.engineOverlayNodes.some((node) => node.type === 'line'))
})

test('interaction-state matrix limits output when only cursor state is requested', () => {
  const output = createRuntimeInteractionStateMatrixOutput({
    states: ['cursor'],
    bounds: {
      minX: 10,
      minY: 20,
      maxX: 30,
      maxY: 40,
    },
    cursorIntent: {type: 'move'},
  })

  assert.equal(output.instructions.length, 1)
  assert.equal(output.instructions[0]?.id, 'state-matrix:cursor')
  assert.equal(output.instructions[0]?.layerId, 'overlay.guides')
  assert.equal(output.engineOverlayNodes.length, 1)
})
