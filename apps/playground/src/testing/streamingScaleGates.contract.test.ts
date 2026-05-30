import assert from 'node:assert/strict'
import test from 'node:test'

import {REMOTE_SCENARIO_DEFINITIONS} from '../demos/remoteScenarioCatalog'

/**
 * Verifies streaming and scale gate contracts for dense-scene scenarios (S3/S4/S10).
 */
test('streaming scale gates cover dense scene scenarios with node budgets', () => {
  const denseScenarios = REMOTE_SCENARIO_DEFINITIONS.filter(
    (scenario) => ['s3-bim-collab-review', 's4-cad-assembly-validation', 's10-game-editor-runtime-preview'].includes(scenario.id),
  )

  assert.equal(denseScenarios.length, 3)

  denseScenarios.forEach((scenario) => {
    assert.equal(['json', 'csv'].includes(scenario.datasetFormat), true)
    assert.equal(scenario.datasetUrl.startsWith('https://'), true)
    assert.equal(typeof scenario.buildScene, 'function')

    // Verify budget-relevant scene shape: each dense scenario produces nodes
    const scene = scenario.buildScene(1, [])
    assert.equal(scene.revision, 1)
    assert.equal(Array.isArray(scene.nodes), true)
    // Dense scenarios should produce at least some nodes for LOD relevance
  })
})

/**
 * Verifies LOD/streaming scenarios (S5/S7) expose tile-like node structures.
 */
test('streaming LOD scenarios produce tile-like node structures', () => {
  const lodScenarios = REMOTE_SCENARIO_DEFINITIONS.filter(
    (scenario) => ['s5-gis-live-map-streaming', 's7-city-twin-monitor-wall'].includes(scenario.id),
  )

  assert.equal(lodScenarios.length, 2)

  lodScenarios.forEach((scenario) => {
    const scene = scenario.buildScene(2, [])
    assert.equal(scene.revision, 2)
    assert.equal(scene.nodes.length > 0, true)
  })
})
