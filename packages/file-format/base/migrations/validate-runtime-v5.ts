import type {
  RuntimeFeatureKindV5,
  RuntimeNodeTypeV5,
  RuntimeSceneV5,
} from './types.ts'

const ALLOWED_FEATURES: Record<RuntimeNodeTypeV5, RuntimeFeatureKindV5[]> = {
  FRAME: ['FILL', 'STROKE', 'LAYOUT', 'CONSTRAINT', 'EFFECT', 'METADATA'],
  GROUP: ['FILL', 'STROKE', 'LAYOUT', 'CONSTRAINT', 'EFFECT', 'METADATA', 'MINDMAP_BRANCH'],
  SHAPE: ['FILL', 'STROKE', 'VECTOR', 'CONSTRAINT', 'EFFECT', 'METADATA', 'MINDMAP_BRANCH', 'CONNECTOR'],
  TEXT: ['FILL', 'STROKE', 'TEXT', 'CONSTRAINT', 'EFFECT', 'METADATA', 'MINDMAP_BRANCH'],
  IMAGE: ['FILL', 'STROKE', 'IMAGE', 'CONSTRAINT', 'EFFECT', 'METADATA', 'CLIP'],
  VECTOR: ['FILL', 'STROKE', 'VECTOR', 'CONSTRAINT', 'EFFECT', 'METADATA', 'CONNECTOR'],
}

export function validateRuntimeSceneV5(scene: RuntimeSceneV5): string[] {
  const issues: string[] = []

  for (const root of scene.nodes) {
    walkAndValidate(root, issues)
  }

  return issues
}

function walkAndValidate(
  node: RuntimeSceneV5['nodes'][number],
  issues: string[],
) {
  const allowed = new Set(ALLOWED_FEATURES[node.type])

  for (const feature of node.features) {
    if (!allowed.has(feature.kind)) {
      issues.push(`Node ${node.id} (${node.type}) cannot attach feature ${feature.kind}`)
    }
  }

  const featureIds = new Set<string>()

  for (const entry of node.featureEntries) {
    if (featureIds.has(entry.id)) {
      issues.push(`Node ${node.id} contains duplicate feature entry id ${entry.id}`)
    }
    featureIds.add(entry.id)

    if (!allowed.has(entry.feature.kind)) {
      issues.push(`Node ${node.id} (${node.type}) cannot attach feature entry ${entry.feature.kind}`)
    }
  }

  for (const child of node.children) {
    if (child.parentId !== node.id) {
      issues.push(`Node ${child.id} should point back to parent ${node.id}`)
    }
    walkAndValidate(child, issues)
  }
}
