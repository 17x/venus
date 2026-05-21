/**
 * Unified public types barrel aligned with the 2D->3D architecture blueprint.
 */
export type {
  EngineRenderableNode,
  EngineSceneSnapshot,
} from '../scene/types/types.ts'
export type {
  EngineRenderFrame,
  EngineRenderer,
  EngineRendererCapabilities,
  EngineRenderStats,
  EngineViewportState,
} from '../renderer/types/index.ts'
export type {
  EngineDrawCommand,
  EngineLayeredRenderInput,
  EngineLayeredRenderOutput,
} from '../render/index.ts'
