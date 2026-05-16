import test from 'node:test'
import assert from 'node:assert/strict'

import {
  resolveEngineOptimizationMechanismPolicy,
} from './optimizationMechanismPolicy.ts'

/**
 * Intent: convert decision arrays into stable lookup maps for concise assertions.
 * @param decisions Policy decision array.
 * @returns Map keyed by mechanism identifier.
 */
function createDecisionMap(
  decisions: ReturnType<typeof resolveEngineOptimizationMechanismPolicy>,
): Record<string, {disposition: string; rationale: readonly string[]}> {
  const output: Record<string, {disposition: string; rationale: readonly string[]}> = {}
  for (const decision of decisions) {
    output[decision.id] = {
      disposition: decision.disposition,
      rationale: decision.rationale,
    }
  }
  return output
}

test('resolveEngineOptimizationMechanismPolicy returns deterministic mechanism order', () => {
  const decisions = resolveEngineOptimizationMechanismPolicy({dimensionMode: '2d'})
  assert.deepEqual(
    decisions.map((decision) => decision.id),
    [
      'tile-cache',
      'interaction-snapshot',
      'partial-redraw-dirty-region',
      'lod-degradation',
      'frame-budget-broker',
      'visibility-culling',
      'resource-residency',
      'bitmap-replay',
    ],
  )
})

test('resolveEngineOptimizationMechanismPolicy keeps 2D-friendly mechanisms and deprecates bitmap replay', () => {
  const decisions = createDecisionMap(resolveEngineOptimizationMechanismPolicy({dimensionMode: '2d'}))
  assert.equal(decisions['tile-cache']?.disposition, 'retain')
  assert.equal(decisions['interaction-snapshot']?.disposition, 'retain')
  assert.equal(decisions['partial-redraw-dirty-region']?.disposition, 'retain')
  assert.equal(decisions['visibility-culling']?.disposition, 'retain')
  assert.equal(decisions['bitmap-replay']?.disposition, 'deprecate')
})

test('resolveEngineOptimizationMechanismPolicy upgrades 3D-sensitive mechanisms', () => {
  const decisions = createDecisionMap(resolveEngineOptimizationMechanismPolicy({dimensionMode: '3d'}))
  assert.equal(decisions['tile-cache']?.disposition, 'upgrade')
  assert.equal(decisions['interaction-snapshot']?.disposition, 'upgrade')
  assert.equal(decisions['partial-redraw-dirty-region']?.disposition, 'upgrade')
  assert.equal(decisions['frame-budget-broker']?.disposition, 'upgrade')
  assert.equal(decisions['visibility-culling']?.disposition, 'upgrade')
  assert.equal(decisions['resource-residency']?.disposition, 'upgrade')
  assert.equal(decisions['bitmap-replay']?.disposition, 'deprecate')
})

test('resolveEngineOptimizationMechanismPolicy keeps hybrid mode aligned with 3D upgrade priorities', () => {
  const decisions = createDecisionMap(resolveEngineOptimizationMechanismPolicy({dimensionMode: 'hybrid'}))
  assert.equal(decisions['tile-cache']?.disposition, 'upgrade')
  assert.equal(decisions['interaction-snapshot']?.disposition, 'upgrade')
  assert.equal(decisions['visibility-culling']?.disposition, 'upgrade')
  assert.ok(decisions['interaction-snapshot']?.rationale.includes('temporal-reprojection-required'))
})
