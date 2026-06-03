import type {DrivingGameState} from './drivingGameTypes'
import type {CityObstacle} from './cityWorldGenerator'
import type {EngineRuntimeModelAssetDescriptor, EngineRuntimeModelInstanceDescriptor} from '@venus/engine'
import type {EngineSceneAssetMesh, EngineSceneAssetNode} from '@venus/engine'

const DRIVING_MODEL_IDS = {
  vehicle: 'driving-game-model-vehicle',
  pedestrian: 'driving-game-model-pedestrian',
  lamp: 'driving-game-model-lamp',
  sun: 'driving-game-model-sun',
  moon: 'driving-game-model-moon',
} as const

const createModelNode = (id: string, mesh: EngineSceneAssetMesh): EngineSceneAssetNode => ({
  id,
  name: id,
  children: [],
  translation: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: [1, 1, 1],
  mesh,
})

const createModelScene = (id: string, nodes: EngineSceneAssetNode[]) => ({
  metadata: {sourceFormat: 'playground-procedural-model', sourceUri: `playground://${id}`, version: '1'},
  nodes,
  materials: [],
  lights: [],
  animations: [],
})

const createSphereMesh = (radius: number): EngineSceneAssetMesh => {
  const lat = 12
  const lon = 16
  const positions: number[] = []
  const indices: number[] = []
  for (let y = 0; y <= lat; y += 1) {
    const v = y / lat
    const phi = v * Math.PI
    for (let x = 0; x <= lon; x += 1) {
      const u = x / lon
      const theta = u * Math.PI * 2
      const sx = Math.sin(phi) * Math.cos(theta)
      const sy = Math.cos(phi)
      const sz = Math.sin(phi) * Math.sin(theta)
      positions.push(sx * radius, sy * radius, sz * radius)
    }
  }
  for (let y = 0; y < lat; y += 1) {
    for (let x = 0; x < lon; x += 1) {
      const a = y * (lon + 1) + x
      const b = a + lon + 1
      indices.push(a, b, a + 1, b, b + 1, a + 1)
    }
  }
  return {positions, indices}
}

export const resolveDrivingGameSunDirection = (input: Pick<DrivingGameState['config'], 'directionDeg' | 'timeOfDayHours'>) => {
  const azimuthDeg = input.directionDeg + (input.timeOfDayHours / 24) * 360
  const azimuthRad = (azimuthDeg * Math.PI) / 180
  const orbitalRad = ((input.timeOfDayHours - 6) / 24) * Math.PI * 2
  const height = Math.sin(orbitalRad)
  return {
    azimuthDeg,
    azimuthRad,
    orbitalRad,
    height,
    x: Math.sin(azimuthRad),
    z: Math.cos(azimuthRad),
  }
}

const pushBoxMesh = (
  target: Array<Record<string, unknown>>,
  input: {
    id: string
    cx: number
    cy: number
    cz: number
    width: number
    height: number
    depth: number
    color: string
    yawDeg?: number
    materialId?: string
  },
) => {
  const hw = input.width * 0.5
  const hh = input.height * 0.5
  const hd = input.depth * 0.5
  const yaw = ((input.yawDeg ?? 0) * Math.PI) / 180
  const cos = Math.cos(yaw)
  const sin = Math.sin(yaw)
  const rotateY = (x: number, z: number) => {
    const dx = x - input.cx
    const dz = z - input.cz
    return {
      x: input.cx + dx * cos - dz * sin,
      z: input.cz + dx * sin + dz * cos,
    }
  }

  const v = [
    {x: input.cx - hw, y: input.cy - hh, z: input.cz - hd},
    {x: input.cx + hw, y: input.cy - hh, z: input.cz - hd},
    {x: input.cx + hw, y: input.cy + hh, z: input.cz - hd},
    {x: input.cx - hw, y: input.cy + hh, z: input.cz - hd},
    {x: input.cx - hw, y: input.cy - hh, z: input.cz + hd},
    {x: input.cx + hw, y: input.cy - hh, z: input.cz + hd},
    {x: input.cx + hw, y: input.cy + hh, z: input.cz + hd},
    {x: input.cx - hw, y: input.cy + hh, z: input.cz + hd},
  ].map((p) => {
    const rz = rotateY(p.x, p.z)
    return {x: rz.x, y: p.y, z: rz.z}
  })

  const positions = v.flatMap((p) => [p.x, p.y, p.z])
  const uvs = [
    0, 0,
    1, 0,
    1, 1,
    0, 1,
    0, 0,
    1, 0,
    1, 1,
    0, 1,
  ]
  const indices = [
    4, 5, 6, 4, 6, 7,
    0, 1, 2, 0, 2, 3,
    0, 4, 7, 0, 7, 3,
    1, 5, 6, 1, 6, 2,
    3, 2, 6, 3, 6, 7,
    0, 1, 5, 0, 5, 4,
  ]

  target.push({
    id: input.id,
    kind: 'custom',
    mesh: {
      topology: 'triangles',
      positions,
      indices,
      uvs,
      color: input.color,
      ...(input.materialId ? {materialId: input.materialId} : {}),
    },
    ...(input.materialId ? {materialId: input.materialId} : {}),
  })
}

