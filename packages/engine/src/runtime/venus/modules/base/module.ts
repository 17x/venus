// Base module installation owns delegation from the root Venus module system to document services.
import type {VenusDocumentService, VenusModule, VenusModuleContext} from '../../Venus.ts'
import type {VenusBaseApi} from './api.ts'

/**
 * Creates the default base module that exposes document/layer mechanics on the root runtime.
 */
export function createVenusBaseModule(): VenusModule {
  return {
    name: 'base' as const,
    requires: ['document'],
    /**
     * Installs base layer/document delegates for one Venus instance.
     * @param context Module installation context with stable internal services.
     */
    install(context: VenusModuleContext): VenusBaseApi {
      const document = context.services.require<VenusDocumentService>('document')
      return {
        /**
         * Reads one node's current sibling index.
         * @param id Node id to inspect.
         */
        getLayerIndex(id) {
          return document.getLayerIndex(id)
        },
        /**
         * Reads ordered sibling ids for a parent or the root layer.
         * @param parentId Parent id, or null/undefined for root.
         */
        getLayerOrder(parentId = null) {
          return document.getLayerOrder(parentId)
        },
        /**
         * Moves one sibling to a clamped index.
         * @param id Node id to move.
         * @param index Target sibling index.
         */
        moveLayer(id, index) {
          return document.moveLayer(id, index)
        },
        /**
         * Moves one sibling immediately before another sibling.
         * @param id Node id to move.
         * @param targetId Sibling node id used as the insertion target.
         */
        moveBefore(id, targetId) {
          return document.moveBefore(id, targetId)
        },
        /**
         * Moves one sibling immediately after another sibling.
         * @param id Node id to move.
         * @param targetId Sibling node id used as the insertion target.
         */
        moveAfter(id, targetId) {
          return document.moveAfter(id, targetId)
        },
        /**
         * Moves one sibling one index toward the front.
         * @param id Node id to move.
         */
        bringForward(id) {
          return document.bringForward(id)
        },
        /**
         * Moves one sibling one index toward the back.
         * @param id Node id to move.
         */
        sendBackward(id) {
          return document.sendBackward(id)
        },
        /**
         * Moves one sibling above all siblings in the same parent.
         * @param id Node id to move.
         */
        bringToFront(id) {
          return document.bringToFront(id)
        },
        /**
         * Moves one sibling below all siblings in the same parent.
         * @param id Node id to move.
         */
        sendToBack(id) {
          return document.sendToBack(id)
        },
      }
    },
  }
}
