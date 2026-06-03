import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import test from 'node:test'

import {createEngine, createTestSurface} from '@venus/engine'
import type {CityObstacle, CityPathNode} from '../demos/cityWorldGenerator'
import {generateCityWorldMap} from '../demos/cityWorldGenerator'
import {projectDrivingGameFixture} from '../demos/drivingGameFixture'
import {resolveDrivingGamePlayerCollisionStep} from '../demos/drivingGamePage'

const readWorkspaceFile = (path: string): string => readFileSync(join(process.cwd(), '../..', path), 'utf8')
const readJson = (path: string): unknown => JSON.parse(readFileSync(join(process.cwd(), path), 'utf8')) as unknown

function circlePenetratesBlocker(x: number, z: number, radius: number, blocker: Pick<CityObstacle, 'cx' | 'cz' | 'w' | 'd'>): boolean {
  const closestX = Math.max(blocker.cx - blocker.w * 0.5, Math.min(x, blocker.cx + blocker.w * 0.5))
  const closestZ = Math.max(blocker.cz - blocker.d * 0.5, Math.min(z, blocker.cz + blocker.d * 0.5))
  return Math.hypot(x - closestX, z - closestZ) < radius
}

function assertPathAvoidsBlockers(path: CityPathNode[], blockers: CityObstacle[], radius: number): void {
  for (const node of path) {
    const penetrated = blockers.filter((blocker) => circlePenetratesBlocker(node.x, node.z, radius, blocker))
    assert.deepEqual(penetrated.map((blocker) => blocker.id), [])
  }
}

test('S10 player collision substeps prevent high-speed blocker pass-through', () => {
  const engine = createEngine({surface: createTestSurface(320, 180), backend: 'headless'})
  engine.runtime.collision.setObstacles([
    {id: 'wall', x: 0, z: 0, width: 20, depth: 80},
  ])

  const resolved = resolveDrivingGamePlayerCollisionStep({
    engine,
    fromX: -40,
    fromZ: 0,
    toX: 40,
    toZ: 0,
    radius: 4,
    velocityX: 80,
    velocityZ: 0,
    maxStepDistance: 2,
  })

  assert.equal(resolved.collided, true)
  assert.equal(resolved.x <= -14 || resolved.x >= 14, true)
  assert.equal(resolved.x < 0, true)
  assert.equal(Math.abs(resolved.velocityX) < 80, true)
  engine.dispose()
})

test('S10 generated NPC and pedestrian paths avoid generated blockers', () => {
  const cityMap = generateCityWorldMap(420, 10010)
  assertPathAvoidsBlockers(cityMap.carPath, cityMap.blockers, 4)
  assertPathAvoidsBlockers(cityMap.pedestrianPath, cityMap.blockers, 2)

  const engine = createEngine({surface: createTestSurface(320, 180), backend: 'headless'})
  engine.runtime.collision.setObstacles(cityMap.blockers.map((blocker) => ({
    id: blocker.id,
    x: blocker.cx,
    z: blocker.cz,
    width: blocker.w,
    depth: blocker.d,
  })))
  engine.runtime.navigation.setAgents([
    {id: 'path-car', kind: 'car', x: cityMap.carPath[0]?.x ?? 0, z: cityMap.carPath[0]?.z ?? 0, yaw: 0, pathIndex: 0, speed: 8},
    {id: 'path-ped', kind: 'pedestrian', x: cityMap.pedestrianPath[0]?.x ?? 0, z: cityMap.pedestrianPath[0]?.z ?? 0, yaw: 0, pathIndex: 0, speed: 2},
  ])

  for (let stepIndex = 0; stepIndex < 120; stepIndex += 1) {
    const stepped = engine.runtime.navigation.stepAgents({
      deltaSeconds: 1 / 30,
      carPath: cityMap.carPath,
      pedestrianPath: cityMap.pedestrianPath,
    })
    for (const agent of stepped) {
      const radius = agent.kind === 'car' ? 4 : 2
      const penetrated = cityMap.blockers.filter((blocker) => circlePenetratesBlocker(agent.x, agent.z, radius, blocker))
      assert.deepEqual(penetrated.map((blocker) => blocker.id), [])
    }
  }
  engine.dispose()
})

test('S10 canonical fixture NPC and pedestrian paths avoid fixture blockers', () => {
  const fixture = readJson('public/scenario-fixtures/s10/s10-city-openworld.fixture.json')
  const projection = projectDrivingGameFixture(fixture)

  assertPathAvoidsBlockers(projection.cityMap.carPath, projection.cityMap.blockers, 4)
  assertPathAvoidsBlockers(projection.cityMap.pedestrianPath, projection.cityMap.blockers, 2)
})

test('S10 collision expansion documents NPC policy and engine collision backlog', () => {
  const demosReadme = readWorkspaceFile('apps/playground/src/demos/README.md')
  assert.match(demosReadme, /S10 NPC\/pedestrian collision policy/)
  assert.match(demosReadme, /path-authored avoidance/)
  assert.match(demosReadme, /engine\.runtime\.navigation/)
  assert.match(demosReadme, /engine\.runtime\.collision/)

  const engineBacklog = readWorkspaceFile('.ai-tasks/engine/engine-openworld-capability-backlog-2026-06-01.md')
  assert.match(engineBacklog, /collider registration/)
  assert.match(engineBacklog, /broadphase query/)
  assert.match(engineBacklog, /resolve penetration/)
  assert.match(engineBacklog, /trigger events/)
})
