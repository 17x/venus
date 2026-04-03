import type {
  RuntimeEditorProductV5,
  RuntimeFeatureEntryV5,
  RuntimeNodeFeatureV5,
  RuntimeNodeV4,
  RuntimeNodeV5,
  RuntimeSceneV4,
  RuntimeSceneV5,
} from './types.ts'

export function v4_to_v5(input: RuntimeSceneV4): RuntimeSceneV5 {
  return {
    version: 5,
    canvasWidth: input.canvasWidth,
    canvasHeight: input.canvasHeight,
    gradients: input.gradients,
    rootElements: input.rootElements,
    documentId: input.documentId,
    nodes: input.nodes.map((node, index) => toV5Node(node, null, index)),
    product: inferProduct(input),
    editorKey: '',
    metadata: [],
  }
}

function toV5Node(
  node: RuntimeNodeV4,
  parentId: string | null,
  index: number,
): RuntimeNodeV5 {
  const featureEntries = node.features.map((feature, featureIndex) =>
    createFeatureEntry(node.id, feature as RuntimeNodeFeatureV5, featureIndex),
  )

  return {
    id: node.id,
    type: node.type,
    transform: node.transform,
    children: node.children.map((child, childIndex) => toV5Node(child, node.id, childIndex)),
    features: node.features,
    name: '',
    parentId,
    featureEntries,
    nodeKind: defaultNodeKind(node.type, index),
    isVisible: true,
    isLocked: false,
  }
}

function createFeatureEntry(
  nodeId: string,
  feature: RuntimeNodeFeatureV5,
  featureIndex: number,
): RuntimeFeatureEntryV5 {
  return {
    id: `${nodeId}:feature:${String(featureIndex)}`,
    role: feature.kind.toLowerCase(),
    feature,
  }
}

function defaultNodeKind(type: RuntimeNodeV4['type'], index: number) {
  if (type === 'FRAME' && index === 0) {
    return 'page'
  }

  return type.toLowerCase()
}

function inferProduct(_scene: RuntimeSceneV4): RuntimeEditorProductV5 {
  return 'VECTOR'
}
