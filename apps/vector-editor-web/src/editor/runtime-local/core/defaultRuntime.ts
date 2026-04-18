import type {EditorDocument} from '@venus/document-core'
import type {CanvasRuntimeModule} from './modules.ts'
import type {CanvasEditorInstanceOptions} from './createCanvasEditorInstance.ts'
import {createDefaultRuntimeModules} from '../presets/defaultEditorModules.ts'
import type {CanvasHistoryConfig} from '../presets/history.ts'
import type {CanvasProtocolConfig} from '../presets/protocol.ts'
import type {CanvasSelectionConfig} from '../presets/selection.ts'
import type {CanvasSnapConfig} from '../presets/snapping.ts'

export interface DefaultCanvasRuntimeOptions<TDocument extends EditorDocument> {
  capacity: number
  createWorker: () => Worker
  document: TDocument
  allowFrameSelection?: boolean
  strictStrokeHitTest?: boolean
  elements?: CanvasEditorInstanceOptions<TDocument>['elements']
  selection?: Partial<CanvasSelectionConfig>
  snapping?: Partial<CanvasSnapConfig>
  snappingPreset?: 'off' | 'bounds' | 'precision'
  history?: Partial<CanvasHistoryConfig>
  protocol?: Partial<CanvasProtocolConfig>
  onHistoryCommand?: (command: {type: string}) => void
  onProtocolCommand?: (command: {type: string}) => void
  extraModules?: CanvasEditorInstanceOptions<TDocument>['modules']
}

/**
 * Resolve runtime module bundle from default presets + app extensions.
 */
export function resolveDefaultCanvasRuntimeModules<TDocument extends EditorDocument>(
  options: DefaultCanvasRuntimeOptions<TDocument>,
) {
  const defaults = createDefaultRuntimeModules({
    selection: options.selection,
    snapping: options.snapping,
    snappingPreset: options.snappingPreset,
    history: options.history,
    protocol: options.protocol,
    onHistoryCommand: options.onHistoryCommand,
    onProtocolCommand: options.onProtocolCommand,
  }) as CanvasRuntimeModule<unknown>[]

  if (!options.extraModules || options.extraModules.length === 0) {
    return defaults as CanvasEditorInstanceOptions<TDocument>['modules']
  }

  // Keep defaults first so extension modules can override behaviors intentionally.
  return [...defaults, ...options.extraModules] as CanvasEditorInstanceOptions<TDocument>['modules']
}

/**
 * Build editor-instance options for default runtime boot paths.
 */
export function createDefaultCanvasRuntimeInstanceOptions<TDocument extends EditorDocument>(
  options: DefaultCanvasRuntimeOptions<TDocument>,
): CanvasEditorInstanceOptions<TDocument> {
  return {
    capacity: options.capacity,
    createWorker: options.createWorker,
    document: options.document,
    allowFrameSelection: options.allowFrameSelection,
    strictStrokeHitTest: options.strictStrokeHitTest,
    elements: options.elements,
    modules: resolveDefaultCanvasRuntimeModules(options),
  }
}