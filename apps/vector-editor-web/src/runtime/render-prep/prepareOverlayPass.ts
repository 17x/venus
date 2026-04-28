import type {PreparedPass} from './types.ts'

export interface PrepareOverlayPassInput {
  selectedShapeIds: string[]
  hoveredShapeId: string | null
  marqueeActive: boolean
  snapGuideCount: number
}

/**
 * Phase-2 skeleton: normalize interaction overlay state into a dedicated pass
 * boundary so high-frequency overlay updates can evolve independently.
 */
export function prepareOverlayPass(input: PrepareOverlayPassInput): PreparedPass {
  const overlayInstanceCount =
    input.selectedShapeIds.length +
    (input.hoveredShapeId ? 1 : 0) +
    (input.marqueeActive ? 1 : 0) +
    input.snapGuideCount

  return {
    kind: 'overlay',
    dirty: overlayInstanceCount > 0,
    batches: [{
      batchId: 'overlay:interaction-geometry',
      geometryKey: 'overlay-primitive-geometry',
      pipelineKey: 'overlay-default',
      instanceCount: overlayInstanceCount,
    }],
    instanceUpdates: [],
    uniformUpdates: [{
      scope: 'overlay',
      name: 'snapGuideCount',
      value: input.snapGuideCount,
    }],
  }
}
