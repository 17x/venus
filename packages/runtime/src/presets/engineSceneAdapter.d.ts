import {type EditorDocument} from '@venus/document-core'
import type {EngineSceneSnapshot} from '@venus/engine'
import type {SceneShapeSnapshot} from '@venus/shared-memory'

export interface CreateEngineSceneFromRuntimeSnapshotOptions {
  document: EditorDocument
  shapes: SceneShapeSnapshot[]
  revision: string | number
  backgroundFill?: string
  backgroundStroke?: string
}

/**
 * Build an engine scene snapshot from runtime document + shape snapshot data.
 *
 * Ownership split:
 * - runtime document provides semantic/source geometry + style metadata
 * - snapshot provides current hover/selection flags and visible shape ordering
 */
export declare function createEngineSceneFromRuntimeSnapshot(
  options: CreateEngineSceneFromRuntimeSnapshotOptions,
): EngineSceneSnapshot

export declare function buildDocumentImageAssetUrlMap(document: EditorDocument): Map<string, string>
