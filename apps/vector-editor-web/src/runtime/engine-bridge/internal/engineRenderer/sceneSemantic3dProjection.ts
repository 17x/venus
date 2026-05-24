import type {EditorDocument} from '../../../model/index.ts'

/**
 * Minimal scene node shape consumed by semantic3d projection helper.
 */
export interface SceneSemantic3DProjectionNode {
  /** Stable scene node id used to join document shapes. */
  id: string
  /** Optional adapter-provided source type token. */
  type?: string
  /** Optional parent node id for hierarchy projection. */
  parentId?: string
  /** Optional world x coordinate from adapter payload. */
  x?: number
  /** Optional world y coordinate from adapter payload. */
  y?: number
  /** Optional world z coordinate from adapter payload. */
  z?: number
  /** Optional world width from adapter payload. */
  width?: number
  /** Optional world height from adapter payload. */
  height?: number
  /** Optional world depth from adapter payload. */
  depth?: number
  /** Optional rotation around X axis in degrees. */
  rotationX?: number
  /** Optional rotation around Y axis in degrees. */
  rotationY?: number
  /** Optional rotation around Z axis in degrees. */
  rotationZ?: number
  /** Optional scale factor on X axis. */
  scaleX?: number
  /** Optional scale factor on Y axis. */
  scaleY?: number
  /** Optional scale factor on Z axis. */
  scaleZ?: number
  /** Optional render-order index. */
  renderOrder?: number
  /** Optional visibility bit. */
  visible?: boolean
  /** Optional lighting mode hint. */
  lightingMode?: 'inherit' | 'unlit' | 'lit'
  /** Optional material id hint. */
  materialId?: string
  /** Optional semantic3d envelope from upstream adapter. */
  semantic3d?: Readonly<Record<string, unknown>>
  /** Additional adapter-defined fields. */
  [key: string]: unknown
}

/**
 * Minimal scene shape consumed by semantic3d projection helper.
 */
export interface SceneSemantic3DProjectionScene {
  /** Scene revision marker mirrored to engine graph revision. */
  revision: string | number
  /** Canvas width in world units. */
  width: number
  /** Canvas height in world units. */
  height: number
  /** Renderable node list owned by scene adapter output. */
  nodes: SceneSemantic3DProjectionNode[]
}

/**
 * Projects deterministic 3D semantic fields onto scene nodes before engine ingestion.
 * @param scene Adapter-produced scene payload that is about to be sent to engine graph APIs.
 * @param document Canonical editor document used as semantic fallback source.
 */
export function projectSceneSemantic3DForEngine(
  scene: SceneSemantic3DProjectionScene,
  document: EditorDocument,
): SceneSemantic3DProjectionScene {
  const shapeIndexById = new Map(document.shapes.map((shape, index) => [shape.id, index]))
  const shapeById = new Map(document.shapes.map((shape) => [shape.id, shape]))

  return {
    revision: scene.revision,
    width: scene.width,
    height: scene.height,
    nodes: scene.nodes.map((node) => {
      const sourceShape = shapeById.get(node.id)
      const sourceIndex = shapeIndexById.get(node.id) ?? 0
      const x = resolveFiniteNumber(node.x, sourceShape?.x ?? 0)
      const y = resolveFiniteNumber(node.y, sourceShape?.y ?? 0)
      const z = resolveFiniteNumber(node.z, sourceIndex)
      const width = Math.abs(resolveFiniteNumber(node.width, sourceShape?.width ?? 0))
      const height = Math.abs(resolveFiniteNumber(node.height, sourceShape?.height ?? 0))
      const depth = Math.abs(resolveFiniteNumber(node.depth, 0))
      const rotationX = resolveFiniteNumber(node.rotationX, 0)
      const rotationY = resolveFiniteNumber(node.rotationY, 0)
      const rotationZ = resolveFiniteNumber(node.rotationZ, sourceShape?.rotation ?? 0)
      const scaleX = resolveFiniteNumber(node.scaleX, sourceShape?.flipX ? -1 : 1)
      const scaleY = resolveFiniteNumber(node.scaleY, sourceShape?.flipY ? -1 : 1)
      const scaleZ = resolveFiniteNumber(node.scaleZ, 1)
      const renderOrder = resolveFiniteNumber(node.renderOrder, sourceIndex)
      const visible = typeof node.visible === 'boolean'
        ? node.visible
        : true
      const sourceType = typeof node.type === 'string'
        ? node.type
        : sourceShape?.type

      return {
        ...node,
        parentId: typeof node.parentId === 'string'
          ? node.parentId
          : typeof sourceShape?.parentId === 'string'
            ? sourceShape.parentId
            : undefined,
        x,
        y,
        z,
        width,
        height,
        depth,
        rotationX,
        rotationY,
        rotationZ,
        scaleX,
        scaleY,
        scaleZ,
        renderOrder,
        visible,
        semantic3d: {
          bounds: {
            x,
            y,
            z,
            width,
            height,
            depth,
          },
          transform: {
            x,
            y,
            z,
            rotationX,
            rotationY,
            rotationZ,
            scaleX,
            scaleY,
            scaleZ,
          },
          sourceType,
          renderOrder,
          visible,
          lightingMode: node.lightingMode,
          materialId: node.materialId,
        },
      }
    }),
  }
}

/**
 * Resolves one finite numeric value from optional input.
 * @param value Raw value that may be missing or non-finite.
 * @param fallback Fallback value used when raw input is not finite.
 */
function resolveFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : fallback
}
