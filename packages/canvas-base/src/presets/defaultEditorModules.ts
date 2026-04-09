import type {CanvasRuntimeModule} from '../runtime/modules.ts'
import {createSelectionModule, type CanvasSelectionConfig} from './selection.ts'
import {createSnapModule, type CanvasSnapConfig} from './snapping.ts'

export function createDefaultEditorModules<TSnapshot>(options?: {
  selection?: Partial<CanvasSelectionConfig>
  snapping?: Partial<CanvasSnapConfig>
  snappingPreset?: 'off' | 'bounds' | 'precision'
}): CanvasRuntimeModule<TSnapshot>[] {
  return [
    createSelectionModule<TSnapshot>({
      config: options?.selection,
    }),
    createSnapModule<TSnapshot>({
      preset: options?.snappingPreset ?? 'bounds',
      config: options?.snapping,
    }),
  ]
}
