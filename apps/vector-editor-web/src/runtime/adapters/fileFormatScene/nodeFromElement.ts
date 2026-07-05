import type {RuntimeFeatureEntryV5, RuntimeSceneLatest} from '../../model/index.ts'
import type {ElementProps} from '../../types/index.ts'
import {
  appendGradientMetadata,
  createMetadataEntry,
  createTransformMetadataEntries,
  createTranslationMatrix,
  resolveArrowhead,
} from './metadata.ts'
import {createVectorPathsFromElement} from './vectorPaths.ts'
import {resolveTextContent, resolveTextRuns} from './textRuns.ts'
import {resolveElementGeometry} from './elementGeometry.ts'

function resolveImageSourceRect(value: unknown) {
  if (!value || typeof value !== 'object') {
    return undefined
  }

  const record = value as Record<string, unknown>
  if (
    typeof record.x !== 'number' ||
    typeof record.y !== 'number' ||
    typeof record.width !== 'number' ||
    typeof record.height !== 'number'
  ) {
    return undefined
  }

  return {
    x: record.x,
    y: record.y,
    width: record.width,
    height: record.height,
  }
}

function resolveImageNaturalSize(value: unknown) {
  if (!value || typeof value !== 'object') {
    return undefined
  }

  const record = value as Record<string, unknown>
  if (typeof record.width !== 'number' || typeof record.height !== 'number') {
    return undefined
  }

  return {
    width: record.width,
    height: record.height,
  }
}

