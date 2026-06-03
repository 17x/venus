import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import test from 'node:test'

import {createEngine, createTestSurface} from '@venus/engine'
import {generateCityWorldMap} from '../demos/cityWorldGenerator'

const readSource = (path: string): string => readFileSync(join(process.cwd(), path), 'utf8')

function extractFunctionSource(source: string, functionName: string): string {
  const start = source.indexOf(`function ${functionName}`)
  assert.notEqual(start, -1, `${functionName} source must exist`)
  const bodyStart = source.indexOf('{', start)
  assert.notEqual(bodyStart, -1, `${functionName} body must exist`)
  let depth = 0
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index]
    if (char === '{') depth += 1
    else if (char === '}') {
      depth -= 1
      if (depth === 0) return source.slice(start, index + 1)
    }
  }
  throw new Error(`${functionName} source did not close`)
}

test('S10 driving game uses generic engine navigation and collision APIs for open-world state', () => {
  const engine = createEngine({surface: createTestSurface(320, 180), backend: 'headless'})
  const cityMap = generateCityWorldMap(420, 10010)

  const obstacles = engine.runtime.collision.setObstacles(cityMap.blockers.map((blocker) => ({
    id: blocker.id,
    x: blocker.cx,
    z: blocker.cz,
    width: blocker.w,
    depth: blocker.d,
  })))
  assert.equal(obstacles.length, cityMap.blockers.length)
  assert.deepEqual(engine.runtime.world.getOpenWorldMap().obstacles, obstacles)

  const firstBlocker = cityMap.blockers[0]
  assert.ok(firstBlocker)
  const resolved = engine.runtime.collision.resolve({
    x: firstBlocker.cx,
    z: firstBlocker.cz,
    radius: 4,
    velocityX: 3,
    velocityZ: 0,
  })
  assert.equal(resolved.collided, true)
  assert.equal(Math.hypot(resolved.velocityX, resolved.velocityZ) < 3, true)

  const agents = engine.runtime.navigation.setAgents([
    {id: 's10-contract-car', kind: 'car', x: cityMap.carPath[0]?.x ?? 0, z: cityMap.carPath[0]?.z ?? 0, yaw: 0, pathIndex: 0, speed: 8},
    {id: 's10-contract-ped', kind: 'pedestrian', x: cityMap.pedestrianPath[0]?.x ?? 0, z: cityMap.pedestrianPath[0]?.z ?? 0, yaw: 0, pathIndex: 0, speed: 2},
  ])
  assert.equal(agents.length, 2)
  const stepped = engine.runtime.navigation.stepAgents({
    deltaSeconds: 0.5,
    carPath: cityMap.carPath,
    pedestrianPath: cityMap.pedestrianPath,
  })
  assert.equal(stepped.length, 2)
  assert.deepEqual(engine.runtime.world.getAgents(), stepped)
  engine.dispose()
})

test('S10 driving game page delegates player blocker collision resolution to engine runtime', () => {
  const source = readSource('src/demos/drivingGamePage.ts')
  const updateGameSource = extractFunctionSource(source, 'updateGame')

  assert.match(source, /engine\.runtime\.navigation\.setAgents\(agents\)/)
  assert.match(source, /engine\.runtime\.collision\.setObstacles\(/)
  assert.match(source, /resolveDrivingGamePlayerCollisionStep/)
  assert.match(updateGameSource, /resolveDrivingGameNpcMovementStep\(/)
  assert.match(source, /engine\.runtime\.navigation\.stepAgents\(/)
  assert.match(updateGameSource, /resolveDrivingGamePlayerCollisionStep\(/)
  assert.match(source, /engine\.runtime\.collision\.resolve\(/)
  assert.doesNotMatch(updateGameSource, /cityMap\.blockers/)
  assert.doesNotMatch(updateGameSource, /for \(const .*blocker/)
  assert.doesNotMatch(updateGameSource, /for \(const .*obstacle/)
  assert.doesNotMatch(updateGameSource, /Math\.abs\([^)]*(blocker|obstacle|\.cx|\.cz)/)
})

test('open-world navigation and collision runtime namespaces keep generic API names', () => {
  const engine = createEngine({surface: createTestSurface(320, 180), backend: 'headless'})
  const semanticToken = /city|game|driving|vehicle|player/i
  const runtimeApiNames = [
    ...Object.keys(engine.runtime.navigation),
    ...Object.keys(engine.runtime.collision),
    ...Object.keys(engine.runtime.world).filter((name) => name.includes('Agent') || name.includes('Collision') || name.includes('OpenWorld')),
  ]

  assert.equal(runtimeApiNames.includes('setAgents'), true)
  assert.equal(runtimeApiNames.includes('stepAgents'), true)
  assert.equal(runtimeApiNames.includes('setObstacles'), true)
  assert.equal(runtimeApiNames.includes('resolve'), true)
  assert.deepEqual(runtimeApiNames.filter((name) => semanticToken.test(name)), [])
  engine.dispose()
})
