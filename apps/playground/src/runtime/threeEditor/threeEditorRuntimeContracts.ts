import type {EngineCameraState as ThreeEditorCameraState} from '@venus/engine'
import type {TextureSampler} from '../materials/webTextureSampler'

/** Declares one semantic lighting mode consumed by runtime command toggles. */
export type ThreeEditorLightingMode = 'inherit' | 'lit' | 'unlit'

/** Declares one fixed world-space object rendered through the engine graph contract. */
export type ThreeEditorWorldObject = {
  /** Stable object id used by graph node ids and selection state. */
  id: string
  /** Human-readable object label rendered in the document model list. */
  label: string
  /** Primitive kind used by graph builder. */
  kind: 'box' | 'cone' | 'pipe' | 'image'
  /** World-space x position used by semantic3d transform payloads. */
  x: number
  /** World-space y position used by semantic3d transform payloads. */
  y: number
  /** World-space z position used by semantic3d transform payloads. */
  z: number
  /** World-space width used by box/image primitives. */
  width?: number
  /** World-space height used by box/image/cone primitives. */
  height?: number
  /** World-space depth used by box/image primitives. */
  depth?: number
  /** Base radius used by cone/pipe primitives. */
  radius?: number
  /** Secondary radius used by pipe primitives. */
  innerRadius?: number
  /** Base color used by shape fill and stroke properties. */
  color: string
  /** Optional source URL for image-plane semantic metadata. */
  imageSrc?: string
  /** Optional Euler rotation in degrees. */
  rotationXDeg?: number
  rotationYDeg?: number
  rotationZDeg?: number
  /** Optional non-uniform scale factors. */
  scaleX?: number
  scaleY?: number
  scaleZ?: number
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
  /** Optional texture samplers sourced from public assets. */
  textureSamplers?: {
    floor?: TextureSampler
    panel?: TextureSampler
  }
}

/** Declares baseline world objects used by the rebuilt runtime shell. */
export const DEFAULT_THREE_EDITOR_WORLD_OBJECTS: ReadonlyArray<ThreeEditorWorldObject> = [
  {
    id: 'mesh-main-cube',
    label: 'Main Cube',
    kind: 'box',
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
    kind: 'box',
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
    kind: 'box',
    x: 190,
    y: 20,
    z: 55,
    width: 140,
    height: 180,
    depth: 140,
    color: '#fb7185',
  },
  {
    id: 'mesh-cone-marker',
    label: 'Cone Marker',
    kind: 'cone',
    x: -40,
    y: 0,
    z: -230,
    radius: 46,
    height: 150,
    color: '#f59e0b',
  },
  {
    id: 'mesh-pipe-segment',
    label: 'Pipe Segment',
    kind: 'pipe',
    x: 250,
    y: 30,
    z: -160,
    radius: 54,
    innerRadius: 34,
    height: 170,
    color: '#60a5fa',
  },
  {
    id: 'mesh-image-board',
    label: 'Image Board',
    kind: 'image',
    x: -260,
    y: 90,
    z: -120,
    width: 180,
    height: 120,
    depth: 8,
    color: '#e2e8f0',
    imageSrc: 'https://picsum.photos/512/320',
  },
]
