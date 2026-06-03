import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import test from 'node:test'

import {createEngine, createTestSurface} from '@venus/engine'
import {projectDrivingGameFixture} from '../demos/drivingGameFixture'
import {
  projectDrivingGameMiniMapPoint,
  resolveDrivingGameNpcMovementStep,
} from '../demos/drivingGamePage'
import {createInitialDrivingGameState} from '../demos/drivingGameTypes'

const readJson = (path: string): unknown => JSON.parse(readFileSync(join(process.cwd(), path), 'utf8')) as unknown
const readWorkspaceFile = (path: string): string => readFileSync(join(process.cwd(), '../..', path), 'utf8')

function createS10FixtureState() {
  const fixture = readJson('public/scenario-fixtures/s10/s10-city-openworld.fixture.json')
  return createInitialDrivingGameState(projectDrivingGameFixture(fixture))
}

test('S10 NPC cars and pedestrians step visibly and deterministically through engine navigation', () => {
  const firstState = createS10FixtureState()
  const secondState = createS10FixtureState()
  const firstEngine = createEngine({surface: createTestSurface(320, 180), backend: 'headless'})
  const secondEngine = createEngine({surface: createTestSurface(320, 180), backend: 'headless'})

  const firstStep = resolveDrivingGameNpcMovementStep({
    engine: firstEngine,
    deltaSeconds: 1,
    npcCars: firstState.npcCars,
    pedestrians: firstState.pedestrians,
    carPath: firstState.cityMap.carPath,
    pedestrianPath: firstState.cityMap.pedestrianPath,
  })
  const secondStep = resolveDrivingGameNpcMovementStep({
    engine: secondEngine,
    deltaSeconds: 1,
    npcCars: secondState.npcCars,
    pedestrians: secondState.pedestrians,
    carPath: secondState.cityMap.carPath,
    pedestrianPath: secondState.cityMap.pedestrianPath,
  })

  assert.deepEqual(secondStep.npcCars, firstStep.npcCars)
  assert.deepEqual(secondStep.pedestrians, firstStep.pedestrians)
  assert.equal(firstStep.npcCars.length, firstState.npcCars.length)
  assert.equal(firstStep.pedestrians.length, firstState.pedestrians.length)
  assert.notDeepEqual(firstStep.npcCars.map(({x, z}) => [x, z]), firstState.npcCars.map(({x, z}) => [x, z]))
  assert.notDeepEqual(firstStep.pedestrians.map(({x, z}) => [x, z]), firstState.pedestrians.map(({x, z}) => [x, z]))
  assert.deepEqual(firstEngine.runtime.navigation.getAgents(), firstStep.agents)

  firstEngine.dispose()
  secondEngine.dispose()
})

test('S10 minimap projected NPC and pedestrian positions update after movement step', () => {
  const state = createS10FixtureState()
  const engine = createEngine({surface: createTestSurface(320, 180), backend: 'headless'})
  const width = 180
  const height = 180
  const beforeCar = state.npcCars[0]
  const beforePed = state.pedestrians[0]
  assert.ok(beforeCar)
  assert.ok(beforePed)

  const beforeCarPoint = projectDrivingGameMiniMapPoint({
    width,
    height,
    mapSize: state.config.mapSize,
    miniMapZoomLevel: state.config.miniMapZoomLevel,
    cameraAzimuth: state.cameraAzimuth,
    x: beforeCar.x,
    z: beforeCar.z,
  })
  const beforePedPoint = projectDrivingGameMiniMapPoint({
    width,
    height,
    mapSize: state.config.mapSize,
    miniMapZoomLevel: state.config.miniMapZoomLevel,
    cameraAzimuth: state.cameraAzimuth,
    x: beforePed.x,
    z: beforePed.z,
  })

  const step = resolveDrivingGameNpcMovementStep({
    engine,
    deltaSeconds: 1,
    npcCars: state.npcCars,
    pedestrians: state.pedestrians,
    carPath: state.cityMap.carPath,
    pedestrianPath: state.cityMap.pedestrianPath,
  })
  const afterCar = step.npcCars.find((npc) => npc.id === beforeCar.id)
  const afterPed = step.pedestrians.find((ped) => ped.id === beforePed.id)
  assert.ok(afterCar)
  assert.ok(afterPed)

  const afterCarPoint = projectDrivingGameMiniMapPoint({
    width,
    height,
    mapSize: state.config.mapSize,
    miniMapZoomLevel: state.config.miniMapZoomLevel,
    cameraAzimuth: state.cameraAzimuth,
    x: afterCar.x,
    z: afterCar.z,
  })
  const afterPedPoint = projectDrivingGameMiniMapPoint({
    width,
    height,
    mapSize: state.config.mapSize,
    miniMapZoomLevel: state.config.miniMapZoomLevel,
    cameraAzimuth: state.cameraAzimuth,
    x: afterPed.x,
    z: afterPed.z,
  })

  assert.notDeepEqual(afterCarPoint, beforeCarPoint)
  assert.notDeepEqual(afterPedPoint, beforePedPoint)
  assert.equal(Number.isFinite(afterCarPoint.x) && Number.isFinite(afterCarPoint.y), true)
  assert.equal(Number.isFinite(afterPedPoint.x) && Number.isFinite(afterPedPoint.y), true)
  engine.dispose()
})

test('S10 NPC future backlog records traffic rules avoidance and spawn lifecycle', () => {
  const engineBacklog = readWorkspaceFile('.ai-tasks/engine/engine-openworld-capability-backlog-2026-06-01.md')
  assert.match(engineBacklog, /traffic rules/)
  assert.match(engineBacklog, /pedestrian avoidance/)
  assert.match(engineBacklog, /spawn\/despawn/)
})
