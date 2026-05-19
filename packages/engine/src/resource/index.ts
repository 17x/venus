/**
 * Resource domain barrel aligned with the 2D->3D architecture blueprint.
 */
export type {
  EngineCanvasSurfaceFactory,
  EngineResourceLoader,
  EngineTextLayout,
  EngineTextLayoutContext,
  EngineTextShaper,
} from '../renderer/types/index.ts'
export type {
  GeometryCache,
  GeometryCacheEntry,
  LayeredTileCache,
  LayeredTileCacheKey,
} from '../renderer/cache/index.ts'
export {
  toLayeredTileCacheSignature,
} from '../renderer/cache/index.ts'
export type {
  EngineStreamingAssetKind,
  EngineStreamingAssetRequest,
  EngineStreamingBudget,
  EngineStreamingCacheEntry,
  EngineStreamingPlan,
  EngineStreamingPlanInput,
} from './assetStreamingPlan/assetStreamingPlan.ts'
export {
  resolveEngineStreamingPlan,
} from './assetStreamingPlan/assetStreamingPlan.ts'
export type {
  EngineStreamingExecutionSummary,
  EngineStreamingPlanExecutor,
} from './assetStreamingExecution/assetStreamingExecution.ts'
export {
  executeEngineStreamingPlan,
} from './assetStreamingExecution/assetStreamingExecution.ts'
export type {
  EngineStreamingExecutionDiagnostics,
} from './assetStreamingExecution/assetStreamingExecutionDiagnostics.ts'
export {
  resolveEngineStreamingExecutionDiagnostics,
} from './assetStreamingExecution/assetStreamingExecutionDiagnostics.ts'
