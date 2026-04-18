import type {CanvasRuntimeModule} from '@vector/runtime'
import {createHistoryModule, type CanvasHistoryConfig} from './history.ts'
import {createProtocolModule, type CanvasProtocolConfig} from './protocol.ts'
import {createSelectionModule, type CanvasSelectionConfig} from './selection.ts'
import {createSnapModule, type CanvasSnapConfig} from './snapping.ts'

export function createDefaultRuntimeModules<TSnapshot>(options?: {
  selection?: Partial<CanvasSelectionConfig>
  snapping?: Partial<CanvasSnapConfig>
  snappingPreset?: 'off' | 'bounds' | 'precision'
  history?: Partial<CanvasHistoryConfig>
  protocol?: Partial<CanvasProtocolConfig>
  onHistoryCommand?: (command: {type: string}) => void
  onProtocolCommand?: (command: {type: string}) => void
}): CanvasRuntimeModule<TSnapshot>[] {
  return [
    createSelectionModule<TSnapshot>({
      config: options?.selection,
    }),
    createSnapModule<TSnapshot>({
      preset: options?.snappingPreset ?? 'bounds',
      config: options?.snapping,
    }),
    createHistoryModule<TSnapshot>({
      config: options?.history,
      onHistoryCommand: options?.onHistoryCommand,
    }),
    createProtocolModule<TSnapshot>({
      config: options?.protocol,
      onCommand: options?.onProtocolCommand,
    }),
  ]
}

export function createDefaultEditorModules<TSnapshot>(options?: {
  selection?: Partial<CanvasSelectionConfig>
  snapping?: Partial<CanvasSnapConfig>
  snappingPreset?: 'off' | 'bounds' | 'precision'
  history?: Partial<CanvasHistoryConfig>
  protocol?: Partial<CanvasProtocolConfig>
  onHistoryCommand?: (command: {type: string}) => void
  onProtocolCommand?: (command: {type: string}) => void
}): CanvasRuntimeModule<TSnapshot>[] {
  return createDefaultRuntimeModules(options)
}
