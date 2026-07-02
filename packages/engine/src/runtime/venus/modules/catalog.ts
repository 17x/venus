export const VENUS_MODULE_NAMES = [
  'render',
  'camera',
  'hitTest',
  'select',
  'snap',
  'animate',
  'debug',
  'scale',
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
  {name: 'render', category: 'runtime', status: 'core-module', summary: 'Mount, resize, render, renderer defaults, and backend diagnostics.'},
  {name: 'camera', category: 'runtime', status: 'core-module', summary: 'Viewport projection, pan, zoom, and fit-bounds controls.'},
  {name: 'hitTest', category: 'interaction', status: 'core-module', summary: 'Pointer hit testing, multi-hit results, and target metadata.'},
  {name: 'select', category: 'interaction', status: 'reserved', summary: 'Selection state and selection commands.'},
  {name: 'snap', category: 'editing', status: 'reserved', summary: 'Guide, point, edge, and anchor snapping.'},
  {name: 'animate', category: 'runtime', status: 'core-module', summary: 'Document property animation controller.'},
  {name: 'debug', category: 'runtime', status: 'core-module', summary: 'Debug overlays, cache diagnostics, and frame measurement.'},
  {name: 'scale', category: 'editing', status: 'reserved', summary: 'Scaling and resize policy helpers.'},
  {name: 'effects', category: 'editing', status: 'reserved', summary: 'Advanced appearance/effect helpers beyond base node fields.'},
  {name: 'history', category: 'editing', status: 'core-module', summary: 'Undo and redo snapshot history backed by an internal module controller.'},
  {name: 'export', category: 'output', status: 'reserved', summary: 'Export surfaces for images, SVG, PDF, and host-specific formats.'},
]

export function isVenusModuleName(name: string): name is VenusModuleName {
  return (VENUS_MODULE_NAMES as readonly string[]).includes(name)
}
