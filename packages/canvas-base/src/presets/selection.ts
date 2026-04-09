import type {CanvasRuntimeModule} from '../runtime/modules.ts'

export type SelectionSetMode = 'replace' | 'add' | 'remove' | 'toggle' | 'clear'
export type SelectionMarqueeMatchMode = 'intersect' | 'contain'
export type SelectionAltClickBehavior = 'deep-select' | 'subtract' | 'toggle' | 'ignore'

export interface SelectionInputPolicy {
  singleClick: SelectionSetMode
  shiftClick: SelectionSetMode
  metaOrCtrlClick: SelectionSetMode
  altClick: SelectionAltClickBehavior
}

export interface SelectionMarqueePolicy {
  enabled: boolean
  defaultMatchMode: SelectionMarqueeMatchMode
  shiftMatchMode?: SelectionMarqueeMatchMode
}

export interface CanvasSelectionConfig {
  enabled: boolean
  input: SelectionInputPolicy
  marquee: SelectionMarqueePolicy
  lineHitTolerance: number
  allowFrameSelection: boolean
}

export interface CanvasSelectionModule<TSnapshot> extends CanvasRuntimeModule<TSnapshot> {
  kind: 'selection'
  config: CanvasSelectionConfig
}

export const DEFAULT_SELECTION_CONFIG: CanvasSelectionConfig = {
  enabled: true,
  input: {
    singleClick: 'replace',
    shiftClick: 'add',
    metaOrCtrlClick: 'toggle',
    altClick: 'ignore',
  },
  marquee: {
    enabled: true,
    defaultMatchMode: 'intersect',
    shiftMatchMode: 'contain',
  },
  lineHitTolerance: 6,
  allowFrameSelection: true,
}

export function createSelectionModule<TSnapshot>(options?: {
  id?: string
  config?: Partial<CanvasSelectionConfig>
}): CanvasSelectionModule<TSnapshot> {
  const input = {
    ...DEFAULT_SELECTION_CONFIG.input,
    ...options?.config?.input,
  }
  const marquee = {
    ...DEFAULT_SELECTION_CONFIG.marquee,
    ...options?.config?.marquee,
  }

  return {
    id: options?.id ?? 'builtin.selection',
    kind: 'selection',
    config: {
      ...DEFAULT_SELECTION_CONFIG,
      ...options?.config,
      input,
      marquee,
    },
  }
}
