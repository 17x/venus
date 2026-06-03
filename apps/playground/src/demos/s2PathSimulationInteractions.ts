import type {PlaygroundSceneSnapshot} from '../types/playgroundScene'

export type S2PathSimulationControl = 'edit path' | 'path step replay' | 'clearance query' | 'pick waypoint'

export interface S2PathSimulationState {
  stepIndex: number
  editIndex: number
  selectedWaypointId: string | null
  clearanceQueryId: string | null
  clearanceDistance: number
}

export interface S2PathSimulationInteractionResult {
  snapshot: PlaygroundSceneSnapshot
  state: S2PathSimulationState
}

type SceneNode = PlaygroundSceneSnapshot['nodes'][number] & Record<string, unknown>

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

function toNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function cloneSnapshot(snapshot: PlaygroundSceneSnapshot): PlaygroundSceneSnapshot {
  return {
    ...snapshot,
    nodes: snapshot.nodes.map((node) => (isRecord(node) ? {...node} : node)),
  }
}

function waypointIndex(id: string): number {
  const parsed = Number.parseInt(id.replace('s2-waypoint-', ''), 10)
  return Number.isFinite(parsed) ? parsed : 0
}

function collectWaypointIds(snapshot: PlaygroundSceneSnapshot): string[] {
  return snapshot.nodes
    .filter((node) => node.id.startsWith('s2-waypoint-'))
    .map((node) => node.id)
    .sort((a, b) => waypointIndex(a) - waypointIndex(b))
}

function distanceToRiskZone(waypoint: SceneNode, riskZone: SceneNode): number {
  const wx = toNumber(waypoint.x)
  const wy = toNumber(waypoint.y)
  const left = toNumber(riskZone.x)
  const top = toNumber(riskZone.y)
  const right = left + toNumber(riskZone.width)
  const bottom = top + toNumber(riskZone.height)
  const dx = wx < left ? left - wx : wx > right ? wx - right : 0
  const dy = wy < top ? top - wy : wy > bottom ? wy - bottom : 0
  return Math.round(Math.hypot(dx, dy) * 10) / 10
}

function resolveClearance(snapshot: PlaygroundSceneSnapshot, selectedWaypointId: string | null): {id: string | null; distance: number} {
  const waypoint = snapshot.nodes.find((node) => node.id === selectedWaypointId && isRecord(node)) as SceneNode | undefined
  const riskZones = snapshot.nodes.filter((node) => node.id.startsWith('s2-risk-zone-') && isRecord(node)) as SceneNode[]
  if (!waypoint || riskZones.length === 0) {
    return {id: null, distance: Number.POSITIVE_INFINITY}
  }
  let best = {id: riskZones[0]?.id ?? null, distance: Number.POSITIVE_INFINITY}
  for (const zone of riskZones) {
    const distance = distanceToRiskZone(waypoint, zone)
    if (distance < best.distance) {
      best = {id: zone.id, distance}
    }
  }
  return best
}

export function applyS2PathSimulationStateToSnapshot(
  snapshot: PlaygroundSceneSnapshot,
  state: S2PathSimulationState,
): PlaygroundSceneSnapshot {
  const nextSnapshot = cloneSnapshot(snapshot)
  const waypointIds = collectWaypointIds(nextSnapshot)
  const activeReplayId = waypointIds.length > 0 ? waypointIds[state.stepIndex % waypointIds.length] : null
  const selectedWaypointId = state.selectedWaypointId ?? activeReplayId

  nextSnapshot.nodes = nextSnapshot.nodes.map((node) => {
    if (!isRecord(node)) {
      return node
    }
    const item = node as SceneNode
    const id = String(item.id ?? '')
    if (id.startsWith('s2-waypoint-')) {
      const selected = id === selectedWaypointId
      const replayActive = id === activeReplayId
      const edited = id === state.selectedWaypointId && state.editIndex > 0
      return {
        ...item,
        y: edited ? toNumber(item.y) + ((state.editIndex % 2 === 0 ? -1 : 1) * 18) : item.y,
        fill: selected ? '#f59e0b' : replayActive ? '#a78bfa' : '#38bdf8',
        stroke: selected ? '#fde68a' : '#e0f2fe',
        strokeWidth: selected ? 3 : 1,
        pathEdited: edited,
      }
    }
    if (id === 's2-replay-marker') {
      const active = nextSnapshot.nodes.find((candidate) => candidate.id === activeReplayId) as SceneNode | undefined
      return {
        ...item,
        x: active ? toNumber(active.x) - 6 : item.x,
        y: active ? toNumber(active.y) - 6 : item.y,
        text: `step ${state.stepIndex}`,
      }
    }
    if (id.startsWith('s2-risk-zone-')) {
      const selected = id === state.clearanceQueryId
      return {
        ...item,
        fill: selected ? 'rgba(248,113,113,0.24)' : 'rgba(248,113,113,0.12)',
        stroke: selected ? '#f97316' : '#fb7185',
        strokeWidth: selected ? 3 : 2,
      }
    }
    if (id === 's2-edit-label') {
      return {...item, text: `edit: ${state.selectedWaypointId ?? 'none'}`}
    }
    if (id === 's2-replay-label') {
      return {...item, text: `replay step: ${state.stepIndex}`}
    }
    if (id === 's2-clearance-label') {
      const distance = Number.isFinite(state.clearanceDistance) ? state.clearanceDistance.toFixed(1) : 'n/a'
      return {...item, text: `clearance: ${state.clearanceQueryId ?? 'none'} ${distance}`}
    }
    return item
  })

  return nextSnapshot
}

export function applyS2PathSimulationControl(
  snapshot: PlaygroundSceneSnapshot,
  prevState: S2PathSimulationState,
  control: S2PathSimulationControl,
): S2PathSimulationInteractionResult {
  const waypointIds = collectWaypointIds(snapshot)
  const nextState = {...prevState}
  if (control === 'path step replay') {
    nextState.stepIndex += 1
    nextState.selectedWaypointId = waypointIds.length > 0 ? waypointIds[nextState.stepIndex % waypointIds.length] ?? null : null
  }
  if (control === 'edit path') {
    nextState.editIndex += 1
    const index = waypointIds.length > 0 ? (nextState.editIndex * 3) % waypointIds.length : 0
    nextState.selectedWaypointId = waypointIds[index] ?? null
  }
  if (control === 'pick waypoint') {
    const index = waypointIds.length > 0 ? (nextState.stepIndex + nextState.editIndex) % waypointIds.length : 0
    nextState.selectedWaypointId = waypointIds[index] ?? null
  }
  if (control === 'clearance query') {
    const selected = nextState.selectedWaypointId ?? waypointIds[nextState.stepIndex % Math.max(1, waypointIds.length)] ?? null
    nextState.selectedWaypointId = selected
    const clearance = resolveClearance(snapshot, selected)
    nextState.clearanceQueryId = clearance.id
    nextState.clearanceDistance = clearance.distance
  }
  return {
    snapshot: applyS2PathSimulationStateToSnapshot(snapshot, nextState),
    state: nextState,
  }
}
