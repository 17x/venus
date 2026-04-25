import type {EditorDocument} from '@vector/model'
import type {DefaultCanvasRuntimeOptions} from './defaultRuntime.ts'
import {
  createDefaultCanvasRuntimeInstanceOptions,
} from './defaultRuntime.ts'
import {
  createDefaultCanvasInteractions,
  type DefaultCanvasInteractionRuntime,
} from '../interaction/defaultInteractions.ts'

export interface SharedCanvasRuntimeOptions<TDocument extends EditorDocument>
  extends DefaultCanvasRuntimeOptions<TDocument> {
  onContextMenu?: (position: {x: number; y: number}) => void
}

/**
 * Pure helper for shared runtime/interactions composition.
 */
export function createSharedCanvasRuntimeConfig<TDocument extends EditorDocument>(
  options: SharedCanvasRuntimeOptions<TDocument>,
) {
  const {
    onContextMenu,
    ...runtimeOptions
  } = options

  return {
    runtimeOptions: createDefaultCanvasRuntimeInstanceOptions(runtimeOptions),
    createInteractions: (runtime: DefaultCanvasInteractionRuntime) =>
      createDefaultCanvasInteractions({
        getRuntime: () => runtime,
        onContextMenu,
      }),
  }
}