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
         * Groups sibling document nodes through the document service.
         * @param ids Sibling node ids to group.
         * @param options Optional group metadata.
         */
        group(ids, options) {
          return document.group(ids, options)
        },
        /**
         * Ungroups a structure-only group through the document service.
         * @param id Group node id to ungroup.
         */
        ungroup(id) {
          return document.ungroup(id)
        },
        /**
         * Adds a child node through the document service.
         * @param parentId Frame, group, clip, or mask id.
         * @param child Child document node to append.
         */
        addChild(parentId, child) {
          return document.addChild(parentId, child)
        },
        /**
         * Removes a child node through the document service.
         * @param parentId Frame, group, clip, or mask id.
         * @param childId Child document node id to remove.
         */
        removeChild(parentId, childId) {
          document.removeChild(parentId, childId)
        },
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
        /**
         * Validates clip graph metadata through the document service.
         * @param snapshot Optional render-facing snapshot.
         */
        validateClipGraph(snapshot) {
          return document.validateClipGraph(snapshot)
        },
        /**
         * Resolves clip dependencies through the document service.
         * @param nodeId Node id to inspect.
         * @param snapshot Optional render-facing snapshot.
         */
        resolveClipDependencies(nodeId, snapshot) {
          return document.resolveClipDependencies(nodeId, snapshot)
        },
      }
    },
  }
}
