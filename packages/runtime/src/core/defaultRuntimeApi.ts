import type {EditorDocument} from '@venus/document-core'
import type {ResolveHoverShapeOptions} from '../interaction/index.ts'
import {
  createDefaultCanvasRuntimeInstanceOptions,
  type DefaultCanvasRuntimeOptions,
} from './defaultRuntime.ts'
import {
  createCanvasRuntimeApi,
  type CanvasPresentationConfigPatch,
} from './createCanvasRuntimeApi.ts'

export interface DefaultCanvasRuntimeApiOptions<TDocument extends EditorDocument>
  extends DefaultCanvasRuntimeOptions<TDocument> {
  onContextMenu?: (position: {x: number; y: number}) => void
  hoverResolveOptions?: ResolveHoverShapeOptions
  presentation?: CanvasPresentationConfigPatch
}

/**
 * Build a runtime API object from default runtime presets + app-level options.
 */
export function createDefaultCanvasRuntimeApi<TDocument extends EditorDocument>(
  options: DefaultCanvasRuntimeApiOptions<TDocument>,
) {
  const {
    onContextMenu,
    hoverResolveOptions,
    presentation,
    ...runtimeOptions
  } = options

  return createCanvasRuntimeApi({
    ...createDefaultCanvasRuntimeInstanceOptions(runtimeOptions),
    onContextMenu,
    hoverResolveOptions,
    presentation,
  })
}