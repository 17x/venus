/**
 * Re-export viewport pan helpers from @venus/lib while preserving engine API names.
 */
export type {
  ViewportPanOffset as EngineViewportPanOffset,
  ViewportPanOrigin as EngineViewportPanOrigin,
} from '@venus/lib/viewport'
export {
  accumulatePointerPanOffset as accumulateEnginePointerPanOffset,
  accumulateWheelPanOffset as accumulateEngineWheelPanOffset,
  createViewportPanOrigin as createEngineViewportPanOrigin,
} from '@venus/lib/viewport'