const pushSphereMesh = (
  target: Array<Record<string, unknown>>,
  input: {id: string; cx: number; cy: number; cz: number; radius: number; color: string},
) => {
  const lat = 12
  const lon = 16
  const positions: number[] = []
  const indices: number[] = []
  for (let y = 0; y <= lat; y += 1) {
    const v = y / lat
    const phi = v * Math.PI
    for (let x = 0; x <= lon; x += 1) {
      const u = x / lon
      const theta = u * Math.PI * 2
      const sx = Math.sin(phi) * Math.cos(theta)
      const sy = Math.cos(phi)
      const sz = Math.sin(phi) * Math.sin(theta)
      positions.push(input.cx + sx * input.radius, input.cy + sy * input.radius, input.cz + sz * input.radius)
    }
  }
  for (let y = 0; y < lat; y += 1) {
    for (let x = 0; x < lon; x += 1) {
      const a = y * (lon + 1) + x
      const b = a + lon + 1
      indices.push(a, b, a + 1, b, b + 1, a + 1)
    }
  }
  target.push({
    id: input.id,
    kind: 'custom',
    mesh: {topology: 'triangles', positions, indices, color: input.color},
  })
}

const seededUnit = (seed: number, index: number) => {
  let value = (seed ^ (index * 0x9e3779b9)) >>> 0
  value = (value ^ (value >>> 16)) >>> 0
  value = Math.imul(value, 0x7feb352d) >>> 0
  value = (value ^ (value >>> 15)) >>> 0
  value = Math.imul(value, 0x846ca68b) >>> 0
  value = (value ^ (value >>> 16)) >>> 0
  return value / 0xffffffff
}

export const createDrivingGameWeatherParticleNodes = (state: DrivingGameState): Array<Record<string, unknown>> => {
  const {config: cfg, carX, carY} = state
  if (!cfg.weatherParticlesEnabled) {
    return []
  }
  const nodes: Array<Record<string, unknown>> = []
  const span = Math.min(260, Math.max(120, cfg.mapSize * 0.48))
  const seed = Math.floor(cfg.mapSeed + cfg.mapSize * 13 + cfg.timeOfDayHours * 17)
  if (cfg.weather === 'rainy') {
    const count = 36
    for (let index = 0; index < count; index += 1) {
      const x = carX + (seededUnit(seed, index * 3) - 0.5) * span
      const z = carY + (seededUnit(seed, index * 3 + 1) - 0.5) * span
      const y = 18 + seededUnit(seed, index * 3 + 2) * 56
      pushBoxMesh(nodes, {
        id: `weather-rain-${index}`,
        cx: x,
        cy: y,
        cz: z,
        width: 0.45,
        height: 12,
        depth: 0.45,
        color: '#93c5fd',
        yawDeg: -14,
      })
    }
  }
  if (cfg.weather === 'foggy') {
    const count = 10
    for (let index = 0; index < count; index += 1) {
      const layer = index - (count - 1) * 0.5
      const x = carX + (seededUnit(seed, index * 5) - 0.5) * span * 0.22
      const z = carY + layer * 18
      const width = span * (0.62 + seededUnit(seed, index * 5 + 1) * 0.28)
      pushBoxMesh(nodes, {
        id: `weather-fog-${index}`,
        cx: x,
        cy: 6 + seededUnit(seed, index * 5 + 2) * 12,
        cz: z,
        width,
        height: 2.6,
        depth: 7 + seededUnit(seed, index * 5 + 3) * 8,
        color: '#cbd5e1',
        yawDeg: state.cameraAzimuth + (seededUnit(seed, index * 5 + 4) - 0.5) * 10,
      })
    }
  }
  return nodes
}

