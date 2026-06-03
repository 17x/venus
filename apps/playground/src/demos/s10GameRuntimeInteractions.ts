import type {PlaygroundSceneSnapshot} from '../types/playgroundScene'
import type {createEngine} from '@venus/engine'

export const S10_GAME_PREVIEW_FIXED_TICK_MS = 600

export interface S10GamePreviewState {
  previewStep: number
  selectedNodeId: string | null
  isPlaying: boolean
}

export interface S10GameInteractionResult {
  snapshot: PlaygroundSceneSnapshot
  state: S10GamePreviewState
}

export type S10GamePreviewControl = 'play preview' | 'runtime preview step' | 'stop preview' | 'reset preview' | 'pick node'

export interface S10AuthoringRuntimePreviewCompileResult {
  matching: boolean
  authoringSignature: string
  runtimeSignature: string
  previewSignature: string
  previewStepIndex: number
  addedNodeCount: number
  removedNodeCount: number
}

type S10AuthoringRuntimeEngine = Pick<ReturnType<typeof createEngine>, 'runtime'>

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

function toNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function normalizeStep(step: number): number {
  const bounded = step % 360
  return bounded < 0 ? bounded + 360 : bounded
}

function cloneSnapshot(snapshot: PlaygroundSceneSnapshot): PlaygroundSceneSnapshot {
  return {
    ...snapshot,
    nodes: snapshot.nodes.map((node) => (isRecord(node) ? {...node} : node)),
  }
}

/**
 * Applies one deterministic preview-step transformation for S10 nodes.
 */
export function applyS10PreviewStep(
  snapshot: PlaygroundSceneSnapshot,
  prevState: S10GamePreviewState,
): S10GameInteractionResult {
  const nextStep = prevState.previewStep + 1
  const stepPhase = normalizeStep(nextStep)
  const amplitude = ((stepPhase % 18) - 9) * 0.8
  const nextSnapshot = cloneSnapshot(snapshot)

  nextSnapshot.nodes = nextSnapshot.nodes.map((node) => {
    if (!isRecord(node)) {
      return node
    }
    const id = String(node.id ?? '')
    if (!id.startsWith('s10-node-')) {
      return node
    }
    const baseY = toNumber(node.y, 0)
    const baseZ = toNumber(node.z, 0)
    return {
      ...node,
      y: baseY + amplitude,
      z: baseZ + (stepPhase % 6),
      depth: Math.max(6, toNumber(node.depth, 6) + (stepPhase % 3)),
    }
  })

  return {
    snapshot: nextSnapshot,
    state: {
      ...prevState,
      previewStep: nextStep,
    },
  }
}

/**
 * Selects one deterministic S10 node and applies highlight style.
 */
export function applyS10PickNode(
  snapshot: PlaygroundSceneSnapshot,
  prevState: S10GamePreviewState,
): S10GameInteractionResult {
  const nextSnapshot = cloneSnapshot(snapshot)
  const candidateIds = nextSnapshot.nodes
    .filter((node) => isRecord(node) && String(node.id ?? '').startsWith('s10-node-'))
    .map((node) => String((node as Record<string, unknown>).id))

  if (candidateIds.length === 0) {
    return {snapshot: nextSnapshot, state: prevState}
  }

  const selectedIndex = prevState.previewStep % candidateIds.length
  const selectedNodeId = candidateIds[selectedIndex] ?? candidateIds[0]

  nextSnapshot.nodes = nextSnapshot.nodes.map((node) => {
    if (!isRecord(node)) {
      return node
    }
    const id = String(node.id ?? '')
    if (!id.startsWith('s10-node-')) {
      return node
    }
    const selected = id === selectedNodeId
    return {
      ...node,
      stroke: selected ? '#f59e0b' : '#cffafe',
      strokeWidth: selected ? 3 : 1,
    }
  })

  return {
    snapshot: nextSnapshot,
    state: {
      ...prevState,
      selectedNodeId,
    },
  }
}

export function applyS10PreviewControl(
  snapshot: PlaygroundSceneSnapshot,
  prevState: S10GamePreviewState,
  control: S10GamePreviewControl,
  resetSnapshot = snapshot,
): S10GameInteractionResult {
  if (control === 'runtime preview step') {
    return applyS10PreviewStep(snapshot, {...prevState, isPlaying: false})
  }
  if (control === 'pick node') {
    return applyS10PickNode(snapshot, prevState)
  }
  if (control === 'play preview') {
    return {snapshot: cloneSnapshot(snapshot), state: {...prevState, isPlaying: true}}
  }
  if (control === 'stop preview') {
    return {snapshot: cloneSnapshot(snapshot), state: {...prevState, isPlaying: false}}
  }
  return {
    snapshot: cloneSnapshot(resetSnapshot),
    state: {
      previewStep: 0,
      selectedNodeId: null,
      isPlaying: false,
    },
  }
}

export function compileS10AuthoringRuntimePreview(
  engine: S10AuthoringRuntimeEngine,
  snapshot: PlaygroundSceneSnapshot,
  stepIndex: number,
): S10AuthoringRuntimePreviewCompileResult {
  const revision = Number(snapshot.revision)
  const authoring = engine.runtime.authoring.createGraphSnapshot({
    graphId: 's10-game-editor-runtime-preview',
    role: 'authoring',
    revision,
    nodes: snapshot.nodes,
    materials: snapshot.materials ?? [],
  })
  const runtime = engine.runtime.authoring.createGraphSnapshot({
    graphId: 's10-game-editor-runtime-preview',
    role: 'runtime',
    revision,
    nodes: snapshot.nodes,
    materials: snapshot.materials ?? [],
  })
  const comparison = engine.runtime.authoring.compareGraphSnapshots({authoring: authoring.snapshotId, runtime: runtime.snapshotId})
  const preview = engine.runtime.authoring.createPreviewToken({
    scope: 's10-game-editor-runtime-preview',
    snapshot: runtime.snapshotId,
    stepIndex,
  })
  return {
    matching: comparison.matching,
    authoringSignature: comparison.authoring.signature,
    runtimeSignature: comparison.runtime.signature,
    previewSignature: preview.signature,
    previewStepIndex: preview.stepIndex,
    addedNodeCount: comparison.addedNodeIds.length,
    removedNodeCount: comparison.removedNodeIds.length,
  }
}
