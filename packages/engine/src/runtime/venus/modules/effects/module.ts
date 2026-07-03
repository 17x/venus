/**
 * Effects module implementation.
 *
 * Wraps the engine-level shadow, inner shadow, and layer blur fields in a
 * structured API.  Future: multi-layer effects, effect ordering, and
 * render-to-texture compositing.
 */
import type { VenusEffectsApi } from './api.ts'
import type { VenusModule, VenusModuleContext } from '../../Venus.ts'

/** Minimal shape of a Venus instance needed by the effects module. */
interface EffectsVenus {
  update(id: string, patch: Record<string, unknown>): void
}

/**
 * Creates the effects module definition.
 */
export function createVenusEffectsModule(): VenusModule {
  return {
    name: 'effects' as const,

    install(context: VenusModuleContext): VenusEffectsApi {
      const venus = context.venus as EffectsVenus
      return {
        applyDropShadow(nodeId, shadow) {
          venus.update(nodeId, { shadow })
        },

        removeDropShadow(nodeId) {
          venus.update(nodeId, { shadow: undefined })
        },

        applyInnerShadow(nodeId, shadow) {
          venus.update(nodeId, { innerShadow: shadow })
        },

        removeInnerShadow(nodeId) {
          venus.update(nodeId, { innerShadow: undefined })
        },

        applyLayerBlur(nodeId, blur) {
          venus.update(nodeId, { layerBlur: blur })
        },

        removeLayerBlur(nodeId) {
          venus.update(nodeId, { layerBlur: undefined })
        },

        clearAll(nodeId) {
          venus.update(nodeId, {
            shadow: undefined,
            innerShadow: undefined,
            layerBlur: undefined,
          })
        },
      }
    },
  }
}
