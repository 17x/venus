export const VENUS_MODULE_NAMES = [
  'render',
  'camera',
  'hitTest',
  'interaction',
  'animate',
  'debug',
  'effects',
  'history',
  'export',
] as const

export type VenusModuleName = (typeof VENUS_MODULE_NAMES)[number]

export type VenusModuleCategory =
  | 'runtime'
  | 'interaction'
  | 'editing'
  | 'output'

export type VenusModuleStatus =
  | 'core-module'
  | 'core-facade'
  | 'reserved'

export interface VenusModuleCatalogEntry {
  name: VenusModuleName
  category: VenusModuleCategory
  status: VenusModuleStatus
  summary: string
}

export const VENUS_MODULE_CATALOG: readonly VenusModuleCatalogEntry[] = [
  {name: 'render', category: 'runtime', status: 'core-module', summary: 'Mount, resize, render, renderer defaults, backend diagnostics, LOD, and culling.'},
  {name: 'camera', category: 'runtime', status: 'core-module', summary: 'Viewport projection, pan, zoom, and fit-bounds controls.'},
  {name: 'hitTest', category: 'interaction', status: 'core-module', summary: 'Pointer hit testing, multi-hit results, and target metadata.'},
  {name: 'interaction', category: 'interaction', status: 'core-module', summary: 'Selection state, selection commands, guide snapping, and pointer-driven editing.'},
  {name: 'animate', category: 'runtime', status: 'core-module', summary: 'Document property animation controller.'},
  {name: 'debug', category: 'runtime', status: 'core-module', summary: 'Debug overlays, cache diagnostics, and frame measurement.'},
  {name: 'effects', category: 'editing', status: 'core-module', summary: 'Structured visual effect application: drop shadow, inner shadow, and layer blur.'},
  {name: 'history', category: 'editing', status: 'core-module', summary: 'Undo and redo snapshot history backed by an internal module controller.'},
  {name: 'export', category: 'output', status: 'core-module', summary: 'Document export to PNG, JPEG, and SVG formats.'},
]

export function isVenusModuleName(name: string): name is VenusModuleName {
  return (VENUS_MODULE_NAMES as readonly string[]).includes(name)
}
