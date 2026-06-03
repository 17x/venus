import type {PlaygroundSceneSnapshot} from '../types/playgroundScene'

export const S1_MEDICAL_TRANSFER_PRESETS = ['soft-tissue', 'bone', 'thermal'] as const
export type S1MedicalTransferPreset = typeof S1_MEDICAL_TRANSFER_PRESETS[number]
export type S1MedicalVolumeControl = 'slice scrub' | 'transfer function' | 'ROI pick' | 'capture frame'

export interface S1MedicalVolumeState {
  sliceIndex: number
  transferPreset: S1MedicalTransferPreset
  selectedRoiId: string | null
  captureId: number
}

export interface S1MedicalVolumeInteractionResult {
  snapshot: PlaygroundSceneSnapshot
  state: S1MedicalVolumeState
}

type SceneNode = PlaygroundSceneSnapshot['nodes'][number]

type MutableSceneNode = SceneNode & Record<string, unknown>

const ROI_IDS = ['s1-roi-core', 's1-roi-margin', 's1-roi-edge'] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

function toNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function cloneSnapshot(snapshot: PlaygroundSceneSnapshot): PlaygroundSceneSnapshot {
  return {
    ...snapshot,
    nodes: snapshot.nodes.map((node) => (isRecord(node) ? {...node} : node)),
  }
}

function resolveTransferFill(intensity: number, preset: S1MedicalTransferPreset): string {
  const value = clamp01(intensity)
  if (preset === 'bone') {
    const lightness = Math.round(28 + value * 64)
    return `hsl(42 85% ${lightness}%)`
  }
  if (preset === 'thermal') {
    const hue = Math.round(255 - value * 255)
    const lightness = Math.round(24 + value * 52)
    return `hsl(${hue} 88% ${lightness}%)`
  }
  const lightness = Math.round(18 + value * 68)
  return `hsl(205 45% ${lightness}%)`
}

function resolveSliceIntensity(node: Record<string, unknown>, sliceIndex: number): number {
  const base = toNumber(node.volumeIntensity, 0)
  const row = toNumber(node.volumeRow, 0)
  const col = toNumber(node.volumeCol, 0)
  const modulation = Math.sin((row * 0.37) + (col * 0.19) + sliceIndex * 0.62) * 0.08
  return clamp01(base + modulation)
}

export function applyS1MedicalVolumeStateToSnapshot(
  snapshot: PlaygroundSceneSnapshot,
  state: S1MedicalVolumeState,
): PlaygroundSceneSnapshot {
  const nextSnapshot = cloneSnapshot(snapshot)
  const selectedRoiId = state.selectedRoiId
  let captureStatusFound = false

  nextSnapshot.nodes = nextSnapshot.nodes.map((node) => {
    if (!isRecord(node)) {
      return node
    }
    const item = node as MutableSceneNode
    const id = String(item.id ?? '')
    if (id.startsWith('s1-cell-')) {
      const intensity = resolveSliceIntensity(item, state.sliceIndex)
      return {
        ...item,
        z: Math.round(intensity * 132) + state.sliceIndex * 2,
        depth: Math.max(2, Math.round(intensity * 12)),
        fill: resolveTransferFill(intensity, state.transferPreset),
        volumeSliceIndex: state.sliceIndex,
        volumeTransferPreset: state.transferPreset,
      }
    }
    if (id === 's1-transfer-label') {
      return {...item, text: `transfer: ${state.transferPreset}`}
    }
    if (id === 's1-slice-label') {
      return {...item, text: `slice: ${state.sliceIndex}`}
    }
    if (id === 's1-roi-label') {
      return {...item, text: `roi: ${selectedRoiId ?? 'none'}`}
    }
    if (id.startsWith('s1-roi-')) {
      const selected = id === selectedRoiId
      return {
        ...item,
        stroke: selected ? '#f59e0b' : '#67e8f9',
        strokeWidth: selected ? 4 : 2,
        fill: selected ? 'rgba(245,158,11,0.16)' : 'rgba(103,232,249,0.08)',
      }
    }
    if (id === 's1-capture-status') {
      captureStatusFound = true
      return {...item, text: `capture: ${state.captureId}`}
    }
    return item
  })

  if (!captureStatusFound) {
    nextSnapshot.nodes.push({
      id: 's1-capture-status',
      type: 'text',
      x: 1128,
      y: 204,
      text: `capture: ${state.captureId}`,
      style: {
        fontFamily: 'IBM Plex Sans',
        fontSize: 14,
        fill: '#fde68a',
      },
    })
  }

  return nextSnapshot
}

export function applyS1MedicalVolumeControl(
  snapshot: PlaygroundSceneSnapshot,
  prevState: S1MedicalVolumeState,
  control: S1MedicalVolumeControl,
): S1MedicalVolumeInteractionResult {
  const nextState = {...prevState}
  if (control === 'slice scrub') {
    nextState.sliceIndex = (nextState.sliceIndex + 1) % 8
  }
  if (control === 'transfer function') {
    const index = S1_MEDICAL_TRANSFER_PRESETS.indexOf(nextState.transferPreset)
    nextState.transferPreset = S1_MEDICAL_TRANSFER_PRESETS[(index + 1) % S1_MEDICAL_TRANSFER_PRESETS.length]
  }
  if (control === 'ROI pick') {
    const selectedIndex = (nextState.sliceIndex + nextState.captureId) % ROI_IDS.length
    nextState.selectedRoiId = ROI_IDS[selectedIndex] ?? ROI_IDS[0]
  }
  if (control === 'capture frame') {
    nextState.captureId += 1
  }
  return {
    snapshot: applyS1MedicalVolumeStateToSnapshot(snapshot, nextState),
    state: nextState,
  }
}