// Converts one editor element payload into one runtime-scene node.
export function createRuntimeNodeFromElement(element: ElementProps): RuntimeSceneLatest['nodes'][number] {
  const geometry = resolveElementGeometry(element)
  const x = geometry.x
  const y = geometry.y
  const width = geometry.width
  const height = geometry.height
  const type = String(element.type ?? 'rectangle')
  const parentIdCandidate = (element as {parentId?: unknown}).parentId
  const strokeStartArrowhead = resolveArrowhead(element.strokeStartArrowhead)
  const strokeEndArrowhead = resolveArrowhead(element.strokeEndArrowhead)
  const rotation = Number(element.rotation ?? 0)
  const flipX = Boolean(element.flipX)
  const flipY = Boolean(element.flipY)
  const transformMetadataEntries = createTransformMetadataEntries({
    x,
    y,
    width,
    height,
    rotation,
    flipX,
    flipY,
  })
  const metadataValues: Record<string, string | number | boolean> = {
    shapeType: type,
  }

  if (strokeStartArrowhead) {
    metadataValues.strokeStartArrowhead = strokeStartArrowhead
  }
  if (strokeEndArrowhead) {
    metadataValues.strokeEndArrowhead = strokeEndArrowhead
  }
  if (element.fill && typeof element.fill === 'object') {
    if (typeof element.fill.enabled === 'boolean') {
      metadataValues.fillEnabled = element.fill.enabled
    }
    if (typeof element.fill.color === 'string') {
      metadataValues.fillColor = element.fill.color
    }
    appendGradientMetadata(metadataValues, 'fill', (element.fill as {gradient?: unknown}).gradient)
  }
  if (element.stroke && typeof element.stroke === 'object') {
    if (typeof element.stroke.enabled === 'boolean') {
      metadataValues.strokeEnabled = element.stroke.enabled
    }
    if (typeof element.stroke.color === 'string') {
      metadataValues.strokeColor = element.stroke.color
    }
    if (typeof element.stroke.weight === 'number') {
      metadataValues.strokeWeight = element.stroke.weight
    }
    appendGradientMetadata(metadataValues, 'stroke', (element.stroke as {gradient?: unknown}).gradient)
  }
  if (element.shadow && typeof element.shadow === 'object') {
    if (typeof element.shadow.enabled === 'boolean') {
      metadataValues.shadowEnabled = element.shadow.enabled
    }
    if (typeof element.shadow.color === 'string') {
      metadataValues.shadowColor = element.shadow.color
    }
    if (typeof element.shadow.offsetX === 'number') {
      metadataValues.shadowOffsetX = element.shadow.offsetX
    }
    if (typeof element.shadow.offsetY === 'number') {
      metadataValues.shadowOffsetY = element.shadow.offsetY
    }
    if (typeof element.shadow.blur === 'number') {
      metadataValues.shadowBlur = element.shadow.blur
    }
  }
  if (typeof element.cornerRadius === 'number') {
    metadataValues.cornerRadius = element.cornerRadius
  }
  if (element.cornerRadii && typeof element.cornerRadii === 'object') {
    if (typeof element.cornerRadii.topLeft === 'number') {
      metadataValues.cornerTopLeft = element.cornerRadii.topLeft
    }
    if (typeof element.cornerRadii.topRight === 'number') {
      metadataValues.cornerTopRight = element.cornerRadii.topRight
    }
    if (typeof element.cornerRadii.bottomRight === 'number') {
      metadataValues.cornerBottomRight = element.cornerRadii.bottomRight
    }
    if (typeof element.cornerRadii.bottomLeft === 'number') {
      metadataValues.cornerBottomLeft = element.cornerRadii.bottomLeft
    }
  }
  if (typeof element.ellipseStartAngle === 'number') {
    metadataValues.ellipseStartAngle = element.ellipseStartAngle
  }
  if (typeof element.ellipseEndAngle === 'number') {
    metadataValues.ellipseEndAngle = element.ellipseEndAngle
  }
  if (typeof element.maskGroupId === 'string') {
    metadataValues.maskGroupId = element.maskGroupId
  }
  if (element.maskRole === 'host' || element.maskRole === 'source') {
    metadataValues.maskRole = element.maskRole
  }

  const featureEntries: RuntimeFeatureEntryV5[] = [
    createMetadataEntry(`${element.id}:metadata`, metadataValues, transformMetadataEntries),
  ]

  const vectorPaths = createVectorPathsFromElement(element)
  if (vectorPaths.length > 0) {
    featureEntries.push({
      id: `${element.id}:vector`,
      role: 'geometry',
      feature: {
        kind: 'VECTOR',
        paths: vectorPaths,
      },
    })
  }

  if (type === 'text') {
    const content = resolveTextContent(element)
    const textRuns = resolveTextRuns(element, content)
    featureEntries.push({
      id: `${element.id}:text`,
      role: 'content',
      feature: {
        kind: 'TEXT',
        text: content,
        runs: textRuns,
      },
    })
  }

  if (type === 'image' && typeof element.asset === 'string') {
    featureEntries.push({
      id: `${element.id}:image`,
      role: 'content',
      feature: {
        kind: 'IMAGE',
        imageId: element.asset,
        scaleMode: 'FIT',
        sourceRect: resolveImageSourceRect(element.sourceRect),
        naturalSize: resolveImageNaturalSize(element.naturalSize),
        imageSmoothing: typeof element.imageSmoothing === 'boolean' ? element.imageSmoothing : undefined,
      },
    })
  }

  if (type === 'image' && typeof element.clipPathId === 'string') {
    featureEntries.push({
      id: `${element.id}:clip`,
      role: 'clip',
      feature: {
        kind: 'CLIP',
        sourceNodeId: element.clipPathId,
        clipRule: element.clipRule === 'evenodd' ? 'EVENODD' : 'NONZERO',
      },
    })
  }

  return {
    id: element.id,
    type: resolveRuntimeNodeType(type),
    transform: createTranslationMatrix(x, y),
    children: [],
    name: String(element.name ?? type),
    parentId: typeof parentIdCandidate === 'string' ? parentIdCandidate : null,
    featureEntries,
    nodeKind: type,
    isVisible: element.show !== false,
    isLocked: false,
  }
}

// Maps product-level element type strings to runtime node type enums.
function resolveRuntimeNodeType(type: string): RuntimeSceneLatest['nodes'][number]['type'] {
  if (type === 'frame') {
    return 'FRAME'
  }

  if (type === 'group') {
    return 'GROUP'
  }

  if (type === 'text') {
    return 'TEXT'
  }

  if (type === 'image') {
    return 'IMAGE'
  }

  if (type === 'path' || type === 'lineSegment') {
    return 'VECTOR'
  }
  if (type === 'polygon' || type === 'star') {
    return 'SHAPE'
  }

  return 'SHAPE'
}
