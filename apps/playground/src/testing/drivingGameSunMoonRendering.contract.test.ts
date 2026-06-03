import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import test from 'node:test'

import {createEngine, createTestSurface} from '@venus/engine'
import {
  buildDrivingGameScene,
  createDrivingGameModelAssets,
  resolveDrivingGameSunDirection,
} from '../demos/drivingGameScene'
import {resolveDrivingGameWeatherEnvironmentInput} from '../demos/drivingGamePage'
import {createInitialDrivingGameState} from '../demos/drivingGameTypes'

const readSource = (path: string): string => readFileSync(join(process.cwd(), path), 'utf8')

type MeshNode = {
  id?: string
  mesh?: {
    topology?: string
    positions?: number[]
    indices?: number[]
  }
}

function findMeshNode(graph: ReturnType<typeof buildDrivingGameScene>, id: string): MeshNode {
  const node = graph.nodes.find((item) => item.id === id) as MeshNode | undefined
  assert.ok(node, `${id} must exist`)
  assert.ok(node.mesh, `${id} must expose mesh payload`)
  return node
}

function assertSphereLikeMesh(node: MeshNode): void {
  assert.equal(node.mesh?.topology, 'triangles')
  assert.equal((node.mesh?.positions?.length ?? 0) > 8 * 3, true)
  assert.equal((node.mesh?.indices?.length ?? 0) > 12 * 3, true)
}

function unit2(x: number, z: number): {x: number; z: number} {
  const length = Math.hypot(x, z)
  assert.equal(length > 0, true)
  return {x: x / length, z: z / length}
}

function resolveMeshBoundsCenter(positions: number[]): {x: number; y: number; z: number} {
  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  let minZ = Number.POSITIVE_INFINITY
  let maxZ = Number.NEGATIVE_INFINITY
  for (let index = 0; index < positions.length; index += 3) {
    const x = positions[index] ?? 0
    const y = positions[index + 1] ?? 0
    const z = positions[index + 2] ?? 0
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
    minZ = Math.min(minZ, z)
    maxZ = Math.max(maxZ, z)
  }
  return {x: (minX + maxX) * 0.5, y: (minY + maxY) * 0.5, z: (minZ + maxZ) * 0.5}
}

test('S10 sun and moon render as sphere-derived scene meshes, not boxes', () => {
  const sunState = createInitialDrivingGameState()
  sunState.config.weather = 'sunny'
  sunState.config.timeOfDayHours = 14
  const sunGraph = buildDrivingGameScene(sunState)
  assertSphereLikeMesh(findMeshNode(sunGraph, 'sun-sphere'))

  const moonState = createInitialDrivingGameState()
  moonState.config.weather = 'sunny'
  moonState.config.timeOfDayHours = 0
  const moonGraph = buildDrivingGameScene(moonState)
  assertSphereLikeMesh(findMeshNode(moonGraph, 'moon-sphere'))
})

test('S10 registered sun and moon model assets are sphere-derived', () => {
  const assets = createDrivingGameModelAssets()
  for (const assetId of ['driving-game-model-sun', 'driving-game-model-moon']) {
    const asset = assets.find((item) => item.id === assetId)
    assert.ok(asset, `${assetId} must exist`)
    const mesh = asset.scene.nodes[0]?.mesh
    assert.ok(mesh, `${assetId} orb mesh must exist`)
    assert.equal(mesh.positions.length > 8 * 3, true)
    const indices = mesh.indices
    assert.ok(indices, `${assetId} orb indices must exist`)
    assert.equal(indices.length > 12 * 3, true)
  }
})

test('S10 sun direction matches scene placement, minimap indicator, and runtime lighting direction', () => {
  const state = createInitialDrivingGameState()
  state.config.weather = 'sunny'
  state.config.directionDeg = 35
  state.config.timeOfDayHours = 15
  state.cameraAzimuth = 25
  const graph = buildDrivingGameScene(state)
  const sun = findMeshNode(graph, 'sun-sphere') as MeshNode & {mesh: {positions: number[]}}
  const direction = resolveDrivingGameSunDirection(state.config)

  const sceneCenter = resolveMeshBoundsCenter(sun.mesh.positions)
  const sceneDirection = unit2(sceneCenter.x - state.carX, sceneCenter.z - state.carY)
  assert.equal(Math.abs(sceneDirection.x - direction.x) < 1e-9, true)
  assert.equal(Math.abs(sceneDirection.z - direction.z) < 1e-9, true)

  const relativeAzimuth = direction.azimuthRad - (state.cameraAzimuth * Math.PI) / 180
  const minimapDirection = unit2(Math.sin(relativeAzimuth) * 24, Math.cos(relativeAzimuth) * 24)
  const expectedMinimapDirection = unit2(
    direction.x * Math.cos((state.cameraAzimuth * Math.PI) / 180) - direction.z * Math.sin((state.cameraAzimuth * Math.PI) / 180),
    direction.x * Math.sin((state.cameraAzimuth * Math.PI) / 180) + direction.z * Math.cos((state.cameraAzimuth * Math.PI) / 180),
  )
  assert.equal(Math.abs(minimapDirection.x - expectedMinimapDirection.x) < 1e-9, true)
  assert.equal(Math.abs(minimapDirection.z - expectedMinimapDirection.z) < 1e-9, true)

  const engine = createEngine({surface: createTestSurface(320, 180), backend: 'headless'})
  const resolved = engine.runtime.lighting.applyEnvironment({
    timeOfDayHours: state.config.timeOfDayHours,
    directionDeg: state.config.directionDeg,
    ...resolveDrivingGameWeatherEnvironmentInput(state.config.weather),
    directionalIntensity: state.config.lightDirectionalIntensity,
    ambientIntensity: state.config.lightAmbientIntensity,
  })
  const keyLight = resolved.collection.lights.find((light) => light.id === 'env-key-light')
  assert.ok(keyLight)
  if (keyLight.type !== 'directional') {
    throw new Error('env-key-light must be directional')
  }
  const lightDirection = unit2(keyLight.targetX, keyLight.targetZ)
  assert.equal(Math.abs(lightDirection.x - direction.x) < 1e-9, true)
  assert.equal(Math.abs(lightDirection.z - direction.z) < 1e-9, true)
  engine.dispose()
})

test('S10 minimap sun indicator uses shared sun direction helper', () => {
  const source = readSource('src/demos/drivingGamePage.ts')
  assert.match(source, /resolveDrivingGameSunDirection\(state\.config\)\.azimuthRad/)
})
