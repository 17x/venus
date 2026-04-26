// Keep the public entry path stable while implementation lives in engine modules.
export {
  EngineViewport,
} from './engineAdapter/engineViewport.tsx'
export {
  EngineRenderer,
} from './engineAdapter/engineRenderer.tsx'
export type {
  EngineOverlayProps,
  EngineOverlayRenderer,
  EngineRendererComponent,
  EngineRendererProps,
  OverlayDiagnostics,
} from './engineAdapter/engineTypes.ts'
