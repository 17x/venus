import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import test from 'node:test'

import {createEngine, createTestSurface} from '@venus/engine'
import {
  buildDrivingGameScene,
  createDrivingGameModelAssets,
} from '../demos/drivingGameScene'
import {
  projectDrivingGameFixture,
} from '../demos/drivingGameFixture'
import {
  resolveDrivingGameLampLights,
  resolveDrivingGameWeatherEnvironmentInput,
} from '../demos/drivingGamePage'
import {generateCityWorldMap} from '../demos/cityWorldGenerator'
import {createInitialDrivingGameState} from '../demos/drivingGameTypes'

const readFixture = () => JSON.parse(readFileSync(join(process.cwd(), 'public/scenario-fixtures/s10/s10-city-openworld.fixture.json'), 'utf8')) as unknown

type GraphNode = {id?: unknown; mesh?: {positions?: number[]}}

function findVisibleNode(graph: ReturnType<typeof buildDrivingGameScene>, predicate: (id: string) => boolean): GraphNode {
  const node = graph.nodes.find((item) => predicate(String(item.id))) as GraphNode | undefined
  assert.ok(node, 'expected visible graph node')
  assert.ok(node.mesh, `${String(node.id)} should include mesh`)
  assert.equal((node.mesh.positions?.length ?? 0) > 0, true)
  return node
}

test('S10 generated and canonical city maps carry open-world domain variety', () => {
  const generated = generateCityWorldMap(400, 10010)
  assert.equal(generated.roads.length > 0, true)
  assert.equal(generated.sidewalks.length > 0, true)
  assert.equal(generated.buildings.length > 0, true)
  assert.equal(generated.lamps.length > 0, true)
  assert.equal(generated.props.length > 0, true)

  const fixture = projectDrivingGameFixture(readFixture())
  assert.equal(fixture.cityMap.roads.length > 0, true)
  assert.equal(fixture.cityMap.sidewalks.length > 0, true)
  assert.equal(fixture.cityMap.buildings.length > 0, true)
  assert.equal(fixture.cityMap.lamps.length > 0, true)
  assert.equal(fixture.cityMap.props.length > 0, true)
})

test('S10 scene exposes at least one visible instance per required model type', () => {
  const state = createInitialDrivingGameState(projectDrivingGameFixture(readFixture()))
  const graph = buildDrivingGameScene(state)

  findVisibleNode(graph, (id) => id.startsWith('road-') && !id.startsWith('road-mark-'))
  findVisibleNode(graph, (id) => id.startsWith('sidewalk-'))
  findVisibleNode(graph, (id) => id === state.cityMap.buildings[0]?.id)
  findVisibleNode(graph, (id) => id.startsWith('lamp-'))
  findVisibleNode(graph, (id) => id === 'player-car-body' || id.startsWith('npc-car-'))
  findVisibleNode(graph, (id) => id.startsWith('ped-'))
  findVisibleNode(graph, (id) => id.startsWith('prop-'))
})

test('S10 lamp lights are emitted from lamp domain data when appropriate', () => {
  const state = createInitialDrivingGameState(projectDrivingGameFixture(readFixture()))
  const middayLights = resolveDrivingGameLampLights({
    lamps: state.cityMap.lamps,
    timeOfDayHours: 14,
    weather: 'sunny',
  })
  const nightLights = resolveDrivingGameLampLights({
    lamps: state.cityMap.lamps,
    timeOfDayHours: 22,
    weather: 'sunny',
  })
  const fogLights = resolveDrivingGameLampLights({
    lamps: state.cityMap.lamps,
    timeOfDayHours: 14,
    weather: 'foggy',
  })

  assert.equal(middayLights.length, 0)
  assert.equal(nightLights.length, state.cityMap.lamps.length)
  assert.equal(fogLights.length, state.cityMap.lamps.length)
  assert.deepEqual(
    nightLights.map((light) => light.id).sort(),
    state.cityMap.lamps.map((lamp) => `lamp-light-${lamp.id}`).sort(),
  )
  assert.equal(nightLights.every((light) => light.type === 'point' && light.positionY > 0), true)

  const engine = createEngine({surface: createTestSurface(320, 180), backend: 'headless'})
  const resolved = engine.runtime.lighting.applyEnvironment({
    timeOfDayHours: 22,
    directionDeg: state.config.directionDeg,
    ...resolveDrivingGameWeatherEnvironmentInput('sunny'),
    directionalIntensity: state.config.lightDirectionalIntensity,
    ambientIntensity: state.config.lightAmbientIntensity,
    additionalLights: nightLights,
  })
  assert.equal(resolved.collection.lights.some((light) => light.id === nightLights[0]?.id), true)
  engine.dispose()
})

test('S10 open-world model variety stays playground domain data, not engine model API names', () => {
  const modelAssetIds = createDrivingGameModelAssets().map((asset) => asset.id)
  for (const domainType of ['road', 'sidewalk', 'building', 'prop']) {
    assert.equal(modelAssetIds.some((id) => id.includes(domainType)), false)
  }
})