export function createDrivingGameModelAssets(): EngineRuntimeModelAssetDescriptor[] {
  return [
    {
      id: DRIVING_MODEL_IDS.vehicle,
      scene: createModelScene(DRIVING_MODEL_IDS.vehicle, [
        createModelNode('body', {positions: [-4, -1.6, -7, 4, -1.6, -7, 0, 1.6, 7], indices: [0, 1, 2]}),
        createModelNode('cabin', {positions: [-3.5, 0, -4, 3.5, 0, -4, 0, 3, 4], indices: [0, 1, 2]}),
      ]),
      lodDistances: [90, 220],
    },
    {
      id: DRIVING_MODEL_IDS.pedestrian,
      scene: createModelScene(DRIVING_MODEL_IDS.pedestrian, [
        createModelNode('body', {positions: [-0.7, 0, -0.6, 0.7, 0, -0.6, 0, 4.2, 0.6], indices: [0, 1, 2]}),
        createModelNode('head', {positions: [-0.45, 4.4, 0, 0.45, 4.4, 0, 0, 5.5, 0], indices: [0, 1, 2]}),
      ]),
      lodDistances: [60, 160],
    },
    {
      id: DRIVING_MODEL_IDS.lamp,
      scene: createModelScene(DRIVING_MODEL_IDS.lamp, [
        createModelNode('post', {positions: [-0.55, 0, -0.55, 0.55, 0, -0.55, 0, 10, 0.55], indices: [0, 1, 2]}),
        createModelNode('head', {positions: [-1.2, 10, 0, 1.2, 10, 0, 0, 12.4, 0], indices: [0, 1, 2]}),
      ]),
      lodDistances: [80, 200],
    },
    {
      id: DRIVING_MODEL_IDS.sun,
      scene: createModelScene(DRIVING_MODEL_IDS.sun, [
        createModelNode('orb', createSphereMesh(1)),
      ]),
      lodDistances: [300],
    },
    {
      id: DRIVING_MODEL_IDS.moon,
      scene: createModelScene(DRIVING_MODEL_IDS.moon, [
        createModelNode('orb', createSphereMesh(1)),
      ]),
      lodDistances: [300],
    },
  ]
}

