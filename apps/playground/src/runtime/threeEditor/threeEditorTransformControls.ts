import type {ThreeEditorWorldObject} from './threeEditorRuntimeContracts'

export type ThreeEditorGizmoAxis = 'x' | 'y' | 'z'
export type ThreeEditorGizmoMode = 'translate' | 'rotate' | 'scale'

export type ThreeEditorGizmoDragSnapshot = {
  axis: ThreeEditorGizmoAxis
  mode: ThreeEditorGizmoMode
  startX: number
  startY: number
  objectStartX: number
  objectStartY: number
  objectStartZ: number
  objectStartRotationXDeg: number
  objectStartRotationYDeg: number
  objectStartRotationZDeg: number
  objectStartScaleX: number
  objectStartScaleY: number
  objectStartScaleZ: number
}

export type ThreeEditorGizmoDragPoint = {
  x: number
  y: number
}

export const resolveThreeEditorEntityIdFromNodeId = (nodeId: string): string | null => {
  if (nodeId.startsWith('object-')) {
    return nodeId.slice('object-'.length)
  }
  if (nodeId.startsWith('selected-gizmo-')) {
    const body = nodeId.slice('selected-gizmo-'.length)
    const marker = body.indexOf('-t')
    if (marker > 0) {
      return body.slice(0, marker)
    }
    const markerR = body.indexOf('-r')
    if (markerR > 0) {
      return body.slice(0, markerR)
    }
    const markerS = body.indexOf('-s')
    if (markerS > 0) {
      return body.slice(0, markerS)
    }
  }
  if (nodeId === 'axis-x' || nodeId === 'axis-y' || nodeId === 'axis-z') {
    return nodeId
  }
  return null
}

export const resolveThreeEditorGizmoAxisFromNodeId = (nodeId: string): ThreeEditorGizmoAxis | null => {
  if (nodeId.includes('-tx') || nodeId.includes('-sx')) return 'x'
  if (nodeId.includes('-ty') || nodeId.includes('-sy')) return 'y'
  if (nodeId.includes('-tz') || nodeId.includes('-sz')) return 'z'
  if (nodeId.includes('-rx-')) return 'x'
  if (nodeId.includes('-ry-')) return 'y'
  if (nodeId.includes('-rz-')) return 'z'
  return null
}

export const resolveThreeEditorGizmoModeFromNodeId = (nodeId: string): ThreeEditorGizmoMode | null => {
  if (nodeId.includes('-tx') || nodeId.includes('-ty') || nodeId.includes('-tz')) return 'translate'
  if (nodeId.includes('-rx-') || nodeId.includes('-ry-') || nodeId.includes('-rz-')) return 'rotate'
  if (nodeId.includes('-sx') || nodeId.includes('-sy') || nodeId.includes('-sz')) return 'scale'
  return null
}

export const createThreeEditorGizmoDragSnapshot = (
  object: ThreeEditorWorldObject,
  input: {
    axis: ThreeEditorGizmoAxis
    mode: ThreeEditorGizmoMode
    startX: number
    startY: number
  },
): ThreeEditorGizmoDragSnapshot => ({
  axis: input.axis,
  mode: input.mode,
  startX: input.startX,
  startY: input.startY,
  objectStartX: object.x,
  objectStartY: object.y,
  objectStartZ: object.z,
  objectStartRotationXDeg: object.rotationXDeg ?? 0,
  objectStartRotationYDeg: object.rotationYDeg ?? 0,
  objectStartRotationZDeg: object.rotationZDeg ?? 0,
  objectStartScaleX: object.scaleX ?? 1,
  objectStartScaleY: object.scaleY ?? 1,
  objectStartScaleZ: object.scaleZ ?? 1,
})

export const resolveThreeEditorGizmoDragTransform = (
  snapshot: ThreeEditorGizmoDragSnapshot,
  point: ThreeEditorGizmoDragPoint,
  cameraDistance: number,
): Partial<ThreeEditorWorldObject> => {
  const dx = point.x - snapshot.startX
  const dy = point.y - snapshot.startY
  const moveScale = Math.max(0.05, cameraDistance * 0.0022)
  if (snapshot.mode === 'translate') {
    if (snapshot.axis === 'x') {
      return {x: snapshot.objectStartX + dx * moveScale}
    }
    if (snapshot.axis === 'y') {
      return {y: snapshot.objectStartY - dy * moveScale}
    }
    return {z: snapshot.objectStartZ - dy * moveScale}
  }

  const dragDelta = dx - dy
  if (snapshot.mode === 'rotate') {
    const rotationDelta = dragDelta * 0.25
    if (snapshot.axis === 'x') {
      return {rotationXDeg: snapshot.objectStartRotationXDeg + rotationDelta}
    }
    if (snapshot.axis === 'y') {
      return {rotationYDeg: snapshot.objectStartRotationYDeg + rotationDelta}
    }
    return {rotationZDeg: snapshot.objectStartRotationZDeg + rotationDelta}
  }

  const scaleFactor = Math.max(0.15, 1 + dragDelta * 0.005)
  if (snapshot.axis === 'x') {
    return {scaleX: Math.max(0.15, snapshot.objectStartScaleX * scaleFactor)}
  }
  if (snapshot.axis === 'y') {
    return {scaleY: Math.max(0.15, snapshot.objectStartScaleY * scaleFactor)}
  }
  return {scaleZ: Math.max(0.15, snapshot.objectStartScaleZ * scaleFactor)}
}
