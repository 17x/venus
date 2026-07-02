export const VENUS_INTERNAL_SERVICE_NAMES = [
  'document',
  'spatial',
  'geometryCache',
  'invalidation',
  'viewport',
  'scheduler',
] as const

export type VenusInternalServiceName = (typeof VENUS_INTERNAL_SERVICE_NAMES)[number]
