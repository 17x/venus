import type {Engine} from '../../../createEngine/createEngine.ts'
import {createEngine} from '../../../createEngine/createEngine.ts'
import type {VenusBackendFallback, VenusParameters} from '../../Venus.ts'
import type {EngineSceneSnapshot} from '../../../../scene/types/types.ts'

export const DEFAULT_VENUS_FILL_COLOR = 'transparent'
export const DEFAULT_VENUS_STROKE_COLOR = 'transparent'

export interface VenusRenderDefaults {
  fillColor: string
  strokeColor: string
}

export interface CreateVenusMountedEngineOptions {
  canvas: HTMLCanvasElement
  parameters: VenusParameters
  snapshot: EngineSceneSnapshot
  emitBackendFallback(fallback: VenusBackendFallback): void
}

export interface CreateVenusMountedEngineResult {
  engine: Engine
  backendFallback: VenusBackendFallback | null
}

export function createVenusMountedEngine({
  canvas,
  parameters,
  snapshot,
  emitBackendFallback,
}: CreateVenusMountedEngineOptions): CreateVenusMountedEngineResult {
  const requestedBackend = parameters.render?.backend ?? 'auto'
  const createWithBackend = (backend: 'canvas2d' | 'webgl') => createEngine({
    canvas,
    initialScene: snapshot,
    culling: parameters.culling ?? false,
    lod: parameters.lod ? {enabled: true} : {enabled: false},
    render: {
      backend,
      quality: parameters.render?.quality ?? 'full',
      webglAntialias: parameters.render?.antialias ?? true,
    },
    resource: parameters.resource,
  })

  if (requestedBackend === 'canvas2d') {
    return {
      engine: createWithBackend('canvas2d'),
      backendFallback: null,
    }
  }

  try {
    return {
      engine: createWithBackend('webgl'),
      backendFallback: null,
    }
  } catch (error) {
    if (requestedBackend === 'webgl') {
      throw error
    }

    const fallback: VenusBackendFallback = {
      from: 'webgl',
      to: 'canvas2d',
      reason: error instanceof Error ? error.message : String(error),
    }
    emitBackendFallback(fallback)
    return {
      engine: createWithBackend('canvas2d'),
      backendFallback: fallback,
    }
  }
}

export function resolveVenusRenderDefaults(parameters: VenusParameters): VenusRenderDefaults {
  return {
    fillColor: parameters.defaultFillColor ?? DEFAULT_VENUS_FILL_COLOR,
    strokeColor: parameters.defaultStrokeColor ?? DEFAULT_VENUS_STROKE_COLOR,
  }
}

export function createEmptyVenusSceneSnapshot(revision: number): EngineSceneSnapshot {
  return {
    revision,
    width: 520,
    height: 320,
    nodes: [],
  }
}