export function createDrivingGameModelInstances(state: DrivingGameState): EngineRuntimeModelInstanceDescriptor[] {
  const {config: cfg, carX, carY, carYaw} = state
  const instances: EngineRuntimeModelInstanceDescriptor[] = [
    {id: 'player-car', modelId: DRIVING_MODEL_IDS.vehicle, translation: [carX, 0, carY], rotation: [0, (carYaw * Math.PI) / 180, 0], color: '#e63946'},
    ...state.npcCars.map((npc) => ({
      id: `npc-car-${npc.id}`,
      modelId: DRIVING_MODEL_IDS.vehicle,
      translation: [npc.x, 0, npc.z] as const,
      rotation: [0, (npc.yaw * Math.PI) / 180, 0] as const,
      color: '#60a5fa',
    })),
    ...state.pedestrians.map((ped) => ({
      id: `ped-${ped.id}`,
      modelId: DRIVING_MODEL_IDS.pedestrian,
      translation: [ped.x, 0, ped.z] as const,
      rotation: [0, (ped.yaw * Math.PI) / 180, 0] as const,
      color: '#fca5a5',
    })),
    ...state.cityMap.lamps.map((lamp) => ({
      id: `lamp-${lamp.id}`,
      modelId: DRIVING_MODEL_IDS.lamp,
      translation: [lamp.x, 0, lamp.z] as const,
      scale: [1, lamp.h / 10, 1] as const,
      color: '#fde68a',
    })),
  ]

  const sunDirection = resolveDrivingGameSunDirection(cfg)
  const sunDistance = cfg.mapSize * 0.62
  const sunX = sunDirection.x * sunDistance
  const sunZ = sunDirection.z * sunDistance
  const sunY = 100 + sunDirection.height * 180
  if (cfg.weather === 'sunny' && sunY > -20) {
    instances.push({id: 'sun', modelId: DRIVING_MODEL_IDS.sun, translation: [carX + sunX * 0.35, Math.max(80, sunY), carY + sunZ * 0.35], scale: [14, 14, 14], color: '#ffd166'})
  }
  const moonY = 100 + (-sunDirection.height) * 180
  if (cfg.weather === 'sunny' && moonY > -20 && sunDirection.height < -0.05) {
    instances.push({id: 'moon', modelId: DRIVING_MODEL_IDS.moon, translation: [-sunX * 0.92, moonY, -sunZ * 0.92], scale: [6, 6, 6], color: '#dbeafe'})
  }

  return instances
}

const pushDrivingGameModelInstance = (
  target: Array<Record<string, unknown>>,
  instance: EngineRuntimeModelInstanceDescriptor,
) => {
  const [x, y, z] = instance.translation ?? [0, 0, 0]
  const yawDeg = ((instance.rotation?.[1] ?? 0) * 180) / Math.PI
  if (instance.modelId === DRIVING_MODEL_IDS.vehicle) {
    pushBoxMesh(target, {id: `${instance.id}-body`, cx: x, cy: y + 3, cz: z, width: 10, height: 4, depth: 18, color: instance.color ?? '#60a5fa', yawDeg})
    pushBoxMesh(target, {id: `${instance.id}-cabin`, cx: x, cy: y + 6, cz: z - 1, width: 7, height: 3, depth: 8, color: instance.id === 'player-car' ? '#a8dadc' : '#bfdbfe', yawDeg})
    return
  }
  if (instance.modelId === DRIVING_MODEL_IDS.pedestrian) {
    pushBoxMesh(target, {id: `${instance.id}-body`, cx: x, cy: y + 2.1, cz: z, width: 1.4, height: 4.2, depth: 1.2, color: instance.color ?? '#fca5a5', yawDeg})
    pushSphereMesh(target, {id: `${instance.id}-head`, cx: x, cy: y + 4.95, cz: z, radius: 0.55, color: '#fde68a'})
    return
  }
  if (instance.modelId === DRIVING_MODEL_IDS.lamp) {
    const height = 10 * (instance.scale?.[1] ?? 1)
    pushBoxMesh(target, {id: `${instance.id}-post`, cx: x, cy: y + height * 0.5, cz: z, width: 1.1, height, depth: 1.1, color: '#94a3b8'})
    pushSphereMesh(target, {id: `${instance.id}-head`, cx: x, cy: y + height + 1.2, cz: z, radius: 1.2, color: instance.color ?? '#fde68a'})
    return
  }
  if (instance.modelId === DRIVING_MODEL_IDS.sun || instance.modelId === DRIVING_MODEL_IDS.moon) {
    const radius = instance.scale?.[0] ?? 8
    pushSphereMesh(target, {id: `${instance.id}-sphere`, cx: x, cy: y, cz: z, radius, color: instance.color ?? '#ffd166'})
  }
}

