import type {DrivingGameState} from './drivingGameTypes'
import type {CityObstacle} from './cityWorldGenerator'

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

export function buildDrivingGameScene(
  state: DrivingGameState,
) {
  const {config: cfg, carX, carY, carYaw} = state
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

  const sunOrbital = ((cfg.timeOfDayHours - 6) / 24) * Math.PI * 2
  const sunHeight = Math.sin(sunOrbital)
  const sunAzimuthRad = ((cfg.directionDeg + (cfg.timeOfDayHours / 24) * 360) * Math.PI) / 180
  const sunDistance = ms * 0.62
  const sunX = Math.sin(sunAzimuthRad) * sunDistance
  const sunZ = Math.cos(sunAzimuthRad) * sunDistance
  const sunY = 100 + sunHeight * 180
  if (cfg.weather === 'sunny' && sunY > -20) {
    pushSphereMesh(nodes, {
      id: 'sun-sphere',
      cx: carX + sunX * 0.35,
      cy: Math.max(80, sunY),
      cz: carY + sunZ * 0.35,
      radius: 14,
      color: '#ffd166',
    })
  }
  const moonY = 100 + (-sunHeight) * 180
  if (cfg.weather === 'sunny' && moonY > -20 && sunHeight < -0.05) {
    pushSphereMesh(nodes, {
      id: 'moon-sphere',
      cx: -sunX * 0.92,
      cy: moonY,
      cz: -sunZ * 0.92,
      radius: 6,
      color: '#dbeafe',
    })
  }

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

  for (const lamp of state.cityMap.lamps) {
    pushBoxMesh(nodes, {
      id: `lamp-post-${lamp.id}`,
      cx: lamp.x,
      cy: lamp.h * 0.5,
      cz: lamp.z,
      width: 1.1,
      height: lamp.h,
      depth: 1.1,
      color: '#94a3b8',
    })
    pushSphereMesh(nodes, {
      id: `lamp-head-${lamp.id}`,
      cx: lamp.x,
      cy: lamp.h + 1.2,
      cz: lamp.z,
      radius: 1.2,
      color: '#fde68a',
    })
  }

  for (const npc of state.npcCars) {
    pushBoxMesh(nodes, {
      id: `npc-car-body-${npc.id}`,
      cx: npc.x,
      cy: 2.8,
      cz: npc.z,
      width: 8,
      height: 3.2,
      depth: 14,
      color: '#60a5fa',
      yawDeg: npc.yaw,
    })
  }
  for (const ped of state.pedestrians) {
    pushBoxMesh(nodes, {
      id: `ped-body-${ped.id}`,
      cx: ped.x,
      cy: 2.1,
      cz: ped.z,
      width: 1.4,
      height: 4.2,
      depth: 1.2,
      color: '#fca5a5',
      yawDeg: ped.yaw,
    })
    pushSphereMesh(nodes, {
      id: `ped-head-${ped.id}`,
      cx: ped.x,
      cy: 4.95,
      cz: ped.z,
      radius: 0.55,
      color: '#fde68a',
    })
  }

  // Player car (chassis + cabin).
  pushBoxMesh(nodes, {
    id: 'car-body',
    cx: carX,
    cy: 3,
    cz: carY,
    width: 10,
    height: 4,
    depth: 18,
    color: '#e63946',
    yawDeg: carYaw,
  })
  pushBoxMesh(nodes, {
    id: 'car-cabin',
    cx: carX,
    cy: 6,
    cz: carY - 1,
    width: 7,
    height: 3,
    depth: 8,
    color: '#a8dadc',
    yawDeg: carYaw,
  })

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
