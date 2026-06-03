import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import test from 'node:test'

import {
  DRIVING_GAME_VEHICLE_PROFILES,
  resolveDrivingGameVehicleProfile,
  resolveDrivingGameVehicleVelocityStep,
} from '../demos/drivingGamePage'
import {DEFAULT_DRIVING_GAME_CONFIG, type DrivingGameConfig} from '../demos/drivingGameTypes'

const readSource = (path: string): string => readFileSync(join(process.cwd(), path), 'utf8')

const accelerate = (vehicleType: DrivingGameConfig['vehicleType']) => {
  return resolveDrivingGameVehicleVelocityStep({
    vehicle: resolveDrivingGameVehicleProfile(vehicleType),
    deltaSeconds: 0.5,
    velocityX: 0,
    velocityY: 0,
    wishX: 1,
    wishY: 0,
    braking: false,
  })
}

const coast = (vehicleType: DrivingGameConfig['vehicleType']) => {
  return resolveDrivingGameVehicleVelocityStep({
    vehicle: resolveDrivingGameVehicleProfile(vehicleType),
    deltaSeconds: 0.25,
    velocityX: 8,
    velocityY: 0,
    wishX: 0,
    wishY: 0,
    braking: false,
  })
}

const brake = (vehicleType: DrivingGameConfig['vehicleType']) => {
  return resolveDrivingGameVehicleVelocityStep({
    vehicle: resolveDrivingGameVehicleProfile(vehicleType),
    deltaSeconds: 0.25,
    velocityX: 8,
    velocityY: 0,
    wishX: 0,
    wishY: 0,
    braking: true,
  })
}

test('S10 vehicle profiles expose profile-owned acceleration mass max speed radius brake and drag', () => {
  assert.deepEqual(Object.keys(DRIVING_GAME_VEHICLE_PROFILES).sort(), ['sedan', 'sport', 'suv', 'truck'])

  const sedan = resolveDrivingGameVehicleProfile('sedan')
  const sport = resolveDrivingGameVehicleProfile('sport')
  const truck = resolveDrivingGameVehicleProfile('truck')

  assert.notEqual(sedan.acceleration, sport.acceleration)
  assert.notEqual(sedan.mass, truck.mass)
  assert.notEqual(sedan.maxSpeed, sport.maxSpeed)
  assert.notEqual(sedan.radius, truck.radius)
  assert.notEqual(sedan.brakeDeceleration, truck.brakeDeceleration)
  assert.notEqual(sedan.drag, sport.drag)
})

test('S10 selected vehicle profile changes velocity integration response', () => {
  const sportAcceleration = accelerate('sport')
  const sedanAcceleration = accelerate('sedan')
  const truckAcceleration = accelerate('truck')
  assert.equal(sportAcceleration.speed > sedanAcceleration.speed, true)
  assert.equal(sedanAcceleration.speed > truckAcceleration.speed, true)

  const sportClamped = resolveDrivingGameVehicleVelocityStep({
    vehicle: resolveDrivingGameVehicleProfile('sport'),
    deltaSeconds: 0,
    velocityX: 100,
    velocityY: 0,
    wishX: 0,
    wishY: 0,
    braking: false,
  })
  const truckClamped = resolveDrivingGameVehicleVelocityStep({
    vehicle: resolveDrivingGameVehicleProfile('truck'),
    deltaSeconds: 0,
    velocityX: 100,
    velocityY: 0,
    wishX: 0,
    wishY: 0,
    braking: false,
  })
  assert.equal(Math.abs(sportClamped.speed - resolveDrivingGameVehicleProfile('sport').maxSpeed) < 1e-9, true)
  assert.equal(Math.abs(truckClamped.speed - resolveDrivingGameVehicleProfile('truck').maxSpeed) < 1e-9, true)
  assert.equal(sportClamped.speed > truckClamped.speed, true)

  assert.equal(coast('truck').speed < coast('sport').speed, true)
  assert.equal(brake('sport').speed < brake('truck').speed, true)
})

test('S10 vehicle tuning scales profile values without changing engine API', () => {
  const base = resolveDrivingGameVehicleProfile('sedan')
  const tuned = resolveDrivingGameVehicleProfile('sedan', {
    ...DEFAULT_DRIVING_GAME_CONFIG,
    carSpeed: DEFAULT_DRIVING_GAME_CONFIG.carSpeed * 1.5,
    carAcceleration: DEFAULT_DRIVING_GAME_CONFIG.carAcceleration * 0.5,
    carBrakeDeceleration: DEFAULT_DRIVING_GAME_CONFIG.carBrakeDeceleration * 2,
    carDrag: DEFAULT_DRIVING_GAME_CONFIG.carDrag * 0.5,
  })

  assert.equal(tuned.maxSpeed, base.maxSpeed * 1.5)
  assert.equal(tuned.acceleration, base.acceleration * 0.5)
  assert.equal(tuned.brakeDeceleration, base.brakeDeceleration * 2)
  assert.equal(tuned.drag, base.drag * 0.5)
  assert.equal(tuned.mass, base.mass)
  assert.equal(tuned.radius, base.radius)

  const pageSource = readSource('src/demos/drivingGamePage.ts')
  assert.match(pageSource, /resolveDrivingGameVehicleProfile\(config\.vehicleType, config\)/)
  assert.match(pageSource, /resolveDrivingGameVehicleVelocityStep\(/)
  assert.doesNotMatch(pageSource, /engine\.runtime\.(vehicle|game|driving)/)
})
