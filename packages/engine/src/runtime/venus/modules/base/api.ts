// Base module API owns the typed surface returned by the default Venus base module.
import type {VenusLayerMutationResult} from '../../Venus.ts'

/** Root-level API installed by the default base module. */
export interface VenusBaseApi {
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
}
