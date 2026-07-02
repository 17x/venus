export const VENUS_INTERNAL_SERVICE_NAMES = [
  'document',
  'sceneStore',
  'geometry',
  'spatial',
  'geometryCache',
  'invalidation',
  'viewport',
  'renderPlan',
  'scheduler',
  'resource',
  'backendBridge',
] as const

export type VenusInternalServiceName = (typeof VENUS_INTERNAL_SERVICE_NAMES)[number]
