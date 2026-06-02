import type {PlaygroundSceneSnapshot} from '../../types/playgroundScene'
import type {BuildThreeEditorGraphParams} from './threeEditorRuntimeContracts'
import {sampleProceduralTextureColor} from '../materials/proceduralTextureAtlas'

export type ThreeEditorEngineGraph = Pick<PlaygroundSceneSnapshot, 'nodes' | 'materials'>

const EDITOR_FLOOR_MATERIAL_ID = 'editor-floor-material'
const EDITOR_PANEL_MATERIAL_ID = 'editor-panel-material'

const createEditorMaterials = (): NonNullable<PlaygroundSceneSnapshot['materials']> => [
  {
    id: EDITOR_FLOOR_MATERIAL_ID,
    type: 'unlit',
    name: 'Editor Floor Texture Material',
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
  {
    id: EDITOR_PANEL_MATERIAL_ID,
    type: 'unlit',
    name: 'Editor Object Panel Texture Material',
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
]

const pushSegmentPrismMeshNode = (
  target: PlaygroundSceneSnapshot['nodes'],
  id: string,
  x1: number,
  y1: number,
  z1: number,
  x2: number,
  y2: number,
  z2: number,
  color: string,
  halfThickness = 0.6,
) => {
  const dx = x2 - x1
  const dy = y2 - y1
  const dz = z2 - z1
  const len = Math.hypot(dx, dy, dz)
  if (len < 0.0001) {
    return
  }
  const fx = dx / len
  const fy = dy / len
  const fz = dz / len
  const refX = Math.abs(fy) > 0.9 ? 1 : 0
  const refY = Math.abs(fy) > 0.9 ? 0 : 1
  const refZ = 0
  const rxRaw = refY * fz - refZ * fy
  const ryRaw = refZ * fx - refX * fz
  const rzRaw = refX * fy - refY * fx
  const rLen = Math.hypot(rxRaw, ryRaw, rzRaw) || 1
  const rx = rxRaw / rLen
  const ry = ryRaw / rLen
  const rz = rzRaw / rLen
  const uxRaw = fy * rz - fz * ry
  const uyRaw = fz * rx - fx * rz
  const uzRaw = fx * ry - fy * rx
  const uLen = Math.hypot(uxRaw, uyRaw, uzRaw) || 1
  const ux = uxRaw / uLen
  const uy = uyRaw / uLen
  const uz = uzRaw / uLen

  const rtx = rx * halfThickness
  const rty = ry * halfThickness
  const rtz = rz * halfThickness
  const utx = ux * halfThickness
  const uty = uy * halfThickness
  const utz = uz * halfThickness

  const p0 = [x1 - rtx - utx, y1 - rty - uty, z1 - rtz - utz]
  const p1 = [x1 + rtx - utx, y1 + rty - uty, z1 + rtz - utz]
  const p2 = [x1 + rtx + utx, y1 + rty + uty, z1 + rtz + utz]
  const p3 = [x1 - rtx + utx, y1 - rty + uty, z1 - rtz + utz]
  const p4 = [x2 - rtx - utx, y2 - rty - uty, z2 - rtz - utz]
  const p5 = [x2 + rtx - utx, y2 + rty - uty, z2 + rtz - utz]
  const p6 = [x2 + rtx + utx, y2 + rty + uty, z2 + rtz + utz]
  const p7 = [x2 - rtx + utx, y2 - rty + uty, z2 - rtz + utz]

  const positions = [...p0, ...p1, ...p2, ...p3, ...p4, ...p5, ...p6, ...p7]
  const indices = [
    4, 5, 6, 4, 6, 7,
    0, 1, 2, 0, 2, 3,
    0, 4, 7, 0, 7, 3,
    1, 5, 6, 1, 6, 2,
    3, 2, 6, 3, 6, 7,
    0, 1, 5, 0, 5, 4,
  ]

  target.push({
    id,
    kind: 'custom',
    mesh: {
      topology: 'triangles',
      positions,
      indices,
      color,
    },
  })
}

const pushBoxMeshNode = (
  target: PlaygroundSceneSnapshot['nodes'],
  input: {
    id: string
    cx: number
    cy: number
    cz: number
    width: number
    height: number
    depth: number
    color: string
    rotationYDeg?: number
    materialId?: string
    metadata?: Record<string, unknown>
    semantic3d?: Record<string, unknown>
  },
) => {
  const hw = input.width * 0.5
  const hh = input.height * 0.5
  const hd = input.depth * 0.5

  const yaw = ((input.rotationYDeg ?? 0) * Math.PI) / 180
  const cos = Math.cos(yaw)
  const sin = Math.sin(yaw)
  const rotate = (x: number, z: number) => {
    const dx = x - input.cx
    const dz = z - input.cz
    return {
      x: input.cx + dx * cos - dz * sin,
      z: input.cz + dx * sin + dz * cos,
    }
  }
  const corners = [
    {x: input.cx - hw, y: input.cy - hh, z: input.cz - hd},
    {x: input.cx + hw, y: input.cy - hh, z: input.cz - hd},
    {x: input.cx + hw, y: input.cy + hh, z: input.cz - hd},
    {x: input.cx - hw, y: input.cy + hh, z: input.cz - hd},
    {x: input.cx - hw, y: input.cy - hh, z: input.cz + hd},
    {x: input.cx + hw, y: input.cy - hh, z: input.cz + hd},
    {x: input.cx + hw, y: input.cy + hh, z: input.cz + hd},
    {x: input.cx - hw, y: input.cy + hh, z: input.cz + hd},
  ]
  const p = corners.flatMap((entry) => {
    const r = rotate(entry.x, entry.z)
    return [r.x, entry.y, r.z]
  })

  const indices = [
    4, 5, 6, 4, 6, 7,
    0, 1, 2, 0, 2, 3,
    0, 4, 7, 0, 7, 3,
    1, 5, 6, 1, 6, 2,
    3, 2, 6, 3, 6, 7,
    0, 1, 5, 0, 5, 4,
  ]
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

  target.push({
    id: input.id,
    kind: 'custom',
    mesh: {
      topology: 'triangles',
      positions: p,
      indices,
      uvs,
      color: input.color,
      ...(input.materialId ? {materialId: input.materialId} : {}),
    },
    ...(input.materialId ? {materialId: input.materialId} : {}),
    ...(input.metadata ? input.metadata : {}),
    ...(input.semantic3d ? {semantic3d: input.semantic3d} : {}),
  })
}

const pushConeMeshNode = (
  target: PlaygroundSceneSnapshot['nodes'],
  input: {
    id: string
    cx: number
    cy: number
    cz: number
    radius: number
    height: number
    color: string
    metadata?: Record<string, unknown>
    semantic3d?: Record<string, unknown>
  },
) => {
  const segments = 20
  const halfHeight = input.height * 0.5
  const apex = [input.cx, input.cy + halfHeight, input.cz]
  const baseY = input.cy - halfHeight
  const positions: number[] = [...apex]
  for (let i = 0; i < segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2
    positions.push(
      input.cx + Math.cos(angle) * input.radius,
      baseY,
      input.cz + Math.sin(angle) * input.radius,
    )
  }
  const baseCenterIndex = positions.length / 3
  positions.push(input.cx, baseY, input.cz)

  const indices: number[] = []
  for (let i = 0; i < segments; i += 1) {
    const current = 1 + i
    const next = 1 + ((i + 1) % segments)
    indices.push(0, current, next)
    indices.push(baseCenterIndex, next, current)
  }

  target.push({
    id: input.id,
    kind: 'custom',
    mesh: {
      topology: 'triangles',
      positions,
      indices,
      color: input.color,
    },
    ...(input.metadata ? input.metadata : {}),
    ...(input.semantic3d ? {semantic3d: input.semantic3d} : {}),
  })
}

const pushPipeMeshNode = (
  target: PlaygroundSceneSnapshot['nodes'],
  input: {
    id: string
    cx: number
    cy: number
    cz: number
    radius: number
    innerRadius: number
    height: number
    color: string
    metadata?: Record<string, unknown>
    semantic3d?: Record<string, unknown>
  },
) => {
  const segments = 24
  const halfHeight = input.height * 0.5
  const topY = input.cy + halfHeight
  const bottomY = input.cy - halfHeight
  const positions: number[] = []

  for (let i = 0; i < segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    positions.push(
      input.cx + cos * input.radius, topY, input.cz + sin * input.radius,
      input.cx + cos * input.radius, bottomY, input.cz + sin * input.radius,
      input.cx + cos * input.innerRadius, topY, input.cz + sin * input.innerRadius,
      input.cx + cos * input.innerRadius, bottomY, input.cz + sin * input.innerRadius,
    )
  }

  const indices: number[] = []
  for (let i = 0; i < segments; i += 1) {
    const next = (i + 1) % segments
    const oTopA = i * 4
    const oBotA = oTopA + 1
    const iTopA = oTopA + 2
    const iBotA = oTopA + 3
    const oTopB = next * 4
    const oBotB = oTopB + 1
    const iTopB = oTopB + 2
    const iBotB = oTopB + 3

    indices.push(oTopA, oBotA, oTopB, oTopB, oBotA, oBotB)
    indices.push(iTopA, iTopB, iBotA, iTopB, iBotB, iBotA)
    indices.push(oTopA, oTopB, iTopA, oTopB, iTopB, iTopA)
    indices.push(oBotA, iBotA, oBotB, oBotB, iBotA, iBotB)
  }

  target.push({
    id: input.id,
    kind: 'custom',
    mesh: {
      topology: 'triangles',
      positions,
      indices,
      color: input.color,
    },
    ...(input.metadata ? input.metadata : {}),
    ...(input.semantic3d ? {semantic3d: input.semantic3d} : {}),
  })
}

const appendGridNodes = (target: PlaygroundSceneSnapshot['nodes'], gridY: number): void => {
  const step = 128
  const halfCount = 4
  const halfRange = halfCount * step
  const gridYMinor = gridY + 0.35
  for (let index = -halfCount; index <= halfCount; index += 1) {
    const offset = index * step
    const color = index === 0 ? '#5f6b75' : '#8a96a1'
    const thickness = 1.05
    pushSegmentPrismMeshNode(target, `grid-x-${index}`, -halfRange, gridY, offset, halfRange, gridY, offset, color, thickness)
    pushSegmentPrismMeshNode(target, `grid-z-${index}`, offset, gridYMinor, -halfRange, offset, gridYMinor, halfRange, color, thickness)
  }
}

const hexToRgba = (hexColor: string, alpha: number): string => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexColor)
  if (!m) return hexColor
  const r = Number.parseInt(m[1], 16)
  const g = Number.parseInt(m[2], 16)
  const b = Number.parseInt(m[3], 16)
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`
}

const resolveCameraVectors = (yaw: number, pitch: number) => {
  const yawRadians = (yaw * Math.PI) / 180
  const pitchRadians = (pitch * Math.PI) / 180
  const cosYaw = Math.cos(yawRadians)
  const sinYaw = Math.sin(yawRadians)
  const cosPitch = Math.cos(pitchRadians)
  const sinPitch = Math.sin(pitchRadians)
  const forward = {
    x: -sinYaw * cosPitch,
    y: sinPitch,
    z: -cosYaw * cosPitch,
  }
  const right = {
    x: cosYaw,
    y: 0,
    z: -sinYaw,
  }
  const up = {
    x: sinYaw * sinPitch,
    y: cosPitch,
    z: cosYaw * sinPitch,
  }
  return {forward, right, up}
}

const appendBackEdgeHighlight = (
  target: PlaygroundSceneSnapshot['nodes'],
  id: string,
  cx: number,
  cy: number,
  cz: number,
  width: number,
  height: number,
  depth: number,
  cameraState: BuildThreeEditorGraphParams['cameraState'],
) => {
  const hw = width * 0.5
  const hh = height * 0.5
  const hd = depth * 0.5
  const {forward} = resolveCameraVectors(cameraState.yaw, cameraState.pitch)
  const viewX = cx - (cameraState.targetX - forward.x * cameraState.distance)
  const viewY = cy - (cameraState.targetY - forward.y * cameraState.distance)
  const viewZ = cz - (cameraState.targetZ - forward.z * cameraState.distance)
  const ax = Math.abs(viewX)
  const ay = Math.abs(viewY)
  const az = Math.abs(viewZ)

  if (ax >= ay && ax >= az) {
    const x = viewX >= 0 ? cx - hw : cx + hw
    pushSegmentPrismMeshNode(target, `${id}-be-0`, x, cy - hh, cz - hd, x, cy + hh, cz - hd, '#fbbf24', 0.85)
    pushSegmentPrismMeshNode(target, `${id}-be-1`, x, cy + hh, cz - hd, x, cy + hh, cz + hd, '#fbbf24', 0.85)
    pushSegmentPrismMeshNode(target, `${id}-be-2`, x, cy + hh, cz + hd, x, cy - hh, cz + hd, '#fbbf24', 0.85)
    pushSegmentPrismMeshNode(target, `${id}-be-3`, x, cy - hh, cz + hd, x, cy - hh, cz - hd, '#fbbf24', 0.85)
    return
  }
  if (ay >= ax && ay >= az) {
    const y = viewY >= 0 ? cy - hh : cy + hh
    pushSegmentPrismMeshNode(target, `${id}-be-0`, cx - hw, y, cz - hd, cx + hw, y, cz - hd, '#fbbf24', 0.85)
    pushSegmentPrismMeshNode(target, `${id}-be-1`, cx + hw, y, cz - hd, cx + hw, y, cz + hd, '#fbbf24', 0.85)
    pushSegmentPrismMeshNode(target, `${id}-be-2`, cx + hw, y, cz + hd, cx - hw, y, cz + hd, '#fbbf24', 0.85)
    pushSegmentPrismMeshNode(target, `${id}-be-3`, cx - hw, y, cz + hd, cx - hw, y, cz - hd, '#fbbf24', 0.85)
    return
  }
  const z = viewZ >= 0 ? cz - hd : cz + hd
  pushSegmentPrismMeshNode(target, `${id}-be-0`, cx - hw, cy - hh, z, cx + hw, cy - hh, z, '#fbbf24', 0.85)
  pushSegmentPrismMeshNode(target, `${id}-be-1`, cx + hw, cy - hh, z, cx + hw, cy + hh, z, '#fbbf24', 0.85)
  pushSegmentPrismMeshNode(target, `${id}-be-2`, cx + hw, cy + hh, z, cx - hw, cy + hh, z, '#fbbf24', 0.85)
  pushSegmentPrismMeshNode(target, `${id}-be-3`, cx - hw, cy + hh, z, cx - hw, cy - hh, z, '#fbbf24', 0.85)
}

const appendTransformGizmoNodes = (
  target: PlaygroundSceneSnapshot['nodes'],
  id: string,
  cx: number,
  cy: number,
  cz: number,
  scale: number,
) => {
  const axisLen = Math.max(70, scale * 0.6)
  const ringRadius = Math.max(46, scale * 0.38)
  const t = Math.max(0.8, scale * 0.02)
  pushSegmentPrismMeshNode(target, `${id}-tx`, cx, cy, cz, cx + axisLen, cy, cz, '#ef4444', t)
  pushSegmentPrismMeshNode(target, `${id}-ty`, cx, cy, cz, cx, cy + axisLen, cz, '#22c55e', t)
  pushSegmentPrismMeshNode(target, `${id}-tz`, cx, cy, cz, cx, cy, cz + axisLen, '#3b82f6', t)
  pushBoxMeshNode(target, {id: `${id}-sx`, cx: cx + axisLen, cy, cz, width: 10, height: 10, depth: 10, color: '#ef4444'})
  pushBoxMeshNode(target, {id: `${id}-sy`, cx, cy: cy + axisLen, cz, width: 10, height: 10, depth: 10, color: '#22c55e'})
  pushBoxMeshNode(target, {id: `${id}-sz`, cx, cy, cz: cz + axisLen, width: 10, height: 10, depth: 10, color: '#3b82f6'})

  const seg = 40
  for (let i = 0; i < seg; i += 1) {
    const a0 = (i / seg) * Math.PI * 2
    const a1 = ((i + 1) / seg) * Math.PI * 2
    pushSegmentPrismMeshNode(target, `${id}-rx-${i}`, cx, cy + Math.cos(a0) * ringRadius, cz + Math.sin(a0) * ringRadius, cx, cy + Math.cos(a1) * ringRadius, cz + Math.sin(a1) * ringRadius, '#ef4444', 0.45)
    pushSegmentPrismMeshNode(target, `${id}-ry-${i}`, cx + Math.cos(a0) * ringRadius, cy, cz + Math.sin(a0) * ringRadius, cx + Math.cos(a1) * ringRadius, cy, cz + Math.sin(a1) * ringRadius, '#22c55e', 0.45)
    pushSegmentPrismMeshNode(target, `${id}-rz-${i}`, cx + Math.cos(a0) * ringRadius, cy + Math.sin(a0) * ringRadius, cz, cx + Math.cos(a1) * ringRadius, cy + Math.sin(a1) * ringRadius, cz, '#3b82f6', 0.45)
  }
}

const appendObjectNodes = (
  target: PlaygroundSceneSnapshot['nodes'],
  params: BuildThreeEditorGraphParams,
): void => {
  params.worldObjects.forEach((object, objectIndex) => {
    const isSelected = params.selectedEntityId === object.id
    const isHighlighted = isSelected || params.hoverEntityId === object.id
    const color = isSelected ? hexToRgba(object.color, 0.45) : isHighlighted ? '#f59e0b' : object.color
    const scaleX = Math.max(0.15, object.scaleX ?? 1)
    const scaleY = Math.max(0.15, object.scaleY ?? 1)
    const scaleZ = Math.max(0.15, object.scaleZ ?? 1)
    const width = (object.width ?? (object.radius ? object.radius * 2 : 120)) * scaleX
    const depth = (object.depth ?? (object.radius ? object.radius * 2 : 120)) * scaleZ
    const height = (object.height ?? 120) * scaleY
    const radius = (object.radius ?? Math.max(width, depth) * 0.5) * ((scaleX + scaleZ) * 0.5)
    const innerRadius = Math.max(6, Math.min(radius - 2, object.innerRadius ?? radius * 0.62))
    const cy = object.y + height * 0.5
    const metadata = {
      docEntityId: object.id,
      docEntityLabel: object.label,
      hitPrimitive: 'face',
      overlayLayer: 'objects',
      materialId: `${object.id}-material`,
      sourceKind: object.kind,
      ...(object.imageSrc ? {imageSrc: object.imageSrc} : {}),
    }
    const semantic3d = {
      bounds: {
        x: object.x - width * 0.5,
        y: object.y,
        z: object.z - depth * 0.5,
        width,
        height,
        depth,
      },
      transform: {
        x: object.x,
        y: cy,
        z: object.z,
        rotationX: 0,
        rotationY: object.rotationYDeg ?? 0,
        rotationZ: 0,
        scaleX,
        scaleY,
        scaleZ,
      },
      sourceType: 'mesh',
      visible: params.overlayState.visibilityMaskEnabled ? objectIndex % 4 !== 3 : true,
      layer: params.overlayState.depthLayeringEnabled ? `depth-${objectIndex % 4}` : 'default',
      lighting: params.overlayState.lightingMode,
      metadata: {
        role: object.kind,
        label: object.label,
        ...(object.imageSrc ? {imageSrc: object.imageSrc} : {}),
      },
    }

    if (object.kind === 'cone') {
      pushConeMeshNode(target, {
        id: `object-${object.id}`,
        cx: object.x,
        cy,
        cz: object.z,
        radius,
        height,
        color,
        metadata,
        semantic3d,
      })
      if (isSelected) {
        appendBackEdgeHighlight(target, `selected-outline-${object.id}`, object.x, cy, object.z, width, height, depth, params.cameraState)
        appendTransformGizmoNodes(target, `selected-gizmo-${object.id}`, object.x, cy, object.z, Math.max(width, height, depth))
      }
      return
    }

    if (object.kind === 'pipe') {
      pushPipeMeshNode(target, {
        id: `object-${object.id}`,
        cx: object.x,
        cy,
        cz: object.z,
        radius,
        innerRadius,
        height,
        color,
        metadata,
        semantic3d,
      })
      if (isSelected) {
        appendBackEdgeHighlight(target, `selected-outline-${object.id}`, object.x, cy, object.z, width, height, depth, params.cameraState)
        appendTransformGizmoNodes(target, `selected-gizmo-${object.id}`, object.x, cy, object.z, Math.max(width, height, depth))
      }
      return
    }

    pushBoxMeshNode(target, {
      id: `object-${object.id}`,
      cx: object.x,
      cy,
      cz: object.z,
      width,
      height,
      depth,
      color,
      metadata,
      semantic3d,
    })
    appendObjectTexturePanels(target, object.id, object.x, object.y + height, object.z, width, depth, params.textureSamplers?.panel)
    if (isSelected) {
      appendBackEdgeHighlight(target, `selected-outline-${object.id}`, object.x, cy, object.z, width, height, depth, params.cameraState)
      appendTransformGizmoNodes(target, `selected-gizmo-${object.id}`, object.x, cy, object.z, Math.max(width, height, depth))
    }
  })
}

const appendCheckerFloorTexture = (
  target: PlaygroundSceneSnapshot['nodes'],
  y: number,
  sampler?: (u: number, v: number) => string,
): void => {
  const step = 96
  const half = 4
  for (let ix = -half; ix < half; ix += 1) {
    for (let iz = -half; iz < half; iz += 1) {
      const even = (ix + iz) % 2 === 0
      const base = sampler
        ? sampler((ix + half) / (half * 2), (iz + half) / (half * 2))
        : sampleProceduralTextureColor('editor-floor', (ix + half) / (half * 2), (iz + half) / (half * 2))
      pushBoxMeshNode(target, {
        id: `floor-tex-${ix}-${iz}`,
        cx: ix * step + step * 0.5,
        cy: y,
        cz: iz * step + step * 0.5,
        width: step,
        height: 1.2,
        depth: step,
        color: even
          ? base
          : (sampler
            ? sampler((ix + half) / (half * 2) + 0.23, (iz + half) / (half * 2) + 0.11)
            : sampleProceduralTextureColor('editor-floor', (ix + half) / (half * 2) + 0.23, (iz + half) / (half * 2) + 0.11)),
        materialId: EDITOR_FLOOR_MATERIAL_ID,
      })
    }
  }
}

const appendObjectTexturePanels = (
  target: PlaygroundSceneSnapshot['nodes'],
  objectId: string,
  cx: number,
  topY: number,
  cz: number,
  width: number,
  depth: number,
  sampler?: (u: number, v: number) => string,
) => {
  const tile = Math.max(18, Math.min(46, Math.floor(Math.min(width, depth) / 4)))
  const countX = Math.max(1, Math.floor(width / tile))
  const countZ = Math.max(1, Math.floor(depth / tile))
  for (let ix = 0; ix < countX; ix += 1) {
    for (let iz = 0; iz < countZ; iz += 1) {
      const px = cx - width * 0.5 + (ix + 0.5) * (width / countX)
      const pz = cz - depth * 0.5 + (iz + 0.5) * (depth / countZ)
      pushBoxMeshNode(target, {
        id: `obj-tex-${objectId}-${ix}-${iz}`,
        cx: px,
        cy: topY + 0.75,
        cz: pz,
        width: (width / countX) * 0.88,
        height: 1.2,
        depth: (depth / countZ) * 0.88,
        color: sampler
          ? sampler(ix / Math.max(1, countX), iz / Math.max(1, countZ))
          : sampleProceduralTextureColor('panel-metal', ix / Math.max(1, countX), iz / Math.max(1, countZ)),
        materialId: EDITOR_PANEL_MATERIAL_ID,
      })
    }
  }
}

export const buildThreeEditorEngineGraph = (
  params: BuildThreeEditorGraphParams,
): ThreeEditorEngineGraph => {
  const nodes: PlaygroundSceneSnapshot['nodes'] = []
  const materials = createEditorMaterials()
  const cameraDistance = Math.max(1, params.cameraState.distance)
  const adaptiveNear = Math.max(0.5, Math.min(40, cameraDistance * 0.015))
  const adaptiveFar = Math.max(adaptiveNear + 800, Math.min(8000, cameraDistance * 6.5))
  const sceneMinY = params.worldObjects.reduce((minimum, object) => {
    const objectBaseY = object.y
    return objectBaseY < minimum ? objectBaseY : minimum
  }, 0)
  const gridY = sceneMinY - 1.5

  nodes.push({
    id: '__engine_camera3d__',
    kind: 'custom',
    camera3d: {
      yaw: params.cameraState.yaw,
      pitch: params.cameraState.pitch,
      distance: params.cameraState.distance,
      targetX: params.cameraState.targetX,
      targetY: params.cameraState.targetY,
      targetZ: params.cameraState.targetZ,
      perspectiveFovY: params.cameraState.perspectiveFovY,
      near: adaptiveNear,
      far: adaptiveFar,
      projectionMode: params.cameraState.projectionMode,
    },
  })

  if (params.overlayState.gridEnabled) appendGridNodes(nodes, gridY)
  appendCheckerFloorTexture(nodes, gridY - 1.2, params.textureSamplers?.floor)
  appendObjectNodes(nodes, params)

  return {nodes, materials}
}
