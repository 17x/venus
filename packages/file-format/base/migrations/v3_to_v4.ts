import type {
  RuntimeNodeFeatureV4,
  RuntimeNodeV3,
  RuntimeNodeV4,
  RuntimeSceneV3,
  RuntimeSceneV4,
} from './types.ts'

export function v3_to_v4(input: RuntimeSceneV3): RuntimeSceneV4 {
  const nodeMap = new Map<string, RuntimeNodeV4>()
  const idOrder: string[] = []

  for (const sourceNode of input.nodes) {
    const id = String(sourceNode.id)
    idOrder.push(id)
    nodeMap.set(id, {
      id,
      type: sourceNode.type,
      transform: sourceNode.transform,
      children: [],
      features: toV4Features(sourceNode),
    })
  }

  for (const sourceNode of input.nodes) {
    const parent = nodeMap.get(String(sourceNode.id))
    if (!parent) continue

    parent.children = sourceNode.children
      .map((childId) => nodeMap.get(String(childId)))
      .filter((child): child is RuntimeNodeV4 => Boolean(child))
  }

  const roots = input.rootNodeIds
    .map((id) => nodeMap.get(String(id)))
    .filter((node): node is RuntimeNodeV4 => Boolean(node))

  return {
    version: 4,
    canvasWidth: input.canvasWidth,
    canvasHeight: input.canvasHeight,
    gradients: input.gradients,
    rootElements: input.rootElements,
    documentId: input.documentId,
    nodes: roots.length > 0 ? roots : idOrder.map((id) => nodeMap.get(id)!).filter(Boolean),
  }
}

function toV4Features(node: RuntimeNodeV3): RuntimeNodeFeatureV4[] {
  const features: RuntimeNodeFeatureV4[] = []

  for (const feature of node.features) {
    if (feature.kind === 'FILL') {
      features.push({
        kind: 'FILL',
        fill: feature.fill,
        opacity: feature.opacity,
      })
      continue
    }

    if (feature.kind === 'STROKE') {
      features.push({
        kind: 'STROKE',
        color: feature.color,
        width: feature.width,
      })
      continue
    }

    if (feature.kind === 'TEXT') {
      features.push({
        kind: 'TEXT',
        text: feature.content,
        runs: [
          {
            start: 0,
            end: feature.content.length,
            fontSize: feature.fontSize,
            fontFamily: feature.fontFamily,
            fontWeight: 400,
            color: { r: 0, g: 0, b: 0, a: 255 },
            letterSpacing: feature.letterSpacing,
            lineHeight: feature.lineHeight,
          },
        ],
      })
      continue
    }

    if (feature.kind === 'VECTOR') {
      features.push({
        kind: 'VECTOR',
        paths: [
          {
            commands: [
              {
                type: 'MOVE_TO',
                points: feature.vertices.slice(0, 2),
              },
              {
                type: 'CURVE_TO',
                points: feature.vertices.slice(2),
              },
              {
                type: 'CLOSE',
                points: [],
              },
            ],
          },
        ],
      })
      continue
    }

    if (feature.kind === 'IMAGE') {
      features.push({
        kind: 'IMAGE',
        imageId: feature.assetId,
        scaleMode: 'FILL',
      })
      continue
    }

    if (feature.kind === 'LAYOUT') {
      features.push({
        kind: 'LAYOUT',
        layoutMode:
          feature.mode === 'ROW' ? 'HORIZONTAL' : feature.mode === 'COLUMN' ? 'VERTICAL' : 'NONE',
        primaryAxisSizing: 'FIXED',
        counterAxisSizing: 'FIXED',
        gap: feature.gap,
        padding: {
          top: feature.padding,
          right: feature.padding,
          bottom: feature.padding,
          left: feature.padding,
        },
        alignItems: 'START',
        justifyContent: 'START',
        widthMode: 'FIXED',
        heightMode: 'FIXED',
      })
      continue
    }
  }

  features.push({
    kind: 'CONSTRAINT',
    horizontal: 'LEFT',
    vertical: 'TOP',
  })

  features.push({
    kind: 'EFFECT',
    shadows: [],
    blur: 0,
    opacity: 1,
  })

  return features
}
