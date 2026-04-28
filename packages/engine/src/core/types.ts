import type { Mat3, Point2D } from '../math/matrix/matrix.ts'
import type { EngineRenderableNode, EngineSceneSnapshot } from '../scene/types/types.ts'

/**
 * Declares one camera snapshot used by the layered render pipeline.
 */
export interface EngineRenderCamera {
  /** Stores viewport width in CSS pixels. */
  viewportWidth: number
  /** Stores viewport height in CSS pixels. */
  viewportHeight: number
  /** Stores viewport scale factor. */
  scale: number
  /** Stores viewport X offset in screen space. */
  offsetX: number
  /** Stores viewport Y offset in screen space. */
  offsetY: number
  /** Stores world-to-screen matrix used by draw/hit projection. */
  matrix: Mat3
  /** Stores screen-to-world matrix used by inverse projection paths. */
  inverseMatrix: Mat3
}

/**
 * Declares active interaction payload consumed by layered rendering.
 */
export interface EngineRenderInteractionInput {
  /** Stores currently active node ids that should render in active layer. */
  activeIds?: ReadonlySet<string>
  /** Stores temporary transform preview matrix for active layer drawing. */
  previewTransform?: readonly [number, number, number, number, number, number]
  /** Stores current hover id for overlay feedback. */
  hoverId?: string
  /** Stores current selection ids for overlay feedback. */
  selectionIds?: ReadonlySet<string>
}

/**
 * Declares optional render flags used by layered render orchestration.
 */
export interface EngineRenderOptions {
  /** Toggles base-layer cache usage. */
  enableCache?: boolean
  /** Stores optional viewport clipping bounds in world space. */
  viewport?: {
    /** Stores minimum world x. */
    x: number
    /** Stores minimum world y. */
    y: number
    /** Stores viewport width in world units. */
    width: number
    /** Stores viewport height in world units. */
    height: number
  }
}

/**
 * Declares one layered render input contract.
 */
export interface EngineLayeredRenderInput {
  /** Stores immutable render-facing scene snapshot. */
  scene: EngineSceneSnapshot
  /** Stores camera state used by layered render passes. */
  camera: EngineRenderCamera
  /** Stores interaction state used by active/overlay layers. */
  interaction: EngineRenderInteractionInput
  /** Stores optional render flags and overrides. */
  options?: EngineRenderOptions
}

/**
 * Declares one simplified draw command emitted by layered renderers.
 */
export interface EngineDrawCommand {
  /** Stores command id used for diagnostics and hit routing. */
  id: string
  /** Stores node id associated with this draw command. */
  nodeId: string
  /** Stores render layer where this command originates. */
  layer: 'base' | 'active' | 'overlay'
  /** Stores renderable node type for backend dispatching. */
  nodeType: EngineRenderableNode['type']
  /** Stores command world bounds for culling/hit checks. */
  bounds: {
    /** Stores minimum world x. */
    x: number
    /** Stores minimum world y. */
    y: number
    /** Stores width in world units. */
    width: number
    /** Stores height in world units. */
    height: number
  }
  /** Stores optional marker payload for debug and overlay categories. */
  marker?: string
}

/**
 * Declares layered render output with per-layer and composed command arrays.
 */
export interface EngineLayeredRenderOutput {
  /** Stores base-layer draw commands. */
  base: EngineDrawCommand[]
  /** Stores active-layer draw commands. */
  active: EngineDrawCommand[]
  /** Stores overlay-layer draw commands. */
  overlay: EngineDrawCommand[]
  /** Stores final composed draw command list. */
  composed: EngineDrawCommand[]
}

/**
 * Declares shared point shape used by render/hit helper utilities.
 */
export interface EngineRenderPoint extends Point2D {}
