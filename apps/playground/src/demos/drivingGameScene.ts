import type {DrivingGameState} from './drivingGameTypes'

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
      color: input.color,
    },
  })
}

export function buildDrivingGameScene(state: DrivingGameState) {
  const {config: cfg, carX, carY, carYaw} = state
  const ms = cfg.mapSize
  const nodes: Array<Record<string, unknown>> = []

  nodes.push({
    id: '__engine_camera3d__',
    kind: 'custom',
    camera3d: {
      yaw: state.cameraOrbitAngle,
      pitch: -Math.max(10, Math.min(80, cfg.cameraPitch)),
      distance: 80 + cfg.cameraDistance * 220,
      targetX: carX,
      targetY: cfg.cameraTargetHeight,
      targetZ: carY,
      perspectiveFovY: cfg.cameraFovY,
      near: cfg.cameraNear,
      far: cfg.cameraFar,
      projectionMode: 'perspective',
    },
  })

  // Ground and roads as flat boxes on XZ plane.
  pushBoxMesh(nodes, {id: 'ground', cx: 0, cy: -4, cz: 0, width: ms, height: 2, depth: ms, color: '#4a7c3f'})

  if (cfg.worldGridEnabled) {
    const gridStep = Math.max(8, cfg.worldGridStep)
    const lineThickness = Math.max(0.2, cfg.worldGridThickness)
    const half = Math.floor((ms * 0.5) / gridStep)
    const extent = half * gridStep
    for (let i = -half; i <= half; i += 1) {
      const offset = i * gridStep
      const color = i === 0 ? '#64748b' : '#334155'
      pushBoxMesh(nodes, {
        id: `grid-x-${i}`,
        cx: 0,
        cy: -0.6,
        cz: offset,
        width: extent * 2,
        height: 0.24,
        depth: lineThickness,
        color,
      })
      pushBoxMesh(nodes, {
        id: `grid-z-${i}`,
        cx: offset,
        cy: -0.6,
        cz: 0,
        width: lineThickness,
        height: 0.24,
        depth: extent * 2,
        color,
      })
    }
  }

  for (let i = -ms / 2 + 20; i < ms / 2; i += 30) {
    pushBoxMesh(nodes, {id: `road-x-${i}`, cx: i, cy: -2, cz: 0, width: 12, height: 2, depth: ms, color: '#555555'})
    pushBoxMesh(nodes, {id: `road-z-${i}`, cx: 0, cy: -2, cz: i, width: ms, height: 2, depth: 12, color: '#555555'})
  }

  const rng = (() => { let s = 42; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 } })()
  const bc = ['#e8c170', '#c9a96e', '#d4a76a', '#b8956a', '#e0c080', '#c4986a']

  // Buildings as boxes.
  for (let i = 0; i < 42; i++) {
    const bx = (rng() - 0.5) * ms * 0.85
    const bz = (rng() - 0.5) * ms * 0.85
    // Keep spawn exclusion deterministic in world space so moving the car does not pop meshes in/out.
    if (Math.abs(bx) < 25 && Math.abs(bz) < 25) continue
    const bw = 8 + rng() * 22
    const bh = 12 + rng() * 48
    const bd = 8 + rng() * 22
    pushBoxMesh(nodes, {
      id: `building-${i}`,
      cx: bx,
      cy: bh * 0.5,
      cz: bz,
      width: bw,
      height: bh,
      depth: bd,
      color: bc[Math.floor(rng() * bc.length)],
    })
  }

  // Trees: trunk + canopy boxes.
  const tc = ['#228B22', '#2E8B2E', '#32CD32', '#3CB371', '#006400']
  for (let i = 0; i < 56; i++) {
    const tx = (rng() - 0.5) * ms * 0.9
    const tz = (rng() - 0.5) * ms * 0.9
    if (Math.abs(tx) < 18 && Math.abs(tz) < 18) continue
    pushBoxMesh(nodes, {id: `trunk-${i}`, cx: tx, cy: 6, cz: tz, width: 2.5, height: 12, depth: 2.5, color: '#8B4513'})
    pushBoxMesh(nodes, {id: `leaf-${i}`, cx: tx, cy: 14, cz: tz, width: 8, height: 10, depth: 8, color: tc[Math.floor(rng() * tc.length)]})
  }

  // Rocks
  const rc = ['#808080', '#696969', '#778899', '#708090', '#A9A9A9']
  for (let i = 0; i < 20; i++) {
    const rx = (rng() - 0.5) * ms * 0.84
    const rz = (rng() - 0.5) * ms * 0.84
    if (Math.abs(rx) < 12 && Math.abs(rz) < 12) continue
    const s = 3 + rng() * 6
    pushBoxMesh(nodes, {
      id: `rock-${i}`,
      cx: rx,
      cy: s * 0.4,
      cz: rz,
      width: s,
      height: s * 0.8,
      depth: s,
      color: rc[Math.floor(rng() * rc.length)],
      yawDeg: rng() * 360,
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

  return {revision: 1, nodes}
}
