import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import test from 'node:test'

import {generateCityWorldMap, type CityWorldMap} from '../demos/cityWorldGenerator'
import {projectDrivingGameFixture} from '../demos/drivingGameFixture'
import {createInitialDrivingGameState} from '../demos/drivingGameTypes'

const readJson = (path: string): unknown =>
  JSON.parse(readFileSync(join(process.cwd(), path), 'utf8')) as unknown

function roundNumber(value: number): number {
  return Number(value.toFixed(3))
}

function mapSignature(map: CityWorldMap): string {
  return JSON.stringify({
    mapSize: map.mapSize,
    roads: map.roads.map((road) => [road.id, roundNumber(road.cx), roundNumber(road.cz), roundNumber(road.w), roundNumber(road.d), road.axis]),
    buildings: map.buildings.map((building) => [building.id, roundNumber(building.cx), roundNumber(building.cz), roundNumber(building.w), roundNumber(building.d), roundNumber(building.h), building.color]),
    blockers: map.blockers.map((blocker) => [blocker.id, roundNumber(blocker.cx), roundNumber(blocker.cz), roundNumber(blocker.w), roundNumber(blocker.d), roundNumber(blocker.h), blocker.color]),
    lamps: map.lamps.map((lamp) => [lamp.id, roundNumber(lamp.x), roundNumber(lamp.z), roundNumber(lamp.h)]),
    carPath: map.carPath.map((node) => [roundNumber(node.x), roundNumber(node.z)]),
    pedestrianPath: map.pedestrianPath.map((node) => [roundNumber(node.x), roundNumber(node.z)]),
  })
}

test('S10 generated city map is deterministic for the same seed and map size', () => {
  const first = generateCityWorldMap(420, 10010)
  const second = generateCityWorldMap(420, 10010)

  assert.deepEqual(second, first)
  assert.equal(mapSignature(second), mapSignature(first))
  assert.equal(first.roads.length > 0, true)
  assert.equal(first.buildings.length > 0, true)
  assert.equal(first.blockers.length > first.buildings.length, true)
  assert.equal(first.carPath.length, 4)
  assert.equal(first.pedestrianPath.length, 4)
})

test('S10 generated city map changes deterministically when seed or map size changes', () => {
  const baseline = generateCityWorldMap(420, 10010)
  const differentSeed = generateCityWorldMap(420, 10011)
  const differentSize = generateCityWorldMap(480, 10010)

  assert.notEqual(mapSignature(differentSeed), mapSignature(baseline))
  assert.notEqual(mapSignature(differentSize), mapSignature(baseline))
  assert.equal(generateCityWorldMap(480, 10010).roads.length, differentSize.roads.length)
  assert.deepEqual(generateCityWorldMap(480, 10010), differentSize)
})

test('S10 fixture preview seed flows into game config for fallback regeneration', () => {
  const fixture = readJson('public/scenario-fixtures/s10/s10-city-openworld.fixture.json')
  const projection = projectDrivingGameFixture(fixture)
  const state = createInitialDrivingGameState(projection)

  assert.equal(projection.previewSeed, 10010)
  assert.equal(projection.configPatch.mapSeed, 10010)
  assert.equal(state.config.mapSeed, 10010)
})
