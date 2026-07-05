// Base module API owns the typed surface returned by the default Venus base module.
import type {
  VenusClipGraphValidation,
  VenusGroupOptions,
  VenusLayerMutationResult,
  VenusNode,
} from '../../Venus.ts'
import type {VenusNodeProxy} from '../../VenusNodeProxy.ts'
import type {EngineSceneSnapshot} from '../../../../scene/types/types.ts'

/** Root-level API installed by the default base module. */
export interface VenusBaseApi {
  /** Wraps sibling nodes in a structure-only group while preserving child geometry. */
  group(ids: readonly string[], options?: VenusGroupOptions): VenusNodeProxy
  /** Lifts a structure-only group's children into the same parent. */
  ungroup(id: string): VenusNodeProxy[]
  /** Adds a child node to a frame, group, clip, or mask container. */
  addChild(parentId: string, child: VenusNode): VenusNodeProxy
  /** Removes a child node from a frame, group, clip, or mask container. */
  removeChild(parentId: string, childId: string): void
  /** Returns one node's sibling index. */
  getLayerIndex(id: string): number
  /** Returns ordered sibling ids for the root layer or one parent. */
  getLayerOrder(parentId?: string | null): string[]
  /** Moves one sibling to an index and returns mutation metadata. */
  moveLayer(id: string, index: number): VenusLayerMutationResult
  /** Moves one sibling before another sibling and returns mutation metadata. */
  moveBefore(id: string, targetId: string): VenusLayerMutationResult
  /** Moves one sibling after another sibling and returns mutation metadata. */
  moveAfter(id: string, targetId: string): VenusLayerMutationResult
  /** Moves one sibling one step toward the front and returns mutation metadata. */
  bringForward(id: string): VenusLayerMutationResult
  /** Moves one sibling one step toward the back and returns mutation metadata. */
  sendBackward(id: string): VenusLayerMutationResult
  /** Moves one sibling above every sibling and returns mutation metadata. */
  bringToFront(id: string): VenusLayerMutationResult
  /** Moves one sibling below every sibling and returns mutation metadata. */
  sendToBack(id: string): VenusLayerMutationResult
  /** Validates clip references, cycles, rules, and inline geometry. */
  validateClipGraph(snapshot?: EngineSceneSnapshot): VenusClipGraphValidation
  /** Resolves direct and transitive clip node ids for one node. */
  resolveClipDependencies(nodeId: string, snapshot?: EngineSceneSnapshot): string[]
}
