import type {EditorDocument} from '../../model/index.ts'
import type {PathSubSelection} from '../../interaction/index.ts'
import {resolveMaskGroupMembers} from '../../interaction/maskGroup.ts'
import {
  resolveEllipseArcAngleFromPoint,
  resolveRectCornerRadiusFromPoint,
  type ShapeStyleHandleDrag,
} from '../../product/shapeStyleHandles.ts'

export const SCENE_CAPACITY = 8192

export const DEFAULT_SELECTION_CONFIG = {
  allowFrameSelection: false,
  input: {
    singleClick: 'replace',
    shiftClick: 'add',
    metaOrCtrlClick: 'toggle',
    altClick: 'subtract',
  },
  marquee: {
    enabled: true,
    defaultMatchMode: 'contain',
    shiftMatchMode: 'contain',
  },
} as const

export const DEFAULT_PRESENTATION_CONFIG = {
  marquee: {
    fill: 'rgba(37, 99, 235, 0.12)',
    stroke: 'rgba(37, 99, 235, 0.95)',
  },
  overlay: {
    selectionStroke: '#2563eb',
    hoverStroke: 'rgba(14, 165, 233, 0.9)',
  },
} as const

/**
 * Resolves world-space control sizing from viewport scale.
 * @param scale Current viewport scale.
 */
export function resolveOverlayControlSizing(scale: number) {
  const safeScale = Math.max(0.01, scale)
  const worldPerPx = 1 / safeScale
  return {
    edgeToleranceWorld: worldPerPx * 6,
    cornerToleranceWorld: worldPerPx * 10,
    rotateSectorInnerRadiusWorld: worldPerPx * 12,
    rotateSectorOuterRadiusWorld: worldPerPx * 22,
    rotateCornerOffsetWorld: worldPerPx * 10,
    cornerVisualSizeWorld: worldPerPx * 10,
  }
}

/**
 * Resolves style overrides for marquee controls.
 * @param control Overlay control descriptor.
 * @param cornerVisualSizeWorld Corner handle visual size.
 */
export function resolveMarqueeControlStyle(control: {id: string; kind: string}, cornerVisualSizeWorld: number) {
  const sharedStroke = '#2563eb'

  if (control.kind === 'resize-edge') {
    return {
      strokeColor: sharedStroke,
      strokeWidth: 1,
      nonScalingStroke: true,
    }
  }

  if (control.kind === 'resize-corner') {
    return {
      strokeColor: sharedStroke,
      strokeWidth: 1,
      fillColor: '#ffffff',
      nonScalingStroke: true,
      pointRadius: cornerVisualSizeWorld,
    }
  }

  if (control.kind === 'rect-radius' || control.kind === 'arc-angle-start' || control.kind === 'arc-angle-end') {
    return {
      strokeColor: sharedStroke,
      strokeWidth: 1,
      fillColor: '#ffffff',
      nonScalingStroke: true,
      pointRadius: cornerVisualSizeWorld * 0.75,
    }
  }

  if (control.kind === 'rotate') {
    return undefined
  }

  if (control.kind === 'move-body') {
    return {
      strokeColor: 'transparent',
      strokeWidth: 0,
    }
  }

  if (control.id.startsWith('marquee:resize-')) {
    return {
      strokeColor: sharedStroke,
      strokeWidth: 1,
      fillColor: '#ffffff',
      nonScalingStroke: true,
      pointRadius: cornerVisualSizeWorld,
    }
  }

  return undefined
}

/**
 * Applies style-handle drag payload into the preview document.
 * @param document Current preview document.
 * @param activeDrag Active style-handle drag payload.
 */
