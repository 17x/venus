import {
  resolveOverlayModelHit,
  type ControlHitAreaTesters,
  type OverlayControlHitResult,
  type OverlayModel,
} from '@venus/editor-primitive'
import {
  isPointInsideEngineShapeHitArea,
  type EngineEditorHitTestNode,
} from '@venus/engine'

/**
 * Defines vector-side path tester options consumed when overlay controls
 * carry path-shaped hit areas.
 *
 * Path testers are delegated to the engine so that vector overlay logic
 * stays geometry-mechanism free per AGENTS.md layer rules.
 */
export interface VectorOverlayPathTesterOptions {
  /** Stores resolver from path id (shape id) to hit-test node. */
  resolveShape: (pathId: string) => EngineEditorHitTestNode | undefined
  /** Stores optional shapeById passthrough used by group/clip resolution. */
  shapeById?: Map<string, EngineEditorHitTestNode>
  /** Stores optional default tolerance forwarded to engine path tests. */
  defaultTolerance?: number
}

/**
 * Defines pointer hit-resolution input for the vector overlay model.
 */
export interface ResolveVectorOverlayHitOptions {
  /** Stores pointer in world coordinates matching control hit areas. */
  pointer: {x: number; y: number}
  /** Stores overlay model to query. */
  model: OverlayModel
  /** Stores optional engine-bound path tester wiring. */
  path?: VectorOverlayPathTesterOptions
}

/**
 * Resolves the highest-priority overlay control hit using primitive hit
 * resolution semantics with engine-backed path testing.
 *
 * Wraps editor-primitive `resolveOverlayModelHit` with a default
 * `ControlHitAreaTesters.testPath` that delegates to engine fill/stroke
 * hit-area testing. This keeps priority ordering primitive-owned while
 * keeping geometry math engine-owned.
 */
export function resolveVectorOverlayHit(
  options: ResolveVectorOverlayHitOptions,
): OverlayControlHitResult | null {
  const testers: ControlHitAreaTesters | undefined = options.path
    ? buildEngineBackedTesters(options.path)
    : undefined

  return resolveOverlayModelHit({
    pointer: options.pointer,
    model: options.model,
    testers,
  })
}

// Builds a primitive testers wrapper that defers path hits to the engine API.
function buildEngineBackedTesters(path: VectorOverlayPathTesterOptions): ControlHitAreaTesters {
  return {
    testPath: (pathId, pointer, testOptions) => {
      const shape = path.resolveShape(pathId)
      if (!shape) {
        // Unknown path id: treat as a miss instead of throwing so resolution stays robust.
        return false
      }
      return isPointInsideEngineShapeHitArea(pointer, shape, {
        // Forward shapeById so engine can resolve clipping/group hierarchies if needed.
        shapeById: path.shapeById,
        // Use caller-provided tolerance; fall back to adapter default.
        tolerance: testOptions?.tolerance ?? path.defaultTolerance,
      })
    },
  }
}
