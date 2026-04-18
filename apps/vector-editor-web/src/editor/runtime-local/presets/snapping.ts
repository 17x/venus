import type {CanvasRuntimeModule} from '@vector/runtime'

export type SnapAxis = 'x' | 'y' | 'angle'
export type SnapTargetKind =
  | 'edge-min'
  | 'edge-max'
  | 'center'
  | 'corner'
  | 'vertex'
  | 'parallel'
  | 'grid'
  | 'angle'

/**
 * Semantic snap match data. Keep this model visual-agnostic so UI layers can
 * draw custom hint styles without changing snap computation contracts.
 */
export interface SnapMatch {
  axis: SnapAxis
  kind: SnapTargetKind
  sourceId?: string
  sourceType?: string
  targetId?: string
  targetType?: string
  value: number
  delta: number
}

/**
 * Optional hint payload generated from matches. Consumers may ignore this and
 * render their own visuals from `SnapMatch[]`.
 */
export interface SnapHintDescriptor {
  id: string
  axis: SnapAxis
  kind: 'line' | 'point' | 'angle'
  value: number
}

export interface SnapComputationResult {
  offsetX: number
  offsetY: number
  angleDelta?: number
  matches: SnapMatch[]
}

export interface CanvasSnapConfig {
  enabled: boolean
  tolerancePx: number
  detachPx: number
  enableBounds: boolean
  enableCorners: boolean
  enableVertices: boolean
  enableGrid: boolean
  enableAngle: boolean
}

export interface CanvasSnapModule<TSnapshot> extends CanvasRuntimeModule<TSnapshot> {
  kind: 'snap'
  config: CanvasSnapConfig
}

export const SNAP_PRESET_OFF: CanvasSnapConfig = {
  enabled: false,
  tolerancePx: 6,
  detachPx: 10,
  enableBounds: false,
  enableCorners: false,
  enableVertices: false,
  enableGrid: false,
  enableAngle: false,
}

export const SNAP_PRESET_BOUNDS: CanvasSnapConfig = {
  enabled: true,
  tolerancePx: 6,
  detachPx: 10,
  enableBounds: true,
  enableCorners: false,
  enableVertices: false,
  enableGrid: false,
  enableAngle: true,
}

export const SNAP_PRESET_PRECISION: CanvasSnapConfig = {
  enabled: true,
  tolerancePx: 8,
  detachPx: 12,
  enableBounds: true,
  enableCorners: true,
  enableVertices: true,
  enableGrid: true,
  enableAngle: true,
}

export function createSnapModule<TSnapshot>(options?: {
  id?: string
  config?: Partial<CanvasSnapConfig>
  preset?: 'off' | 'bounds' | 'precision'
}): CanvasSnapModule<TSnapshot> {
  const preset = options?.preset ?? 'bounds'
  const baseConfig = preset === 'off'
    ? SNAP_PRESET_OFF
    : preset === 'precision'
      ? SNAP_PRESET_PRECISION
      : SNAP_PRESET_BOUNDS

  return {
    id: options?.id ?? 'builtin.snap',
    kind: 'snap',
    config: {
      ...baseConfig,
      ...options?.config,
    },
  }
}
