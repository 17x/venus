import * as React from 'react'
import type {EditorDocument} from '@venus/document-core'
import type {CanvasEditorInstanceOptions, CanvasRuntimeModule} from '@venus/runtime'
import {createDefaultRuntimeModules} from '../presets/defaultEditorModules.ts'
import type {CanvasHistoryConfig} from '../presets/history.ts'
import type {CanvasProtocolConfig} from '../presets/protocol.ts'
import type {CanvasSelectionConfig} from '../presets/selection.ts'
import type {CanvasSnapConfig} from '../presets/snapping.ts'
import {useCanvasRuntime} from './useCanvasRuntime.ts'

export interface UseDefaultCanvasRuntimeOptions<TDocument extends EditorDocument> {
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
 * Shared editor runtime boot path using runtime preset modules.
 *
 * Keep app hooks focused on product behavior by centralizing the default
 * module bundle wiring in one React-level helper.
 */
export function useDefaultCanvasRuntime<TDocument extends EditorDocument>(
  options: UseDefaultCanvasRuntimeOptions<TDocument>,
) {
  const {
    capacity,
    createWorker,
    document,
    allowFrameSelection,
    strictStrokeHitTest,
    elements,
    selection,
    snapping,
    snappingPreset,
    history,
    protocol,
    onHistoryCommand,
    onProtocolCommand,
    extraModules,
  } = options

  const modules = React.useMemo(() => {
    const defaults = createDefaultRuntimeModules({
      selection,
      snapping,
      snappingPreset,
      history,
      protocol,
      onHistoryCommand,
      onProtocolCommand,
    }) as CanvasRuntimeModule<unknown>[]

    if (!extraModules || extraModules.length === 0) {
      return defaults as CanvasEditorInstanceOptions<TDocument>['modules']
    }

    return [...defaults, ...extraModules] as CanvasEditorInstanceOptions<TDocument>['modules']
  }, [
    extraModules,
    history,
    onHistoryCommand,
    onProtocolCommand,
    protocol,
    selection,
    snapping,
    snappingPreset,
  ])

  return useCanvasRuntime({
    capacity,
    createWorker,
    document,
    allowFrameSelection,
    strictStrokeHitTest,
    elements,
    modules,
  })
}
