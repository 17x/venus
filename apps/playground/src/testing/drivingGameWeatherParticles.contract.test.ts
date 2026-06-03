import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import test from 'node:test'

import {
  buildDrivingGameScene,
  createDrivingGameWeatherParticleNodes,
} from '../demos/drivingGameScene'
import {projectDrivingGameFixture} from '../demos/drivingGameFixture'
import {createInitialDrivingGameState, DEFAULT_DRIVING_GAME_CONFIG} from '../demos/drivingGameTypes'

const readSource = (path: string): string => readFileSync(join(process.cwd(), path), 'utf8')
const readFixture = () => JSON.parse(readFileSync(join(process.cwd(), 'public/scenario-fixtures/s10/s10-city-openworld.fixture.json'), 'utf8')) as unknown

const particleSignature = (nodes: Array<Record<string, unknown>>): string => JSON.stringify(
  nodes.map((node) => ({id: node.id, mesh: node.mesh})),
)

function createWeatherState(weather: 'sunny' | 'cloudy' | 'rainy' | 'foggy') {
  const state = createInitialDrivingGameState(projectDrivingGameFixture(readFixture()))
  state.config.weather = weather
  state.config.weatherParticlesEnabled = true
  state.config.timeOfDayHours = 14
  state.carX = 12
  state.carY = -18
  return state
}

test('S10 weather particles are toggleable through config and settings', () => {
  assert.equal(DEFAULT_DRIVING_GAME_CONFIG.weatherParticlesEnabled, true)
  const state = createWeatherState('rainy')
  assert.equal(createDrivingGameWeatherParticleNodes(state).length > 0, true)
  state.config.weatherParticlesEnabled = false
  assert.equal(createDrivingGameWeatherParticleNodes(state).length, 0)
  assert.equal(buildDrivingGameScene(state).nodes.some((node) => String(node.id).startsWith('weather-')), false)

  const pageSource = readSource('src/demos/drivingGamePage.ts')
  assert.match(pageSource, /chk\('Weather FX', 'weatherParticlesEnabled'\)/)
  const projection = projectDrivingGameFixture(readFixture())
  assert.equal(projection.configPatch.weatherParticlesEnabled, true)
})

test('S10 rainy and foggy weather create distinct deterministic visual layers', () => {
  const rainyA = createWeatherState('rainy')
  const rainyB = createWeatherState('rainy')
  const foggy = createWeatherState('foggy')
  const sunny = createWeatherState('sunny')
  const cloudy = createWeatherState('cloudy')

  const rainNodes = createDrivingGameWeatherParticleNodes(rainyA)
  const rainNodesRepeat = createDrivingGameWeatherParticleNodes(rainyB)
  const fogNodes = createDrivingGameWeatherParticleNodes(foggy)

  assert.equal(rainNodes.length, 36)
  assert.equal(fogNodes.length, 10)
  assert.equal(createDrivingGameWeatherParticleNodes(sunny).length, 0)
  assert.equal(createDrivingGameWeatherParticleNodes(cloudy).length, 0)
  assert.equal(rainNodes.every((node) => String(node.id).startsWith('weather-rain-')), true)
  assert.equal(fogNodes.every((node) => String(node.id).startsWith('weather-fog-')), true)
  assert.equal(particleSignature(rainNodes), particleSignature(rainNodesRepeat))
  assert.notEqual(particleSignature(rainNodes), particleSignature(fogNodes))
})

test('S10 weather particles are present in scene graph for smoke and screenshot tests', () => {
  const rainyScene = buildDrivingGameScene(createWeatherState('rainy'))
  const foggyScene = buildDrivingGameScene(createWeatherState('foggy'))
  const rain = rainyScene.nodes.find((node) => String(node.id) === 'weather-rain-0') as {mesh?: {positions?: number[]; indices?: number[]; color?: string}} | undefined
  const fog = foggyScene.nodes.find((node) => String(node.id) === 'weather-fog-0') as {mesh?: {positions?: number[]; indices?: number[]; color?: string}} | undefined

  assert.ok(rain?.mesh)
  assert.ok(fog?.mesh)
  assert.equal(rain.mesh.color, '#93c5fd')
  assert.equal(fog.mesh.color, '#cbd5e1')
  assert.equal((rain.mesh.positions?.length ?? 0) > 0, true)
  assert.equal((fog.mesh.indices?.length ?? 0) > 0, true)
})
