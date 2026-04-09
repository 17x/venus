import type {EditorDocument} from '@venus/document-core'
import type {CanvasRenderLodLevel} from '../renderer/lod.ts'
import type {CanvasViewportState} from '../viewport/types.ts'

export interface CanvasElementBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export interface CanvasElementNodeBase {
  id: string
  type: string
  x: number
  y: number
  width: number
  height: number
}

export interface CanvasElementRenderContext {
  document: EditorDocument
  viewport: CanvasViewportState
  lodLevel?: CanvasRenderLodLevel
  renderQuality?: 'full' | 'interactive'
}

export interface CanvasElementHitTestContext {
  document: EditorDocument
  tolerance: number
  allowFrameSelection: boolean
}

export interface CanvasSnapSource {
  axis: 'x' | 'y' | 'angle'
  value: number
  kind: 'edge-min' | 'edge-max' | 'center' | 'corner' | 'vertex' | 'grid' | 'angle'
  sourceId: string
  sourceType: string
}

/**
 * Extensible shape behavior contract used by editor apps to add custom
 * elements on top of Venus built-ins.
 */
export interface CanvasElementBehavior<TNode extends CanvasElementNodeBase = CanvasElementNodeBase> {
  type: TNode['type'] | (string & {})
  render: (
    context: CanvasRenderingContext2D,
    node: TNode,
    runtime: CanvasElementRenderContext,
  ) => void
  hitTest: (
    point: {x: number; y: number},
    node: TNode,
    runtime: CanvasElementHitTestContext,
  ) => boolean
  getBounds?: (node: TNode, document: EditorDocument) => CanvasElementBounds
  getSnapSources?: (node: TNode, document: EditorDocument) => CanvasSnapSource[]
}

export interface CanvasElementRegistry {
  register: <TNode extends CanvasElementNodeBase>(behavior: CanvasElementBehavior<TNode>) => void
  registerMany: (behaviors: CanvasElementBehavior[]) => void
  unregister: (type: string) => void
  get: (type: string) => CanvasElementBehavior | undefined
  has: (type: string) => boolean
  list: () => CanvasElementBehavior[]
}

export function createCanvasElementRegistry(
  initialBehaviors: CanvasElementBehavior[] = [],
): CanvasElementRegistry {
  const behaviors = new Map<string, CanvasElementBehavior<CanvasElementNodeBase>>()

  const register = <TNode extends CanvasElementNodeBase>(behavior: CanvasElementBehavior<TNode>) => {
    behaviors.set(behavior.type, behavior as unknown as CanvasElementBehavior<CanvasElementNodeBase>)
  }

  initialBehaviors.forEach((behavior) => register(behavior))

  return {
    register,
    registerMany: (nextBehaviors) => {
      nextBehaviors.forEach((behavior) => {
        register(behavior)
      })
    },
    unregister: (type) => {
      behaviors.delete(type)
    },
    get: (type) => behaviors.get(type),
    has: (type) => behaviors.has(type),
    list: () => Array.from(behaviors.values()),
  }
}
