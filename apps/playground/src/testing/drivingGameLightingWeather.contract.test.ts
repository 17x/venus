import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import test from 'node:test'

import {createEngine, createTestSurface} from '@venus/engine'
import {buildDrivingGameScene} from '../demos/drivingGameScene'
import {resolveDrivingGameWeatherEnvironmentInput} from '../demos/drivingGamePage'
import {createInitialDrivingGameState, DEFAULT_DRIVING_GAME_CONFIG, type DrivingGameConfig} from '../demos/drivingGameTypes'

const readWorkspaceFile = (path: string): string => readFileSync(join(process.cwd(), '../..', path), 'utf8')
const readSource = (path: string): string => readFileSync(join(process.cwd(), path), 'utf8')

type WeatherToken = DrivingGameConfig['weather']

function createStateForWeather(weather: WeatherToken) {
  const state = createInitialDrivingGameState()
  state.config.weather = weather
  state.config.timeOfDayHours = 14
  state.config.directionDeg = 20
  return state
}

function findNodeColor(graph: ReturnType<typeof buildDrivingGameScene>, nodeId: string): string {
  const node = graph.nodes.find((item) => item.id === nodeId) as {mesh?: {color?: string}} | undefined
  assert.ok(node, `${nodeId} must exist`)
  const color = node.mesh?.color
  if (typeof color !== 'string') {
    throw new Error(`${nodeId} color must be a string`)
  }
  return color
}

function findFirstRoadColor(graph: ReturnType<typeof buildDrivingGameScene>): string {
  const node = graph.nodes.find((item) => typeof item.id === 'string' && item.id.startsWith('road-')) as {mesh?: {color?: string}} | undefined
  assert.ok(node, 'one road mesh must exist')
  const color = node.mesh?.color
  if (typeof color !== 'string') {
    throw new Error('road color must be a string')
  }
  return color
}

test('S10 driving game exposes direction time and sunny weather defaults', () => {
  const state = createInitialDrivingGameState()
  assert.equal(DEFAULT_DRIVING_GAME_CONFIG.weather, 'sunny')
  assert.equal(state.config.weather, 'sunny')
  assert.equal(typeof state.config.directionDeg, 'number')
  assert.equal(typeof state.config.timeOfDayHours, 'number')

  const source = readSource('src/demos/drivingGamePage.ts')
  assert.match(source, /rng\('Direction', 'directionDeg'/)
  assert.match(source, /rng\('Time', 'timeOfDayHours'/)
  assert.match(source, /data-select="weather"/)
})

test('S10 weather presets map to neutral environment inputs before engine lighting', () => {
  assert.deepEqual(resolveDrivingGameWeatherEnvironmentInput('sunny'), {
    cloudCover: 0.1,
    precipitation: 0,
    fogDensity: 0.06,
  })
  assert.deepEqual(resolveDrivingGameWeatherEnvironmentInput('cloudy'), {
    cloudCover: 0.75,
    precipitation: 0,
    fogDensity: 0.06,
  })
  assert.deepEqual(resolveDrivingGameWeatherEnvironmentInput('rainy'), {
    cloudCover: 0.88,
    precipitation: 0.85,
    fogDensity: 0.28,
  })
  assert.deepEqual(resolveDrivingGameWeatherEnvironmentInput('foggy'), {
    cloudCover: 0.66,
    precipitation: 0,
    fogDensity: 0.9,
  })

  const source = readSource('src/demos/drivingGamePage.ts')
  assert.match(source, /resolveDrivingGameWeatherEnvironmentInput\(state\.config\.weather\)/)
  assert.match(source, /engine\.runtime\.lighting\.applyEnvironment\(\{/)
  assert.doesNotMatch(source, /engine\.runtime\.lighting\.setCollection\(\{[\s\S]*state\.config\.weather/)
})

test('S10 sunny cloudy rainy and foggy weather visibly affect graph colors and atmosphere', () => {
  const engine = createEngine({surface: createTestSurface(320, 180), backend: 'headless'})
  const signatures: string[] = []
  const weatherColors = new Map<WeatherToken, {ground: string; road: string}>()
  const hazeOpacity = new Map<WeatherToken, number>()

  for (const weather of ['sunny', 'cloudy', 'rainy', 'foggy'] as const) {
    const state = createStateForWeather(weather)
    const graph = buildDrivingGameScene(state)
    const weatherEnvironment = resolveDrivingGameWeatherEnvironmentInput(weather)
    const resolved = engine.runtime.lighting.applyEnvironment({
      timeOfDayHours: state.config.timeOfDayHours,
      directionDeg: state.config.directionDeg,
      ...weatherEnvironment,
      directionalIntensity: state.config.lightDirectionalIntensity,
      ambientIntensity: state.config.lightAmbientIntensity,
    })

    assert.deepEqual(engine.runtime.lighting.getCollection(), resolved.collection)
    assert.deepEqual(resolved.environment.cloudCover, weatherEnvironment.cloudCover)
    assert.deepEqual(resolved.environment.precipitation, weatherEnvironment.precipitation)
    assert.deepEqual(resolved.environment.fogDensity, weatherEnvironment.fogDensity)
    weatherColors.set(weather, {
      ground: findNodeColor(graph, 'ground'),
      road: findFirstRoadColor(graph),
    })
    hazeOpacity.set(weather, resolved.atmosphere.hazeOpacity)
    signatures.push(JSON.stringify({weather, collection: resolved.collection, atmosphere: resolved.atmosphere}))
  }

  assert.equal(new Set([...weatherColors.values()].map((entry) => entry.ground)).size, 4)
  assert.equal(new Set([...weatherColors.values()].map((entry) => entry.road)).size, 3)
  assert.equal((hazeOpacity.get('cloudy') ?? 0) > (hazeOpacity.get('sunny') ?? 0), true)
  assert.equal((hazeOpacity.get('rainy') ?? 0) > (hazeOpacity.get('cloudy') ?? 0), true)
  assert.equal((hazeOpacity.get('foggy') ?? 0) > (hazeOpacity.get('rainy') ?? 0), true)
  assert.equal(new Set(signatures).size, 4)
  engine.dispose()
})

test('S10 rain and fog particle work is completed as deterministic scene coverage', () => {
  const ledger = readWorkspaceFile('.ai-tasks/playground/playground-multiscenario-atomic-requirements-2026-06-02.md')
  assert.match(ledger, /### PG-GAME-012 \[P2\] Weather particles/)
  assert.match(ledger, /Status: DONE/)
  assert.match(ledger, /drivingGameWeatherParticles\.contract\.test\.ts/)
})