export function resolveShapeStylePreviewDocument(
  document: EditorDocument,
  activeDrag: ShapeStyleHandleDrag | null,
): EditorDocument {
  if (!activeDrag) {
    return document
  }

  if (activeDrag.kind === 'rect-radius') {
    const targetShape = document.shapes.find((shape) => shape.id === activeDrag.payload.shapeId)
    if (!targetShape || targetShape.type !== 'rectangle') {
      return document
    }

    const nextCornerRadius = resolveRectCornerRadiusFromPoint({
      shape: targetShape,
      corner: activeDrag.payload.corner,
      point: activeDrag.payload.point,
    })
    if (nextCornerRadius === null) {
      return document
    }

    const nextShapes = document.shapes.map((shape) => {
      if (shape.id !== activeDrag.payload.shapeId || shape.type !== 'rectangle') {
        return shape
      }

      return {
        ...shape,
        cornerRadii: {
          topLeft: shape.cornerRadii?.topLeft ?? shape.cornerRadius ?? 0,
          topRight: shape.cornerRadii?.topRight ?? shape.cornerRadius ?? 0,
          bottomRight: shape.cornerRadii?.bottomRight ?? shape.cornerRadius ?? 0,
          bottomLeft: shape.cornerRadii?.bottomLeft ?? shape.cornerRadius ?? 0,
          [activeDrag.payload.corner]: nextCornerRadius,
        },
      }
    })

    return {
      ...document,
      shapes: nextShapes,
    }
  }

  const targetShape = document.shapes.find((shape) => shape.id === activeDrag.payload.shapeId)
  if (!targetShape || targetShape.type !== 'ellipse') {
    return document
  }

  const nextAngle = resolveEllipseArcAngleFromPoint({
    shape: targetShape,
    point: activeDrag.payload.point,
  })
  if (nextAngle === null) {
    return document
  }

  const nextShapes = document.shapes.map((shape) => {
    if (shape.id !== activeDrag.payload.shapeId || shape.type !== 'ellipse') {
      return shape
    }

    if (activeDrag.payload.boundary === 'start') {
      return {
        ...shape,
        ellipseStartAngle: nextAngle,
      }
    }

    return {
      ...shape,
      ellipseEndAngle: nextAngle,
    }
  })

  return {
    ...document,
    shapes: nextShapes,
  }
}

/**
 * Resolves optional pointer hint for engine geometry payload requests.
 * @param pathSubSelection Active path sub-selection state.
 * @param activePathShape Active path shape.
 */
export function resolveGeometryHintPointer(
  pathSubSelection: PathSubSelection | null,
  activePathShape: EditorDocument['shapes'][number] | null,
) {
  if (!pathSubSelection || pathSubSelection.shapeId !== activePathShape?.id) {
    return null
  }

  if (pathSubSelection.handlePoint) {
    return {
      x: pathSubSelection.handlePoint.x,
      y: pathSubSelection.handlePoint.y,
    }
  }

  if (
    pathSubSelection.hitType === 'anchorPoint' &&
    pathSubSelection.anchorPoint &&
    Array.isArray(activePathShape?.bezierPoints)
  ) {
    const anchor = activePathShape.bezierPoints[pathSubSelection.anchorPoint.index]?.anchor
    if (anchor) {
      return {x: anchor.x, y: anchor.y}
    }
  }

  return null
}

/**
 * Resolves the effective hover shape id for mask hosts and clipped images.
 * @param document Active interaction document.
 * @param hoveredShapeId Raw hovered shape id.
 */
export function resolveHoveredDisplayShapeId(
  document: EditorDocument,
  hoveredShapeId: string | null,
) {
  if (!hoveredShapeId) {
    return null
  }

  const hoveredShape = document.shapes.find((shape) => shape.id === hoveredShapeId)
  if (!hoveredShape) {
    return hoveredShapeId
  }

  if (hoveredShape.type === 'image' && hoveredShape.clipPathId) {
    return document.shapes.some((shape) => shape.id === hoveredShape.clipPathId)
      ? hoveredShape.clipPathId
      : hoveredShapeId
  }

  if (hoveredShape.schema?.maskRole !== 'host') {
    return hoveredShapeId
  }

  const maskSource = resolveMaskGroupMembers(document, hoveredShape.id).find((member) => (
    member.id !== hoveredShape.id && member.schema?.maskRole === 'source'
  ))
  return maskSource?.id ?? hoveredShapeId
}
