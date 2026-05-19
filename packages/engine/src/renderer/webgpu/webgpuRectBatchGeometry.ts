import type { EngineRenderableNode } from '../../scene/types/types.ts'

/**
 * Stores deterministic staged geometry payload emitted for native rect-batch execution.
 */
export interface WebGPURectBatchGeometryPayload {
  /** Packed XY vertex stream used to size staged vertex buffer allocations. */
  vertexData: Float32Array
  /** Packed uint16 index stream used to size staged index buffer allocations. */
  indexData: Uint16Array
  /** Compatibility vertex count used when drawIndexed is unavailable. */
  compatibilityDrawVertexCount: number
}

/**
 * Resolves deterministic staged geometry payload for native rect-batch proof-of-execution.
 * @param nodes Scene node list from the current frame.
 */
export function resolveWebGPURectBatchGeometryPayload(
  nodes: readonly EngineRenderableNode[],
): WebGPURectBatchGeometryPayload {
  let rectCount = 0
  for (const node of nodes) {
    if (node.type === 'shape' && node.shape === 'rect') {
      rectCount += 1
    }
  }

  const vertexData = new Float32Array(rectCount * 8)
  const indexData = new Uint16Array(rectCount * 6)
  let vertexCursor = 0
  let indexCursor = 0
  let rectIndex = 0
  for (const node of nodes) {
    if (node.type !== 'shape' || node.shape !== 'rect') {
      continue
    }

    const baseVertex = rectIndex * 4
    vertexData[vertexCursor] = node.x
    vertexData[vertexCursor + 1] = node.y
    vertexData[vertexCursor + 2] = node.x + node.width
    vertexData[vertexCursor + 3] = node.y
    vertexData[vertexCursor + 4] = node.x
    vertexData[vertexCursor + 5] = node.y + node.height
    vertexData[vertexCursor + 6] = node.x + node.width
    vertexData[vertexCursor + 7] = node.y + node.height
    indexData[indexCursor] = baseVertex
    indexData[indexCursor + 1] = baseVertex + 1
    indexData[indexCursor + 2] = baseVertex + 2
    indexData[indexCursor + 3] = baseVertex + 2
    indexData[indexCursor + 4] = baseVertex + 1
    indexData[indexCursor + 5] = baseVertex + 3
    vertexCursor += 8
    indexCursor += 6
    rectIndex += 1
  }

  return {
    vertexData,
    indexData,
    // AI-TEMP: fallback draw path still consumes a synthetic non-indexed count for harness compatibility; remove when drawIndexed becomes mandatory across supported runtimes; ref B3-webgpu-native-main-pass.
    compatibilityDrawVertexCount: rectCount * 6,
  }
}

/**
 * Resolves one clear-color payload from the first eligible rect fill in the scene.
 * @param nodes Scene node list from the current frame.
 */
export function resolveWebGPURectBatchClearValue(
  nodes: readonly EngineRenderableNode[],
): {r: number; g: number; b: number; a: number} {
  for (const node of nodes) {
    if (node.type === 'shape' && node.shape === 'rect') {
      const fillColor = parseHexColorToWebGPUClearValue(node.fill)
      if (fillColor) {
        return fillColor
      }
    }
  }

  return {r: 0, g: 0, b: 0, a: 1}
}

/**
 * Parses one CSS hex color string into WebGPU clear-color components.
 * @param fill Node fill payload.
 */
function parseHexColorToWebGPUClearValue(
  fill: EngineRenderableNode extends {fill?: infer T} ? T : unknown,
): {r: number; g: number; b: number; a: number} | null {
  if (typeof fill !== 'string') {
    return null
  }

  const normalized = fill.startsWith('#') ? fill.slice(1) : fill
  if (normalized.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return null
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16) / 255
  const green = Number.parseInt(normalized.slice(2, 4), 16) / 255
  const blue = Number.parseInt(normalized.slice(4, 6), 16) / 255
  return {r: red, g: green, b: blue, a: 1}
}