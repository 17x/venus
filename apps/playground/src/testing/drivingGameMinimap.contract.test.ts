import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import test from 'node:test'

import {
  projectDrivingGameMiniMapPoint,
  resolveDrivingGameMiniMapNorthIndicator,
} from '../demos/drivingGamePage'
import {DEFAULT_DRIVING_GAME_CONFIG} from '../demos/drivingGameTypes'

const readSource = (path: string): string => readFileSync(join(process.cwd(), path), 'utf8')

const projectionInput = {
  width: 160,
  height: 160,
  mapSize: DEFAULT_DRIVING_GAME_CONFIG.mapSize,
  miniMapZoomLevel: DEFAULT_DRIVING_GAME_CONFIG.miniMapZoomLevel,
  x: 0,
  z: -80,
}

test('S10 minimap point projection rotates with camera azimuth', () => {
  const cameraNorth = projectDrivingGameMiniMapPoint({...projectionInput, cameraAzimuth: 0})
  const cameraEast = projectDrivingGameMiniMapPoint({...projectionInput, cameraAzimuth: 90})

  assert.equal(Math.abs(cameraNorth.x - 80) < 1e-9, true)
  assert.equal(cameraNorth.y < 80, true)
  assert.equal(cameraEast.x < 80, true)
  assert.equal(Math.abs(cameraEast.y - 80) < 1e-9, true)
})

test('S10 minimap zoom level changes map scale', () => {
  const near = projectDrivingGameMiniMapPoint({...projectionInput, miniMapZoomLevel: 0, cameraAzimuth: 0})
  const mid = projectDrivingGameMiniMapPoint({...projectionInput, miniMapZoomLevel: 1, cameraAzimuth: 0})
  const far = projectDrivingGameMiniMapPoint({...projectionInput, miniMapZoomLevel: 2, cameraAzimuth: 0})
  const centerY = projectionInput.height * 0.5

  assert.equal(Math.abs(near.y - centerY) > Math.abs(mid.y - centerY), true)
  assert.equal(Math.abs(mid.y - centerY) > Math.abs(far.y - centerY), true)
})

test('S10 minimap north pointer remains readable while rotating with camera', () => {
  const north0 = resolveDrivingGameMiniMapNorthIndicator({width: 160, cameraAzimuth: 0})
  const north90 = resolveDrivingGameMiniMapNorthIndicator({width: 160, cameraAzimuth: 90})

  assert.equal(Math.abs(north0.endX - north0.centerX) < 1e-9, true)
  assert.equal(north0.endY < north0.centerY, true)
  assert.equal(north90.endX < north90.centerX, true)
  assert.equal(Math.abs(north90.endY - north90.centerY) < 1e-9, true)
  assert.equal(north0.labelX, north90.labelX)
  assert.equal(north0.labelY, north90.labelY)
  assert.equal(north0.labelX > 0 && north0.labelX < 160, true)
  assert.equal(north0.labelY > 0, true)
})

test('S10 minimap draws required layers and exposes zoom level control', () => {
  const source = readSource('src/demos/drivingGamePage.ts')
  assert.match(source, /convertCityObstaclesToCollisionBlocks\(state\.cityMap\.blockers\)/)
  assert.match(source, /const car = toMap\(state\.carX, state\.carY\)/)
  assert.match(source, /for \(const npc of state\.npcCars\)/)
  assert.match(source, /for \(const ped of state\.pedestrians\)/)
  assert.match(source, /resolveDrivingGameMiniMapNorthIndicator/)
  assert.match(source, /data-select="miniMapZoomLevel"/)
  assert.match(source, /currentState\.config\.miniMapZoomLevel = Number\.parseInt/)
})
