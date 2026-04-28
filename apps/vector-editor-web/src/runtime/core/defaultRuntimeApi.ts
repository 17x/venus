import type {EditorDocument} from '../model/index.ts'
import {
  createDefaultCanvasRuntimeInstanceOptions,
  type DefaultCanvasRuntimeOptions,
} from './defaultRuntime.ts'
import {
  createCanvasRuntimeApi,
  type CanvasPresentationConfigPatch,
  type ResolveHoverShapeOptions,
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