export {
  defineVenusModule,
  isVenusModuleName,
  VENUS_INTERNAL_SERVICE_NAMES,
  VENUS_MODULE_CATALOG,
  VENUS_MODULE_NAMES,
  Venus,
} from './runtime/venus/Venus.ts'
export type {
  VenusInternalServiceName,
  VenusBackendFallback,
  VenusBackend,
  VenusDocumentService,
  VenusDocumentChangedEvent,
  VenusDocumentChangedReason,
  VenusDocumentNodeAddedEvent,
  VenusDocumentNodeRemovedEvent,
  VenusDocumentNodeUpdatedEvent,
  VenusDocumentStructureChangedEvent,
  VenusDocumentStructureChangeReason,
  VenusInvalidationService,
  VenusLayerMutationResult,
  VenusModule,
  VenusModuleCatalogEntry,
  VenusModuleCategory,
  VenusModuleContext,
  VenusModuleDiagnostics,
  VenusModuleName,
  VenusModuleStatus,
  VenusParameters,
  VenusRegisteredServiceMap,
  VenusRegisteredServiceName,
  VenusServiceRegistry,
  VenusViewportService,
} from './runtime/venus/Venus.ts'
export {
  createVenusAnimateModule,
  createVenusCameraModule,
  createVenusDebugModule,
  createVenusEffectsModule,
  createVenusExportModule,
  createVenusHistoryModule,
  createVenusHitTestModule,
  createVenusInteractionModule,
} from './runtime/venus/modules/index.ts'

import {Venus} from './runtime/venus/Venus.ts'
import type {VenusParameters} from './runtime/venus/Venus.ts'

/**
 * Creates a Venus base runtime with optional capability modules.
 * @param parameters Optional runtime configuration.
 */
export function createVenus(parameters?: VenusParameters): Venus {
  return new Venus(parameters)
}
