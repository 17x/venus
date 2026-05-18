import type { EngineSceneSnapshot, EngineShapeNode, EngineTextNode } from '../scene/types/types.ts'

/**
 * Builds one baseline scene with one visible and one culled rectangle.
 */
export function createScene(): EngineSceneSnapshot {
  const visibleRect: EngineShapeNode = {
    id: 'rect-visible',
    type: 'shape',
    shape: 'rect',
    x: 10,
    y: 20,
    width: 30,
    height: 40,
    fill: '#ff0000',
  }
  const culledRect: EngineShapeNode = {
    id: 'rect-culled',
    type: 'shape',
    shape: 'rect',
    x: 400,
    y: 400,
    width: 20,
    height: 20,
    fill: '#00ff00',
  }

  return {
    revision: 1,
    width: 800,
    height: 600,
    nodes: [visibleRect, culledRect],
  }
}

/**
 * Builds an overlap-heavy scene so hit-test exact-check budgeting is observable.
 * @param nodeCount Node count used to generate dense overlapping rectangles.
 */
export function createOverlappingScene(nodeCount: number): EngineSceneSnapshot {
  const nodes: EngineShapeNode[] = []

  for (let index = 0; index < nodeCount; index += 1) {
    nodes.push({
      id: `overlap-${String(index)}`,
      type: 'shape',
      shape: 'rect',
      x: 0,
      y: 0,
      width: 20,
      height: 20,
      fill: '#ff5500',
    })
  }

  return {
    revision: 3,
    width: 200,
    height: 200,
    nodes,
  }
}

/**
 * Builds a text-heavy scene used by high-zoom text sharpness SLA checks.
 * @param nodeCount Node count used to generate text nodes.
 */
export function createTextHeavyScene(nodeCount: number): EngineSceneSnapshot {
  const nodes: EngineTextNode[] = []

  for (let index = 0; index < nodeCount; index += 1) {
    nodes.push({
      id: `text-${String(index)}`,
      type: 'text',
      x: 20,
      y: 20 + index * 18,
      width: 220,
      height: 16,
      style: {
        fontFamily: 'Arial',
        fontSize: 14,
        fill: '#111111',
      },
      text: `Node ${String(index)} text`,
      cacheKey: `text-cache-${String(index)}`,
    })
  }

  return {
    revision: 2,
    width: 1200,
    height: 1200,
    nodes,
  }
}