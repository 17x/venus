import type { EngineSceneBufferLayout } from '../buffer/buffer.ts'
import type {
  EngineMat3Affine2D,
  EngineRect2,
  EngineVec2,
} from '../../math/dimension/types.ts'
import type { EngineMaterialRegistrySnapshot } from '../../material/contracts.ts'
import type { EngineLightingRigSnapshot } from '../../lighting/contracts.ts'

export type EngineNodeId = string

/**
 * Keeps the legacy point contract stable while delegating to shared dimension primitives.
 */
export type EnginePoint = EngineVec2

export interface EngineBezierPoint {
  anchor: EnginePoint
  cp1?: EnginePoint | null
  cp2?: EnginePoint | null
}

/**
 * Keeps the legacy rectangle contract stable while delegating to shared dimension primitives.
 */
export type EngineRect = EngineRect2

/**
 * Keeps the legacy 2D affine transform contract stable for existing scene payloads.
 */
export interface EngineTransform2D {
  /** Affine matrix layout [a, b, c, d, e, f] used by current 2D runtime paths. */
  matrix: EngineMat3Affine2D
}

export type EngineClipShape =
  | {
    kind: 'rect'
    rect: EngineRect
    radius?: number
  }
  | {
    kind: 'path'
    points: readonly EnginePoint[]
    closed?: boolean
  }

export interface EngineNodeBase {
  id: EngineNodeId
  type: string
  opacity?: number
  blendMode?: string
  /** Optional scene-material id resolved through scene-level material registry. */
  materialId?: string
  /** Optional node-level lighting mode override for mixed 2D/3D scenes. */
  lightingMode?: 'inherit' | 'unlit' | 'lit'
  transform?: EngineTransform2D
  shadow?: {
    color?: string
    offsetX?: number
    offsetY?: number
    blur?: number
  }
  // `clipNodeId` enables graph-level clip reuse, while `clipShape` supports
  // inline clipping for lightweight nodes (for example clipped images).
  clip?: {
    clipNodeId?: EngineNodeId
    clipShape?: EngineClipShape
    rule?: 'nonzero' | 'evenodd'
  }
}

export interface EngineTextStyle {
  fontFamily: string
  fontSize: number
  fontWeight?: number | string
  fontStyle?: 'normal' | 'italic' | 'oblique'
  lineHeight?: number
  letterSpacing?: number
  fill?: string
  stroke?: string
  strokeWidth?: number
  align?: 'start' | 'center' | 'end'
  verticalAlign?: 'top' | 'middle' | 'bottom'
  shadow?: {
    color?: string
    offsetX?: number
    offsetY?: number
    blur?: number
  }
}

export interface EngineTextRun {
  text: string
  style?: Partial<EngineTextStyle>
}

export interface EngineTextNode extends EngineNodeBase {
  type: 'text'
  x: number
  y: number
  width?: number
  height?: number
  style: EngineTextStyle
  // `text` is the fast plain-string path. `runs` is the rich-text path.
  // Renderers should prefer `runs` when both are present.
  text?: string
  runs?: readonly EngineTextRun[]
  wrap?: 'none' | 'word' | 'char'
  cacheKey?: string
  lineCount?: number
  maxLineHeight?: number
}

export interface EngineImageNode extends EngineNodeBase {
  type: 'image'
  x: number
  y: number
  width: number
  height: number
  assetId: string
  sourceRect?: EngineRect
  naturalSize?: {
    width: number
    height: number
  }
  imageSmoothing?: boolean
}

export interface EngineGroupNode extends EngineNodeBase {
  type: 'group'
  children: readonly EngineRenderableNode[]
}

export interface EngineShapeNode extends EngineNodeBase {
  type: 'shape'
  shape: 'rect' | 'ellipse' | 'line' | 'polygon' | 'path'
  x: number
  y: number
  width: number
  height: number
  // Rectangle corner radius controls. `cornerRadii` takes precedence over
  // uniform `cornerRadius` when both are provided.
  cornerRadius?: number
  cornerRadii?: {
    topLeft?: number
    topRight?: number
    bottomRight?: number
    bottomLeft?: number
  }
  // Ellipse arc controls in degrees. When omitted, the ellipse is full-circle.
  ellipseStartAngle?: number
  ellipseEndAngle?: number
  // Arrowheads for open stroke primitives.
  strokeStartArrowhead?: 'none' | 'triangle' | 'diamond' | 'circle' | 'bar'
  strokeEndArrowhead?: 'none' | 'triangle' | 'diamond' | 'circle' | 'bar'
  points?: readonly EnginePoint[]
  bezierPoints?: readonly EngineBezierPoint[]
  pointCount?: number
  bezierPointCount?: number
  closed?: boolean
  fill?: string
  stroke?: string
  strokeWidth?: number
}

export type EngineRenderableNode =
  | EngineTextNode
  | EngineImageNode
  | EngineShapeNode
  | EngineGroupNode

export interface EngineSceneSnapshot {
  // Revision is used by render adapters for cache invalidation and should
  // change whenever render-relevant scene content changes.
  revision: string | number
  width: number
  height: number
  nodes: readonly EngineRenderableNode[]
  metadata?: {
    planVersion?: number
    bufferVersion?: number
    dirtyNodeIds?: readonly EngineNodeId[]
    removedNodeIds?: readonly EngineNodeId[]
    bufferLayout?: EngineSceneBufferLayout
  }
  /** Optional scene-level material registry used by render material binding resolution. */
  materialRegistry?: EngineMaterialRegistrySnapshot
  /** Optional scene-level lighting rig used by lit shading paths. */
  lightingRig?: EngineLightingRigSnapshot
}
