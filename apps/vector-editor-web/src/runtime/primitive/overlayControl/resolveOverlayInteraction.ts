import {
  resolveOverlayModelHit,
  type ControlHitAreaTesters,
  type OverlayControlHitResult,
  type OverlayModel,
} from '@venus/editor-primitive'
import {isPointInsideRuntimeShapeHitArea} from '../../interaction/runtimeHitTest.ts'

/**
 * Declares hit-test node contract accepted by overlay path hit-area testing.
 */
type EngineEditorHitTestNode = Parameters<typeof isPointInsideRuntimeShapeHitArea>[1]

/**
 * Defines vector-side path tester options consumed when overlay controls
 * carry path-shaped hit areas.
 *
 * Path testers are delegated to runtime geometry helpers so overlay logic
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
  /** Stores optional path tester wiring. */
  path?: VectorOverlayPathTesterOptions
}

/**
 * Resolves the highest-priority overlay control hit using primitive hit
 * resolution semantics with runtime-backed path testing.
 *
 * Wraps editor-primitive `resolveOverlayModelHit` with a default
 * `ControlHitAreaTesters.testPath` that delegates to runtime hit-area testing.
 * This keeps priority ordering primitive-owned while keeping geometry details
 * isolated behind one adapter.
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

// Builds a primitive testers wrapper that defers path hits to runtime helpers.
function buildEngineBackedTesters(path: VectorOverlayPathTesterOptions): ControlHitAreaTesters {
  return {
    testPath: (pathId, pointer, testOptions) => {
      const shape = path.resolveShape(pathId)
      if (!shape) {
        // Unknown path id: treat as a miss instead of throwing so resolution stays robust.
        return false
      }
      return isPointInsideRuntimeShapeHitArea(pointer, shape, {
        // Use caller-provided tolerance; fall back to adapter default.
        tolerance: testOptions?.tolerance ?? path.defaultTolerance,
      })
    },
  }
}
