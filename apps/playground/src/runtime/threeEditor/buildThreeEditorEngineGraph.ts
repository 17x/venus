import type {PlaygroundSceneSnapshot} from '../../types/playgroundScene'
import type {BuildThreeEditorGraphParams, ThreeEditorWorldObject} from './threeEditorRuntimeContracts'

const WORLD_ORIGIN_X = 360
const WORLD_ORIGIN_Y = 230

/**
 * Projects one world-space x coordinate into canvas-space x using a stable runtime origin.
 * @param worldX Source world-space x coordinate.
 */
const toCanvasX = (worldX: number): number => {
  return WORLD_ORIGIN_X + worldX
}

/**
 * Projects one world-space y coordinate into canvas-space y using a stable runtime origin.
 * @param worldY Source world-space y coordinate.
 */
const toCanvasY = (worldY: number): number => {
  return WORLD_ORIGIN_Y - worldY
}

/**
 * Builds one deterministic engine graph node list from runtime state without viewport projection math.
 * @param params Scene synthesis input packet with camera, overlays, and world objects.
 */
export const buildThreeEditorEngineGraph = (
  params: BuildThreeEditorGraphParams,
): PlaygroundSceneSnapshot['nodes'] => {
  const nodes: PlaygroundSceneSnapshot['nodes'] = []

  // Keep one bounded stage backdrop so empty frames remain visually debuggable.
  nodes.push({
    id: 'stage-backdrop',
    type: 'shape',
    shape: 'rect',
    x: 18,
    y: 18,
    width: 684,
    height: 424,
    cornerRadius: 20,
    fill: '#0f172a',
    stroke: '#1e293b',
    strokeWidth: 2,
    overlayLayer: 'stage',
  })

  if (params.overlayState.gridEnabled) {
    appendGridNodes(nodes)
  }
  if (params.overlayState.axesEnabled) {
    appendAxisNodes(nodes)
  }
  appendObjectNodes(nodes, params)
  if (params.overlayState.gizmoEnabled) {
    appendCornerGizmoNodes(nodes, params.cameraState.yaw, params.cameraState.pitch)
  }

  return nodes
}

/**
 * Appends world-grid line nodes into the engine graph packet.
 * @param target Mutable node array receiving new grid nodes.
 */
const appendGridNodes = (target: PlaygroundSceneSnapshot['nodes']): void => {
  const step = 80
  const halfCount = 8
  for (let index = -halfCount; index <= halfCount; index += 1) {
    const offset = index * step
    target.push(
      {
        id: `grid-x-${index}`,
        type: 'shape',
        shape: 'line',
        x: toCanvasX(-halfCount * step),
        y: toCanvasY(offset),
        width: halfCount * step * 2,
        height: 0,
        stroke: index === 0 ? '#64748b' : '#334155',
        strokeWidth: index === 0 ? 2 : 1,
        overlayLayer: 'grid',
      },
      {
        id: `grid-y-${index}`,
        type: 'shape',
        shape: 'line',
        x: toCanvasX(offset),
        y: toCanvasY(halfCount * step),
        width: 0,
        height: -halfCount * step * 2,
        stroke: index === 0 ? '#64748b' : '#334155',
        strokeWidth: index === 0 ? 2 : 1,
        overlayLayer: 'grid',
      },
    )
  }
}

/**
 * Appends axis nodes from one shared origin to guarantee intersection stability.
 * @param target Mutable node array receiving new axis nodes.
 */
const appendAxisNodes = (target: PlaygroundSceneSnapshot['nodes']): void => {
  const axisLength = 420
  const originX = toCanvasX(0)
  const originY = toCanvasY(0)
  target.push(
    {
      id: 'axis-x',
      type: 'shape',
      shape: 'line',
      x: originX - axisLength * 0.72,
      y: originY,
      width: axisLength * 1.44,
      height: 0,
      stroke: '#ef4444',
      strokeWidth: 4,
      docEntityId: 'axis-x',
      docEntityLabel: 'X Axis',
      hitPrimitive: 'line',
      overlayLayer: 'axes',
    },
    {
      id: 'axis-y',
      type: 'shape',
      shape: 'rect',
      x: originX - 1.5,
      y: originY - axisLength * 0.72,
      width: 3,
      height: axisLength * 1.44,
      fill: '#22c55e',
      stroke: '#22c55e',
      strokeWidth: 0,
      docEntityId: 'axis-y',
      docEntityLabel: 'Y Axis',
      hitPrimitive: 'line',
      overlayLayer: 'axes',
    },
    {
      id: 'axis-z',
      type: 'shape',
      shape: 'line',
      x: originX,
      y: originY,
      width: axisLength * 0.56,
      height: -axisLength * 0.34,
      stroke: '#3b82f6',
      strokeWidth: 4,
      docEntityId: 'axis-z',
      docEntityLabel: 'Z Axis',
      hitPrimitive: 'line',
      overlayLayer: 'axes',
    },
    {
      id: 'axis-origin',
      type: 'shape',
      shape: 'ellipse',
      x: originX - 4,
      y: originY - 4,
      width: 8,
      height: 8,
      fill: '#bfdbfe',
      stroke: '#f8fafc',
      strokeWidth: 1,
      overlayLayer: 'axes',
    },
  )
}

