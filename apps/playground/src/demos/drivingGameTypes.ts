/**
 * Declares engine graph node extensions used by the driving-game scenario.
 */
export interface DrivingGameConfig {
  /** Camera lock mode: when true, player car stays centered in viewport. */
  cameraLock: boolean
  /** Whether shadows are enabled. */
  shadowsEnabled: boolean
  /** Anti-aliasing toggle. */
  antialiasEnabled: boolean
  /** Vsync toggle. */
  vsyncEnabled: boolean
  /** Target frames per second. */
  targetFps: number
  /** Whether to show FPS counter. */
  showFps: boolean
  /** Camera distance from player car. */
  cameraDistance: number
  /** Camera vertical angle in degrees. */
  cameraPitch: number
  /** Camera target Y offset in world space. */
  cameraTargetHeight: number
  /** Camera perspective field of view in degrees. */
  cameraFovY: number
  /** Camera near plane. */
  cameraNear: number
  /** Camera far plane. */
  cameraFar: number
  /** Orbit sensitivity for mouse drag in degrees per pixel. */
  cameraOrbitSensitivity: number
  /** Wheel zoom sensitivity. */
  cameraZoomSensitivity: number
  /** Keyboard orbit speed in degrees per second (Q/E). */
  cameraOrbitKeyboardSpeed: number
  /** Player car speed multiplier. */
  carSpeed: number
  /** Player movement acceleration in world units per second squared. */
  carAcceleration: number
  /** Brake deceleration when Space is pressed. */
  carBrakeDeceleration: number
  /** Passive drag deceleration when no movement key is pressed. */
  carDrag: number
  /** Car yaw turn speed in degrees per second. */
  carTurnSpeed: number
  /** Map size in world units. */
  mapSize: number
  /** Whether ground helper grid is visible. */
  worldGridEnabled: boolean
  /** Ground helper grid spacing. */
  worldGridStep: number
  /** Ground helper grid line thickness. */
  worldGridThickness: number
}

export const DEFAULT_DRIVING_GAME_CONFIG: DrivingGameConfig = {
  cameraLock: true,
  shadowsEnabled: true,
  antialiasEnabled: true,
  vsyncEnabled: false,
  targetFps: 60,
  showFps: true,
  cameraDistance: 1.5,
  cameraPitch: 35,
  cameraTargetHeight: 6,
  cameraFovY: 52,
  cameraNear: 0.1,
  cameraFar: 5000,
  cameraOrbitSensitivity: 0.28,
  cameraZoomSensitivity: 0.0005,
  cameraOrbitKeyboardSpeed: 70,
  carSpeed: 8,
  carAcceleration: 22,
  carBrakeDeceleration: 34,
  carDrag: 4,
  carTurnSpeed: 180,
  mapSize: 400,
  worldGridEnabled: true,
  worldGridStep: 24,
  worldGridThickness: 1.2,
}

export interface DrivingGameState {
  config: DrivingGameConfig
  /** Player car position in world coordinates. */
  carX: number
  carY: number
  carZ: number
  /** Player car rotation in degrees (yaw). */
  carYaw: number
  /** Current speed scalar. */
  speed: number
  /** Current velocity x component in world space. */
  velocityX: number
  /** Current velocity z/y component in world space. */
  velocityY: number
  /** Whether game is paused. */
  paused: boolean
  /** Loading progress 0-100. */
  loadingProgress: number
  /** Loading status text. */
  loadingText: string
  /** Whether initial load is complete. */
  loaded: boolean
  /** Active keys pressed. */
  keysDown: Set<string>
  /** Camera rotation around player (orbit angle). */
  cameraOrbitAngle: number
}

export function createInitialDrivingGameState(): DrivingGameState {
  return {
    config: { ...DEFAULT_DRIVING_GAME_CONFIG },
    carX: 0,
    carY: 0,
    carZ: 1,
    carYaw: 0,
    speed: 0,
    velocityX: 0,
    velocityY: 0,
    paused: false,
    loadingProgress: 0,
    loadingText: 'Initializing engine...',
    loaded: false,
    keysDown: new Set(),
    cameraOrbitAngle: 35,
  }
}
