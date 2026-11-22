// Core camera barrel exposes backend-neutral camera helpers; renderer-specific
// camera uniform/upload code must stay in renderer backends.

export {
  createRenderCameraProjector,
} from './camera.ts'

export {
  projectWorldPoint,
} from './project.ts'

export {
  unprojectScreenPoint,
} from './unproject.ts'

export type {
  EngineViewportBoundsState,
  EngineViewportOverscanCssPx,
  EngineViewportOverscanInput,
  EngineViewportWorldBounds,
  ResolveEngineViewportWorldBoundsOptions,
} from './viewportBounds.ts'

export {
  normalizeEngineViewportOverscan,
  resolveEngineViewportWorldBounds,
  resolveEngineViewportWorldRect,
} from './viewportBounds.ts'
