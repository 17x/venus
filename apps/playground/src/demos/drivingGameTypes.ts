import type {CityWorldMap} from './cityWorldGenerator'
import {generateCityWorldMap} from './cityWorldGenerator'
import type {DrivingGameFixtureProjection} from './drivingGameFixture'

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
  /** Camera polar angle in degrees (Arcball vertical orbit). */
  cameraPolar: number
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
  /** Seed used by fallback/dev city generation. */
  mapSeed: number
  /** Whether ground helper grid is visible. */
  worldGridEnabled: boolean
  /** Ground helper grid spacing. */
  worldGridStep: number
  /** Ground helper grid line thickness. */
  worldGridThickness: number
  /** Directional key-light intensity. */
  lightDirectionalIntensity: number
  /** Ambient fill-light intensity. */
  lightAmbientIntensity: number
  /** Whether gameplay light rig is enabled. */
  lightRigEnabled: boolean
  /** Global directional reference in degrees (0 = north, clockwise positive). */
  directionDeg: number
  /** Time of day in hours [0, 24). */
  timeOfDayHours: number
  /** Weather token used by rendering/lighting presets. */
  weather: 'sunny' | 'cloudy' | 'rainy' | 'foggy'
  /** Whether deterministic rain/fog particle layers are visible. */
  weatherParticlesEnabled: boolean
  /** Mini-map zoom level token. */
  miniMapZoomLevel: 0 | 1 | 2
  /** Whether time of day advances automatically. */
  timeFlowEnabled: boolean
  /** Time flow speed multiplier in game-hours per real second. */
  timeFlowRate: number
  /** Selected vehicle profile token. */
  vehicleType: 'sedan' | 'sport' | 'suv' | 'truck'
  /** Enables map collision constraints. */
  collisionEnabled: boolean
}

export const DEFAULT_DRIVING_GAME_CONFIG: DrivingGameConfig = {
  cameraLock: true,
  shadowsEnabled: true,
  antialiasEnabled: true,
  vsyncEnabled: false,
  targetFps: 60,
  showFps: true,
  cameraDistance: 1.5,
  cameraPolar: 35,
  cameraTargetHeight: 6,
  cameraFovY: 52,
  cameraNear: 0.5,
  cameraFar: 1800,
  cameraOrbitSensitivity: 0.28,
  cameraZoomSensitivity: 0.0005,
  cameraOrbitKeyboardSpeed: 70,
  carSpeed: 8,
  carAcceleration: 22,
  carBrakeDeceleration: 34,
  carDrag: 4,
  carTurnSpeed: 180,
  mapSize: 400,
  mapSeed: 400,
  worldGridEnabled: true,
  worldGridStep: 24,
  worldGridThickness: 1.2,
  lightDirectionalIntensity: 1.05,
  lightAmbientIntensity: 0.18,
  lightRigEnabled: true,
  directionDeg: 0,
  timeOfDayHours: 14,
  weather: 'sunny',
  weatherParticlesEnabled: true,
  miniMapZoomLevel: 1,
  timeFlowEnabled: true,
  timeFlowRate: 0.35,
  vehicleType: 'sedan',
  collisionEnabled: true,
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
  /** Camera azimuth around player in degrees (Arcball horizontal orbit). */
  cameraAzimuth: number
  /** Generated city world map (engine-first mock dataset). */
  cityMap: CityWorldMap
  /** NPC cars moving along city paths. */
  npcCars: Array<{id: string; x: number; z: number; yaw: number; speed: number; pathIndex: number}>
  /** NPC pedestrians moving along city paths. */
  pedestrians: Array<{id: string; x: number; z: number; yaw: number; speed: number; pathIndex: number}>
}

export function createInitialDrivingGameState(fixture?: DrivingGameFixtureProjection | null): DrivingGameState {
  const config: DrivingGameConfig = {
    ...DEFAULT_DRIVING_GAME_CONFIG,
    ...(fixture?.configPatch ?? {}),
  }
  const cityMap = fixture?.cityMap ?? generateCityWorldMap(config.mapSize, config.mapSeed)
  return {
    config,
    carX: fixture?.player.x ?? 0,
    carY: fixture?.player.z ?? 0,
    carZ: 1,
    carYaw: fixture?.player.yaw ?? 0,
    speed: 0,
    velocityX: 0,
    velocityY: 0,
    paused: false,
    loadingProgress: 0,
    loadingText: 'Initializing engine...',
    loaded: false,
    keysDown: new Set(),
    cameraAzimuth: fixture?.cameraAzimuth ?? 35,
    cityMap,
    npcCars: fixture?.npcCars ?? Array.from({length: 12}).map((_, index) => {
      const node = cityMap.carPath[index % cityMap.carPath.length]
      return {id: `npc-car-${index}`, x: node.x, z: node.z, yaw: 0, speed: 6 + (index % 4), pathIndex: index % cityMap.carPath.length}
    }),
    pedestrians: fixture?.pedestrians ?? Array.from({length: 18}).map((_, index) => {
      const node = cityMap.pedestrianPath[index % cityMap.pedestrianPath.length]
      return {id: `ped-${index}`, x: node.x, z: node.z, yaw: 0, speed: 2 + (index % 3) * 0.5, pathIndex: index % cityMap.pedestrianPath.length}
    }),
  }
}
