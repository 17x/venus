import type { RuntimeNodeFeature, RuntimeNodeType, RuntimeSceneV3 } from './types.ts'

const ALLOWED_FEATURES: Record<RuntimeNodeType, RuntimeNodeFeature['kind'][]> = {
  FRAME: ['FILL', 'STROKE', 'LAYOUT'],
  GROUP: ['FILL', 'STROKE', 'LAYOUT'],
  SHAPE: ['FILL', 'STROKE', 'VECTOR'],
  TEXT: ['FILL', 'STROKE', 'TEXT', 'LAYOUT'],
  IMAGE: ['FILL', 'STROKE', 'IMAGE', 'LAYOUT'],
  VECTOR: ['FILL', 'STROKE', 'VECTOR'],
}

export function validateRuntimeSceneV3(scene: RuntimeSceneV3): string[] {
  const issues: string[] = []

  for (const node of scene.nodes) {
    const allowed = new Set(ALLOWED_FEATURES[node.type])

    for (const feature of node.features) {
      if (!allowed.has(feature.kind)) {
        issues.push(
          `Node ${String(node.id)} (${node.type}) cannot attach feature ${feature.kind}`,
        )
      }
    }
  }

  return issues
}
