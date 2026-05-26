import type {EngineCameraState as ThreeEditorCameraState} from '@venus/engine'

/** Declares one semantic lighting mode consumed by runtime command toggles. */
export type ThreeEditorLightingMode = 'inherit' | 'lit' | 'unlit'

/** Declares one fixed world-space object rendered through the engine graph contract. */
export type ThreeEditorWorldObject = {
  /** Stable object id used by graph node ids and selection state. */
  id: string
  /** Human-readable object label rendered in the document model list. */
  label: string
  /** World-space x position used by semantic3d transform payloads. */
  x: number
  /** World-space y position used by semantic3d transform payloads. */
  y: number
  /** World-space z position used by semantic3d transform payloads. */
  z: number
  /** World-space width used by semantic3d bounds payloads. */
  width: number
  /** World-space height used by semantic3d bounds payloads. */
  height: number
  /** World-space depth used by semantic3d bounds payloads. */
  depth: number
  /** Base color used by shape fill and stroke properties. */
  color: string
}

/** Declares runtime switch state used by command buttons and diagnostics rows. */
export type ThreeEditorOverlayState = {
  /** Whether world-axis graph nodes are included. */
  axesEnabled: boolean
  /** Whether world-grid graph nodes are included. */
  gridEnabled: boolean
  /** Whether corner-gizmo graph nodes are included. */
  gizmoEnabled: boolean
  /** Whether semantic depth layering payloads are enabled. */
  depthLayeringEnabled: boolean
  /** Whether semantic visibility mask payloads are enabled. */
  visibilityMaskEnabled: boolean
  /** Active semantic lighting mode forwarded into graph nodes. */
  lightingMode: ThreeEditorLightingMode
}

/** Declares one graph-build input packet so scene synthesis stays deterministic and testable. */
export type BuildThreeEditorGraphParams = {
  /** Camera state used to project camera metadata into semantic payloads. */
  cameraState: ThreeEditorCameraState
  /** Overlay switch state controlling optional graph sections. */
  overlayState: ThreeEditorOverlayState
  /** Ordered world objects to materialize into engine nodes. */
  worldObjects: ReadonlyArray<ThreeEditorWorldObject>
  /** Optional selected entity id used for visual emphasis. */
  selectedEntityId: string | null
  /** Optional hover entity id used for visual emphasis. */
  hoverEntityId: string | null
}

/** Declares baseline world objects used by the rebuilt runtime shell. */
export const DEFAULT_THREE_EDITOR_WORLD_OBJECTS: ReadonlyArray<ThreeEditorWorldObject> = [
  {
    id: 'mesh-main-cube',
    label: 'Main Cube',
    x: 0,
    y: 0,
    z: 0,
    width: 220,
    height: 220,
    depth: 220,
    color: '#0ea5e9',
  },
  {
    id: 'mesh-left-cube',
    label: 'Left Block',
    x: -170,
    y: -42,
    z: 70,
    width: 170,
    height: 150,
    depth: 150,
    color: '#14b8a6',
  },
  {
    id: 'mesh-right-cube',
    label: 'Right Block',
    x: 190,
    y: 20,
    z: 55,
    width: 140,
    height: 180,
    depth: 140,
    color: '#fb7185',
  },
]
