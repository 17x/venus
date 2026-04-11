import {
  resolveEngineSnapGuideLines,
  resolveEngineMoveSnapPreview,
  type EngineMoveSnapOptions,
  type EngineMoveSnapPreview,
  type EngineSnapAxis,
  type EngineSnapGuide,
  type EngineSnapGuideLine,
} from '@venus/engine'
import {applyMatrixToPoint, type Mat3} from '@venus/runtime'
import type {TransformPreview} from './transformSessionManager.ts'

export type SnapAxis = EngineSnapAxis
export type SnapGuide = EngineSnapGuide
export type MoveSnapOptions = EngineMoveSnapOptions

export type SnapGuideLine = EngineSnapGuideLine

/**
 * Runtime-interaction keeps the document-aware adapter for compatibility,
 * while engine owns the move-snap solving mechanism.
 */
export function resolveMoveSnapPreview(
  preview: TransformPreview,
  document: {shapes: Array<{id: string; x: number; y: number; width: number; height: number}>},
  options?: MoveSnapOptions,
): {preview: TransformPreview; guides: SnapGuide[]} {
  const result = resolveEngineMoveSnapPreview(
    preview as EngineMoveSnapPreview,
    document,
    options,
  )

  return {
    preview: result.preview as TransformPreview,
    guides: result.guides,
  }
}

export function resolveSnapGuideLines(options: {
  guides: SnapGuide[]
  documentWidth: number
  documentHeight: number
  matrix: Mat3
}): SnapGuideLine[] {
  const {guides, documentWidth, documentHeight, matrix} = options
  return resolveEngineSnapGuideLines({
    guides,
    documentWidth,
    documentHeight,
    projectPoint(point) {
      return applyMatrixToPoint(matrix, point)
    },
  })
}
