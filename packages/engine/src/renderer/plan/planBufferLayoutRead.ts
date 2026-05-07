import type { EngineSceneBufferLayout } from '../../scene/buffer/buffer.ts'
import type {
  EngineRect,
  EngineRenderableNode,
} from '../../scene/types/types.ts'
import type {
  EngineWorldMatrix,
} from './plan.ts'

const BOUNDS_BUFFER_STRIDE = 4
const BOUNDS_WIDTH_OFFSET = 2
const BOUNDS_HEIGHT_OFFSET = 3
const MATRIX_BUFFER_STRIDE = 6
const MATRIX_M2_OFFSET = 2
const MATRIX_M3_OFFSET = 3
const MATRIX_M4_OFFSET = 4
const MATRIX_M5_OFFSET = 5

/**
 * Flattens tree nodes into preorder sequence aligned with buffer layout slots.
 * @param nodes Scene root nodes.
 */
export function flattenEngineNodes(nodes: readonly EngineRenderableNode[]) {
  const flattened: EngineRenderableNode[] = []
  const walk = (entries: readonly EngineRenderableNode[]) => {
    entries.forEach((node) => {
      flattened.push(node)
      if (node.type === 'group') {
        walk(node.children)
      }
    })
  }
  walk(nodes)
  return flattened
}

/**
 * Reads one local-space bounds rectangle from buffer layout.
 * @param layout Scene buffer layout.
 * @param slot Buffer slot index.
 */
export function readBufferRect(layout: EngineSceneBufferLayout, slot: number): EngineRect {
  const offset = slot * BOUNDS_BUFFER_STRIDE
  return {
    x: layout.bounds[offset],
    y: layout.bounds[offset + 1],
    width: layout.bounds[offset + BOUNDS_WIDTH_OFFSET],
    height: layout.bounds[offset + BOUNDS_HEIGHT_OFFSET],
  }
}

/**
 * Reads one local transform matrix from buffer layout.
 * @param layout Scene buffer layout.
 * @param slot Buffer slot index.
 */
export function readBufferMatrix(layout: EngineSceneBufferLayout, slot: number): EngineWorldMatrix {
  const offset = slot * MATRIX_BUFFER_STRIDE
  return [
    layout.transform[offset],
    layout.transform[offset + 1],
    layout.transform[offset + MATRIX_M2_OFFSET],
    layout.transform[offset + MATRIX_M3_OFFSET],
    layout.transform[offset + MATRIX_M4_OFFSET],
    layout.transform[offset + MATRIX_M5_OFFSET],
  ]
}