export function buildDrivingGameScene(
  state: DrivingGameState,
) {
  const {config: cfg, carX, carY} = state
  const ms = cfg.mapSize
  const nodes: Array<Record<string, unknown>> = []
  const materials = [
    {
      id: 'game-ground-material',
      type: 'unlit',
      name: 'Game Ground Texture Material',
      baseColor: [1, 1, 1, 1],
      baseColorTexture: '/textures/grass_cc0_oga.png',
      baseColorTextureSampler: {
        wrapS: 'repeat',
        wrapT: 'repeat',
        minFilter: 'linear',
        magFilter: 'linear',
      },
      opacity: 1,
    },
    {
      id: 'game-road-material',
      type: 'unlit',
      name: 'Game Road Texture Material',
      baseColor: [1, 1, 1, 1],
      baseColorTexture: '/textures/asphalt_cc0_oga.png',
      baseColorTextureSampler: {
        wrapS: 'repeat',
        wrapT: 'repeat',
        minFilter: 'linear',
        magFilter: 'linear',
      },
      opacity: 1,
    },
  ]
  const computedNear = Math.max(0.2, Math.min(cfg.cameraNear, 4))
  const computedFar = Math.max(computedNear + 200, Math.min(cfg.cameraFar, ms * 4.5))

  nodes.push({
    id: '__engine_camera3d__',
    kind: 'custom',
    camera3d: {
      yaw: state.cameraAzimuth,
      pitch: -Math.max(10, Math.min(80, cfg.cameraPolar)),
      distance: 80 + cfg.cameraDistance * 220,
      targetX: carX,
      targetY: cfg.cameraTargetHeight,
      targetZ: carY,
      perspectiveFovY: cfg.cameraFovY,
      near: computedNear,
      far: computedFar,
      projectionMode: 'perspective',
    },
  })

  const modelInstances = createDrivingGameModelInstances(state)
  for (const instance of modelInstances.filter((item) => item.modelId === DRIVING_MODEL_IDS.sun || item.modelId === DRIVING_MODEL_IDS.moon)) {
    pushDrivingGameModelInstance(nodes, instance)
  }

  nodes.push(...createDrivingGameWeatherParticleNodes(state))

  const weatherGround = cfg.weather === 'rainy'
    ? '#2f4f36'
    : cfg.weather === 'foggy'
      ? '#5b6b60'
      : cfg.weather === 'cloudy'
        ? '#3f6f45'
        : '#4a7c3f'
  const weatherRoad = cfg.weather === 'rainy'
    ? '#3c4755'
    : cfg.weather === 'foggy'
      ? '#5a6470'
      : '#555555'
  // Ground and roads as flat boxes on XZ plane.
  pushBoxMesh(nodes, {id: 'ground', cx: 0, cy: -4, cz: 0, width: ms, height: 2, depth: ms, color: weatherGround, materialId: 'game-ground-material'})

  if (cfg.worldGridEnabled) {
    const gridStep = Math.max(8, cfg.worldGridStep)
    const lineThickness = Math.max(0.2, cfg.worldGridThickness)
    // Keep grid tightly attached to ground top to avoid floating/occlusion artifacts.
    const groundTopY = -3
    const gridY = groundTopY + 0.08
    const half = Math.floor((ms * 0.5) / gridStep)
    const extent = half * gridStep
    for (let i = -half; i <= half; i += 1) {
      const offset = i * gridStep
      const color = i === 0 ? '#64748b' : '#334155'
      pushBoxMesh(nodes, {
        id: `grid-x-${i}`,
        cx: 0,
        cy: gridY,
        cz: offset,
        width: extent * 2,
        height: 0.12,
        depth: lineThickness,
        color,
      })
      pushBoxMesh(nodes, {
        id: `grid-z-${i}`,
        cx: offset,
        cy: gridY,
        cz: 0,
        width: lineThickness,
        height: 0.12,
        depth: extent * 2,
        color,
      })
    }
  }

  const mapBlocks = state.cityMap.blockers
  for (const block of mapBlocks) {
    pushBoxMesh(nodes, {
      id: `map-block-${String(block.id)}`,
      cx: block.cx,
      cy: -1,
      cz: block.cz,
      width: block.w,
      height: 4,
      depth: block.d,
      color: '#1f2937',
    })
  }

  for (const road of state.cityMap.roads) {
    pushBoxMesh(nodes, {id: `road-${road.id}`, cx: road.cx, cy: -2, cz: road.cz, width: road.w, height: 2, depth: road.d, color: weatherRoad, materialId: 'game-road-material'})
    const span = road.axis === 'x' ? road.w : road.d
    for (let m = -span * 0.5 + 12; m < span * 0.5; m += 28) {
      const mx = road.axis === 'x' ? road.cx + m : road.cx
      const mz = road.axis === 'x' ? road.cz : road.cz + m
      pushBoxMesh(nodes, {
        id: `road-mark-${road.id}-${m}`,
        cx: mx,
        cy: -0.88,
        cz: mz,
        width: road.axis === 'x' ? 1.2 : 8,
        height: 0.18,
        depth: road.axis === 'x' ? 8 : 1.2,
        color: '#f8fafc',
      })
    }
  }

  for (const sidewalk of state.cityMap.sidewalks) {
    pushBoxMesh(nodes, {
      id: `sidewalk-${sidewalk.id}`,
      cx: sidewalk.cx,
      cy: -1.78,
      cz: sidewalk.cz,
      width: sidewalk.w,
      height: 0.8,
      depth: sidewalk.d,
      color: cfg.weather === 'rainy' ? '#6b7280' : '#9ca3af',
    })
  }

  for (const building of state.cityMap.buildings) {
    pushBoxMesh(nodes, {
      id: building.id,
      cx: building.cx,
      cy: building.h * 0.5,
      cz: building.cz,
      width: building.w,
      height: building.h,
      depth: building.d,
      color: building.color,
    })
  }

  for (const prop of state.cityMap.props) {
    pushBoxMesh(nodes, {
      id: `prop-${prop.id}`,
      cx: prop.cx,
      cy: prop.h * 0.5,
      cz: prop.cz,
      width: prop.w,
      height: prop.h,
      depth: prop.d,
      color: prop.color,
    })
    if (prop.kind === 'planter') {
      pushSphereMesh(nodes, {id: `prop-${prop.id}-foliage`, cx: prop.cx, cy: prop.h + 1.2, cz: prop.cz, radius: Math.max(prop.w, prop.d) * 0.45, color: '#22c55e'})
    }
  }

  for (const instance of modelInstances.filter((item) => item.modelId !== DRIVING_MODEL_IDS.sun && item.modelId !== DRIVING_MODEL_IDS.moon)) {
    pushDrivingGameModelInstance(nodes, instance)
  }

  return {revision: 1, nodes, materials}
}

