/**
 * Renderer/WebGL capabilities barrel.
 * Re-exports capability constructors and contracts for orchestrator wiring.
 */
export {
  createWebGLLodCapability,
} from './lodCapability.ts'

export {
  createWebGLSnapshotCapability,
} from './snapshotCapability.ts'

export {
  createWebGLTileCacheCapability,
} from './tileCacheCapability.ts'

export {
  createWebGLTileQueueCapability,
} from './tileQueueCapability.ts'

export type {
  WebGLLodCapability,
  WebGLLodFrameState,
} from './lodCapability.ts'

export type {
  WebGLSnapshotCapability,
  WebGLSnapshotReuseResult,
} from './snapshotCapability.ts'

export type {
  WebGLTileCacheCapability,
} from './tileCacheCapability.ts'

export type {
  WebGLTileQueueCapability,
} from './tileQueueCapability.ts'