/**
 * Appends semantic3d object nodes so engine-side render paths own final visual interpretation.
 * @param target Mutable node array receiving object nodes.
 * @param params Scene synthesis input packet with selection and camera state.
 */
const appendObjectNodes = (
  target: PlaygroundSceneSnapshot['nodes'],
  params: BuildThreeEditorGraphParams,
): void => {
  params.worldObjects.forEach((object, index) => {
    appendOneObjectNode(target, object, index, params)
  })
}

/**
 * Appends one object node with semantic3d payload and selection-aware styling.
 * @param target Mutable node array receiving one object node.
 * @param object Source world object contract.
 * @param objectIndex Stable index used by deterministic metadata fields.
 * @param params Scene synthesis input packet with interaction state.
 */
const appendOneObjectNode = (
  target: PlaygroundSceneSnapshot['nodes'],
  object: ThreeEditorWorldObject,
  objectIndex: number,
  params: BuildThreeEditorGraphParams,
): void => {
  const isHighlighted = params.selectedEntityId === object.id || params.hoverEntityId === object.id
  const strokeWidth = isHighlighted ? 4 : 2
  const stroke = isHighlighted ? '#f59e0b' : '#e2e8f0'

  target.push({
    id: `object-${object.id}`,
    type: 'shape',
    shape: 'rect',
    x: toCanvasX(object.x - object.width * 0.5),
    y: toCanvasY(object.y + object.height * 0.5),
    width: object.width,
    height: object.height,
    cornerRadius: 10,
    fill: object.color,
    stroke,
    strokeWidth,
    docEntityId: object.id,
    docEntityLabel: object.label,
    hitPrimitive: 'face',
    overlayLayer: 'objects',
    materialId: `${object.id}-material`,
    semantic3d: {
      bounds: {
        x: object.x - object.width * 0.5,
        y: object.y - object.height * 0.5,
        z: object.z,
        width: object.width,
        height: object.height,
        depth: object.depth,
      },
      transform: {
        x: object.x,
        y: object.y,
        z: object.z,
        rotationX: params.cameraState.pitch,
        rotationY: params.cameraState.yaw,
        rotationZ: 0,
        scaleX: 1,
        scaleY: 1,
        scaleZ: 1,
      },
      sourceType: 'shape',
      visible: params.overlayState.visibilityMaskEnabled ? objectIndex % 4 !== 3 : true,
      layer: params.overlayState.depthLayeringEnabled ? `depth-${objectIndex % 4}` : 'default',
      lighting: params.overlayState.lightingMode,
      metadata: {
        role: 'mesh',
        label: object.label,
      },
    },
  })
}

/**
 * Appends corner orientation gizmo nodes rotated by camera yaw/pitch only.
 * @param target Mutable node array receiving gizmo nodes.
 * @param yaw Camera yaw in degrees.
 * @param pitch Camera pitch in degrees.
 */
const appendCornerGizmoNodes = (
  target: PlaygroundSceneSnapshot['nodes'],
  yaw: number,
  pitch: number,
): void => {
  const originX = 430
  const originY = 74
  const length = 42
  const vectors = [
    {id: 'x', x: 1, y: 0, z: 0, color: '#ef4444'},
    {id: 'y', x: 0, y: 1, z: 0, color: '#22c55e'},
    {id: 'z', x: 0, y: 0, z: 1, color: '#3b82f6'},
  ] as const

  const yawRadians = (yaw * Math.PI) / 180
  const pitchRadians = (pitch * Math.PI) / 180
  const cosYaw = Math.cos(yawRadians)
  const sinYaw = Math.sin(yawRadians)
  const cosPitch = Math.cos(pitchRadians)
  const sinPitch = Math.sin(pitchRadians)

  vectors.forEach((vector) => {
    const yawX = cosYaw * vector.x - sinYaw * vector.z
    const yawZ = sinYaw * vector.x + cosYaw * vector.z
    const pitchY = cosPitch * vector.y - sinPitch * yawZ
    const lineWidth = yawX * length
    const lineHeight = -pitchY * length
    const lineLength = Math.hypot(lineWidth, lineHeight)
    if (lineLength < 1) {
      target.push({
        id: `gizmo-${vector.id}-point`,
        type: 'shape',
        shape: 'ellipse',
        x: originX - 3,
        y: originY - 3,
        width: 7,
        height: 7,
        fill: vector.color,
        stroke: '#e2e8f0',
        strokeWidth: 1,
        overlayLayer: 'gizmo',
      })
      return
    }
    target.push({
      id: `gizmo-${vector.id}`,
      type: 'shape',
      shape: 'line',
      x: originX,
      y: originY,
      width: lineWidth,
      height: lineHeight,
      stroke: vector.color,
      strokeWidth: 3,
      overlayLayer: 'gizmo',
    })
  })
}
