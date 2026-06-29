export {
  defineVenusModule,
  isVenusModuleName,
  VENUS_INTERNAL_SERVICE_NAMES,
  VENUS_MODULE_NAMES,
  Venus,
} from './runtime/venus/Venus.ts'
export type {
  VenusInternalServiceName,
  VenusBackendFallback,
  VenusBackend,
  VenusDocumentService,
  VenusInvalidationService,
  VenusModule,
  VenusModuleContext,
  VenusModuleDiagnostics,
  VenusModuleName,
  VenusParameters,
  VenusRegisteredServiceMap,
  VenusRegisteredServiceName,
  VenusServiceRegistry,
  VenusViewportService,
} from './runtime/venus/Venus.ts'

import {Venus} from './runtime/venus/Venus.ts'
import type {VenusParameters} from './runtime/venus/Venus.ts'

/** Creates a Venus base runtime with optional capability modules. */
export function createVenus(parameters?: VenusParameters): Venus {
  return new Venus(parameters)
}
