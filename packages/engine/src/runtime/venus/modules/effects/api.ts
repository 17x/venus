/**
 * Effects module API — the typed surface returned by the effects module's
 * install callback.  Provides structured effect application and querying
 * beyond the flat shadow/blur fields on EngineNodeBase.
 */
export interface VenusEffectsApi {
  /**
   * Applies a drop shadow effect to a node.  Replaces any existing
   * shadow on the target node.
   */
  applyDropShadow(
    nodeId: string,
    shadow: { color?: string; offsetX?: number; offsetY?: number; blur?: number },
  ): void

  /** Removes the drop shadow from a node. */
  removeDropShadow(nodeId: string): void

  /**
   * Applies an inner shadow effect clipped to the node's shape interior.
   */
  applyInnerShadow(nodeId: string, shadow: { color?: string; blur?: number }): void

  /** Removes the inner shadow from a node. */
  removeInnerShadow(nodeId: string): void

  /**
   * Applies a layer blur (CSS filter blur) to a node.
   */
  applyLayerBlur(nodeId: string, blur: { amount: number }): void

  /** Removes the layer blur from a node. */
  removeLayerBlur(nodeId: string): void

  /** Clears all effects (shadow, inner shadow, layer blur) from a node. */
  clearAll(nodeId: string): void
}
