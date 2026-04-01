import type { RuntimeFeatureKindV4, RuntimeNodeTypeV4, RuntimeSceneV4 } from './types.ts'

const ALLOWED_FEATURES: Record<RuntimeNodeTypeV4, RuntimeFeatureKindV4[]> = {
  FRAME: ['FILL', 'STROKE', 'LAYOUT', 'CONSTRAINT', 'EFFECT'],
  GROUP: ['FILL', 'STROKE', 'LAYOUT', 'CONSTRAINT', 'EFFECT'],
  SHAPE: ['FILL', 'STROKE', 'VECTOR', 'CONSTRAINT', 'EFFECT'],
  TEXT: ['FILL', 'STROKE', 'TEXT', 'CONSTRAINT', 'EFFECT'],
  IMAGE: ['FILL', 'STROKE', 'IMAGE', 'CONSTRAINT', 'EFFECT'],
  VECTOR: ['FILL', 'STROKE', 'VECTOR', 'CONSTRAINT', 'EFFECT'],
}

export function validateRuntimeSceneV4(scene: RuntimeSceneV4): string[] {
  const issues: string[] = []

  for (const root of scene.nodes) {
    walkAndValidate(root, issues)
  }

  return issues
}

function walkAndValidate(
  node: RuntimeSceneV4['nodes'][number],
  issues: string[],
) {
  const allowed = new Set(ALLOWED_FEATURES[node.type])

  for (const feature of node.features) {
    if (!allowed.has(feature.kind)) {
      issues.push(
        `Node ${node.id} (${node.type}) cannot attach feature ${feature.kind}`,
      )
    }
  }

  for (const child of node.children) {
    walkAndValidate(child, issues)
  }
}
