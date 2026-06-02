import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import test from 'node:test'

import {projectDrivingGameFixture} from '../demos/drivingGameFixture'
import {createInitialDrivingGameState} from '../demos/drivingGameTypes'

const readJson = (path: string): unknown =>
  JSON.parse(readFileSync(join(process.cwd(), path), 'utf8')) as unknown

test('S10 driving game canonical fixture projects into deterministic initial state', () => {
  const fixture = readJson('public/scenario-fixtures/s10/s10-city-openworld.fixture.json')
  const projection = projectDrivingGameFixture(fixture)
  const state = createInitialDrivingGameState(projection)

  assert.equal(projection.cityMap.mapSize, 420)
  assert.equal(projection.cityMap.roads.length, 6)
  assert.equal(projection.cityMap.buildings.length, 8)
  assert.equal(projection.cityMap.blockers.length, 12)
  assert.equal(projection.cityMap.carPath.length, 4)
  assert.equal(projection.cityMap.pedestrianPath.length, 4)
  assert.equal(state.config.mapSize, 420)
  assert.equal(state.config.weather, 'sunny')
  assert.equal(state.config.vehicleType, 'sedan')
  assert.equal(state.carX, 0)
  assert.equal(state.carY, 42)
  assert.equal(state.npcCars.length, 3)
  assert.equal(state.pedestrians.length, 3)
})

test('S10 fixture manifest declares canonical adapter and engine projection APIs', () => {
  const manifest = readJson('public/scenario-fixtures/s10/data-manifest.json')
  assert.equal(typeof manifest, 'object')
  assert.notEqual(manifest, null)
  const record = manifest as {
    canonicalFixture?: {path?: string; adapterOwner?: string; fallbackMode?: string}
    expectedModel?: {engineProjection?: string[]}
  }
  assert.equal(
    record.canonicalFixture?.path,
    'apps/playground/public/scenario-fixtures/s10/s10-city-openworld.fixture.json',
  )
  assert.equal(record.canonicalFixture?.adapterOwner, 'apps/playground/src/demos/drivingGameFixture.ts')
  assert.equal(record.canonicalFixture?.fallbackMode?.includes('seeded generator'), true)
  assert.equal(record.expectedModel?.engineProjection?.includes('engine.runtime.world.setOpenWorldMap'), true)
  assert.equal(record.expectedModel?.engineProjection?.includes('engine.runtime.lighting.applyEnvironment'), true)
})