export type DrivingMapBlock = {
  id: number
  cx: number
  cz: number
  w: number
  d: number
}

export function buildCollisionBlocks(mapSize: number): DrivingMapBlock[] {
  const half = mapSize * 0.5
  const ring = Math.max(36, Math.floor(mapSize * 0.12))
  const bars: DrivingMapBlock[] = [
    {id: 1, cx: 0, cz: -half + ring * 0.5, w: mapSize - ring, d: ring},
    {id: 2, cx: 0, cz: half - ring * 0.5, w: mapSize - ring, d: ring},
    {id: 3, cx: -half + ring * 0.5, cz: 0, w: ring, d: mapSize - ring},
    {id: 4, cx: half - ring * 0.5, cz: 0, w: ring, d: mapSize - ring},
    {id: 5, cx: -mapSize * 0.18, cz: mapSize * 0.08, w: mapSize * 0.22, d: 20},
    {id: 6, cx: mapSize * 0.2, cz: -mapSize * 0.16, w: 20, d: mapSize * 0.28},
    {id: 7, cx: mapSize * 0.06, cz: mapSize * 0.24, w: mapSize * 0.32, d: 18},
  ]
  return bars
}

export const convertCityObstaclesToCollisionBlocks = (obstacles: CityObstacle[]): DrivingMapBlock[] => {
  return obstacles.map((obstacle, index) => ({
    id: index + 1000,
    cx: obstacle.cx,
    cz: obstacle.cz,
    w: obstacle.w,
    d: obstacle.d,
  }))
}
