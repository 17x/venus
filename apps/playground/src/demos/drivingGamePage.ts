import {createEngine, type EngineRuntimeWorldAgentState} from '@venus/engine'
import {createInitialDrivingGameState, DEFAULT_DRIVING_GAME_CONFIG, type DrivingGameConfig, type DrivingGameState} from './drivingGameTypes'
import {buildDrivingGameScene, convertCityObstaclesToCollisionBlocks, createDrivingGameModelAssets, createDrivingGameModelInstances, resolveDrivingGameSunDirection} from './drivingGameScene'
import {generateCityWorldMap} from './cityWorldGenerator'
import {loadDrivingGameFixture} from './drivingGameFixture'

const STAGE_W = 720, STAGE_H = 460
let currentState: DrivingGameState | null = null
let onDrivingConfigChange: (() => void) | null = null

type DrivingGameCollisionEngine = Pick<ReturnType<typeof createEngine>, 'runtime'>

export type DrivingGameWeatherEnvironmentInput = {
  cloudCover: number
  precipitation: number
  fogDensity: number
}

export type DrivingGameLampLight = {
  id: string
  type: 'point'
  color: string
  intensity: number
  positionX: number
  positionY: number
  positionZ: number
  distance: number
  decay: number
}

export const resolveDrivingGameWeatherEnvironmentInput = (
  weather: DrivingGameConfig['weather'],
): DrivingGameWeatherEnvironmentInput => {
  if (weather === 'cloudy') {
    return {cloudCover: 0.75, precipitation: 0, fogDensity: 0.06}
  }
  if (weather === 'rainy') {
    return {cloudCover: 0.88, precipitation: 0.85, fogDensity: 0.28}
  }
  if (weather === 'foggy') {
    return {cloudCover: 0.66, precipitation: 0, fogDensity: 0.9}
  }
  return {cloudCover: 0.1, precipitation: 0, fogDensity: 0.06}
}

export const resolveDrivingGameLampLights = (input: {
  lamps: DrivingGameState['cityMap']['lamps']
  timeOfDayHours: number
  weather: DrivingGameConfig['weather']
}): DrivingGameLampLight[] => {
  const weatherEnvironment = resolveDrivingGameWeatherEnvironmentInput(input.weather)
  const sunOrbit = ((input.timeOfDayHours - 6) / 24) * Math.PI * 2
  const dayFactor = Math.max(0.05, Math.min(1.15, (Math.sin(sunOrbit) + 0.15) / 1.15))
  if (dayFactor >= 0.28 && weatherEnvironment.fogDensity <= 0.35) {
    return []
  }
  return input.lamps.slice(0, 42).map((lamp) => ({
    id: `lamp-light-${lamp.id}`,
    type: 'point',
    color: '#fde68a',
    intensity: 0.55,
    positionX: lamp.x,
    positionY: lamp.h + 1.2,
    positionZ: lamp.z,
    distance: 120,
    decay: 2,
  }))
}

export type DrivingGameVehicleProfile = {
  mass: number
  acceleration: number
  maxSpeed: number
  radius: number
  brakeDeceleration: number
  drag: number
}

export const DRIVING_GAME_VEHICLE_PROFILES: Record<DrivingGameConfig['vehicleType'], DrivingGameVehicleProfile> = {
  sedan: {mass: 1.2, acceleration: 22, maxSpeed: 9.2, radius: 5.2, brakeDeceleration: 34, drag: 4},
  sport: {mass: 1.05, acceleration: 32, maxSpeed: 12, radius: 5, brakeDeceleration: 40, drag: 3.2},
  suv: {mass: 1.35, acceleration: 20, maxSpeed: 8.5, radius: 5.6, brakeDeceleration: 38, drag: 4.8},
  truck: {mass: 1.8, acceleration: 14, maxSpeed: 6.8, radius: 6.2, brakeDeceleration: 46, drag: 6.4},
}

type DrivingGameVehicleTuning = Pick<DrivingGameConfig, 'carSpeed' | 'carAcceleration' | 'carBrakeDeceleration' | 'carDrag'>

export const resolveDrivingGameVehicleProfile = (
  type: DrivingGameConfig['vehicleType'],
  tuning: DrivingGameVehicleTuning = DEFAULT_DRIVING_GAME_CONFIG,
): DrivingGameVehicleProfile => {
  const base = DRIVING_GAME_VEHICLE_PROFILES[type] ?? DRIVING_GAME_VEHICLE_PROFILES.sedan
  return {
    mass: base.mass,
    acceleration: base.acceleration * (tuning.carAcceleration / DEFAULT_DRIVING_GAME_CONFIG.carAcceleration),
    maxSpeed: base.maxSpeed * (tuning.carSpeed / DEFAULT_DRIVING_GAME_CONFIG.carSpeed),
    radius: base.radius,
    brakeDeceleration: base.brakeDeceleration * (tuning.carBrakeDeceleration / DEFAULT_DRIVING_GAME_CONFIG.carBrakeDeceleration),
    drag: base.drag * (tuning.carDrag / DEFAULT_DRIVING_GAME_CONFIG.carDrag),
  }
}

export type DrivingGameVehicleVelocityStepInput = {
  vehicle: DrivingGameVehicleProfile
  deltaSeconds: number
  velocityX: number
  velocityY: number
  wishX: number
  wishY: number
  braking: boolean
}

export const resolveDrivingGameVehicleVelocityStep = (input: DrivingGameVehicleVelocityStepInput) => {
  let velocityX = input.velocityX
  let velocityY = input.velocityY

  if (input.wishX !== 0 || input.wishY !== 0) {
    velocityX += input.wishX * input.vehicle.acceleration * input.deltaSeconds
    velocityY += input.wishY * input.vehicle.acceleration * input.deltaSeconds
  } else {
    const drag = Math.max(0, 1 - (input.vehicle.drag / input.vehicle.mass) * input.deltaSeconds)
    velocityX *= drag
    velocityY *= drag
  }

  if (input.braking) {
    const brakeFactor = Math.max(0, 1 - (input.vehicle.brakeDeceleration / input.vehicle.mass) * input.deltaSeconds * 0.1)
    velocityX *= brakeFactor
    velocityY *= brakeFactor
  }

  const speed = Math.hypot(velocityX, velocityY)
  if (speed > input.vehicle.maxSpeed) {
    const clamp = input.vehicle.maxSpeed / speed
    velocityX *= clamp
    velocityY *= clamp
  }

  return {velocityX, velocityY, speed: Math.hypot(velocityX, velocityY)}
}

export type DrivingGameNpcMovementStepInput = {
  engine: DrivingGameCollisionEngine
  deltaSeconds: number
  npcCars: DrivingGameState['npcCars']
  pedestrians: DrivingGameState['pedestrians']
  carPath: DrivingGameState['cityMap']['carPath']
  pedestrianPath: DrivingGameState['cityMap']['pedestrianPath']
}

export const resolveDrivingGameNpcMovementStep = (input: DrivingGameNpcMovementStepInput) => {
  input.engine.runtime.navigation.setAgents([
    ...input.npcCars.map((npc) => ({
      id: npc.id,
      kind: 'car' as const,
      x: npc.x,
      z: npc.z,
      yaw: npc.yaw,
      pathIndex: npc.pathIndex,
      speed: npc.speed,
    })),
    ...input.pedestrians.map((ped) => ({
      id: ped.id,
      kind: 'pedestrian' as const,
      x: ped.x,
      z: ped.z,
      yaw: ped.yaw,
      pathIndex: ped.pathIndex,
      speed: ped.speed,
    })),
  ])
  const steppedAgents = input.engine.runtime.navigation.stepAgents({
    deltaSeconds: input.deltaSeconds,
    carPath: input.carPath.map((node) => ({x: node.x, z: node.z})),
    pedestrianPath: input.pedestrianPath.map((node) => ({x: node.x, z: node.z})),
  })
  const steppedCars = steppedAgents.filter((agent) => agent.kind === 'car')
  const steppedPeds = steppedAgents.filter((agent) => agent.kind === 'pedestrian')
  return {
    agents: steppedAgents,
    npcCars: input.npcCars.map((npc) => {
      const next = steppedCars.find((agent) => agent.id === npc.id)
      if (!next) return npc
      return {...npc, x: next.x, z: next.z, yaw: next.yaw, pathIndex: next.pathIndex}
    }),
    pedestrians: input.pedestrians.map((ped) => {
      const next = steppedPeds.find((agent) => agent.id === ped.id)
      if (!next) return ped
      return {...ped, x: next.x, z: next.z, yaw: next.yaw, pathIndex: next.pathIndex}
    }),
  }
}

export type DrivingGameMiniMapProjectionInput = {
  width: number
  height: number
  mapSize: number
  miniMapZoomLevel: DrivingGameConfig['miniMapZoomLevel']
  cameraAzimuth: number
  x: number
  z: number
}

export const projectDrivingGameMiniMapPoint = (input: DrivingGameMiniMapProjectionInput) => {
  const padding = 14
  const half = input.mapSize * 0.5
  const zoomScale = input.miniMapZoomLevel === 0 ? 1.45 : input.miniMapZoomLevel === 2 ? 0.72 : 1
  const scale = ((Math.min(input.width, input.height) * 0.5 - padding) / Math.max(1, half)) * zoomScale
  const rotation = (-input.cameraAzimuth * Math.PI) / 180
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)
  const rotatedX = input.x * cos - input.z * sin
  const rotatedZ = input.x * sin + input.z * cos
  return {
    x: input.width * 0.5 + rotatedX * scale,
    y: input.height * 0.5 + rotatedZ * scale,
  }
}

export type DrivingGameMiniMapNorthIndicatorInput = {
  width: number
  cameraAzimuth: number
}

export const resolveDrivingGameMiniMapNorthIndicator = (input: DrivingGameMiniMapNorthIndicatorInput) => {
  const centerX = input.width - 20
  const centerY = 28
  const length = 14
  const rotation = (-input.cameraAzimuth * Math.PI) / 180
  return {
    centerX,
    centerY,
    endX: centerX + Math.sin(rotation) * length,
    endY: centerY - Math.cos(rotation) * length,
    labelX: input.width - 24,
    labelY: 50,
  }
}

export type DrivingGamePlayerCollisionStepInput = {
  engine: DrivingGameCollisionEngine
  fromX: number
  fromZ: number
  toX: number
  toZ: number
  radius: number
  velocityX: number
  velocityZ: number
  maxStepDistance?: number
}

export const resolveDrivingGamePlayerCollisionStep = (input: DrivingGamePlayerCollisionStepInput) => {
  const radius = Math.max(0, input.radius)
  const distance = Math.hypot(input.toX - input.fromX, input.toZ - input.fromZ)
  const maxStepDistance = Math.max(1, input.maxStepDistance ?? Math.max(1, radius * 0.5))
  const stepCount = Math.max(1, Math.ceil(distance / maxStepDistance))
  let x = input.fromX
  let z = input.fromZ
  let velocityX = input.velocityX
  let velocityZ = input.velocityZ
  let collided = false

  for (let stepIndex = 1; stepIndex <= stepCount; stepIndex += 1) {
    const nextX = input.fromX + ((input.toX - input.fromX) * stepIndex) / stepCount
    const nextZ = input.fromZ + ((input.toZ - input.fromZ) * stepIndex) / stepCount
    const resolved = input.engine.runtime.collision.resolve({
      x: nextX,
      z: nextZ,
      radius,
      velocityX,
      velocityZ,
    })
    x = resolved.x
    z = resolved.z
    velocityX = resolved.velocityX
    velocityZ = resolved.velocityZ
    if (resolved.collided) {
      collided = true
      break
    }
  }

  return {x, z, velocityX, velocityZ, collided}
}

function renderSettings(container: HTMLElement, state: DrivingGameState) {
  const {config} = state
  const chk = (l: string, k: keyof DrivingGameConfig) =>
    `<label class="setting-row"><span>${l}</span><input type="checkbox"${config[k] ? ' checked' : ''} data-s="${k}"/></label>`
  const rng = (l: string, k: keyof DrivingGameConfig, min: number, max: number, step: number) =>
    `<label class="setting-row"><span>${l}: ${(config[k] as number).toFixed(1)}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${config[k]}" data-s="${k}"/></label>`
  container.innerHTML = [
    chk('Show FPS', 'showFps'),
    chk('Camera Lock', 'cameraLock'),
    chk('Ground Grid', 'worldGridEnabled'),
    chk('Light Rig', 'lightRigEnabled'),
    chk('Auto Time', 'timeFlowEnabled'),
    chk('Collision', 'collisionEnabled'),
    chk('Weather FX', 'weatherParticlesEnabled'),
    chk('Shadows', 'shadowsEnabled'),
    chk('Antialias', 'antialiasEnabled'),
    chk('Vsync', 'vsyncEnabled'),
    rng('Zoom', 'cameraDistance', 0.5, 3, 0.1),
    rng('Polar', 'cameraPolar', 15, 80, 1),
    rng('Target Height', 'cameraTargetHeight', -10, 40, 1),
    rng('FOV', 'cameraFovY', 30, 100, 1),
    rng('Near', 'cameraNear', 0.2, 4, 0.1),
    rng('Far', 'cameraFar', 600, 3200, 50),
    rng('Orbit Sens', 'cameraOrbitSensitivity', 0.05, 0.8, 0.01),
    rng('Zoom Sens', 'cameraZoomSensitivity', 0.0001, 0.002, 0.0001),
    rng('Q/E Orbit Speed', 'cameraOrbitKeyboardSpeed', 20, 200, 2),
    rng('Move Speed', 'carSpeed', 2, 30, 0.5),
    rng('Acceleration', 'carAcceleration', 4, 60, 1),
    rng('Brake', 'carBrakeDeceleration', 8, 80, 1),
    rng('Drag', 'carDrag', 0.5, 10, 0.1),
    rng('Turn Speed', 'carTurnSpeed', 60, 360, 5),
    rng('Map Size', 'mapSize', 240, 900, 10),
    rng('Grid Step', 'worldGridStep', 8, 72, 1),
    rng('Grid Thickness', 'worldGridThickness', 0.2, 3, 0.1),
    rng('Dir Light', 'lightDirectionalIntensity', 0, 2.5, 0.05),
    rng('Ambient', 'lightAmbientIntensity', 0, 0.8, 0.02),
    rng('Direction', 'directionDeg', 0, 359, 1),
    rng('Time', 'timeOfDayHours', 0, 23.9, 0.1),
    rng('Time Speed', 'timeFlowRate', 0, 3, 0.05),
    `<label class="setting-row"><span>Weather</span><select data-select="weather"><option value="sunny"${config.weather === 'sunny' ? ' selected' : ''}>sunny</option><option value="cloudy"${config.weather === 'cloudy' ? ' selected' : ''}>cloudy</option><option value="rainy"${config.weather === 'rainy' ? ' selected' : ''}>rainy</option><option value="foggy"${config.weather === 'foggy' ? ' selected' : ''}>foggy</option></select></label>`,
    `<label class="setting-row"><span>Vehicle</span><select data-select="vehicleType"><option value="sedan"${config.vehicleType === 'sedan' ? ' selected' : ''}>sedan</option><option value="sport"${config.vehicleType === 'sport' ? ' selected' : ''}>sport</option><option value="suv"${config.vehicleType === 'suv' ? ' selected' : ''}>suv</option><option value="truck"${config.vehicleType === 'truck' ? ' selected' : ''}>truck</option></select></label>`,
    `<label class="setting-row"><span>MiniMap Zoom</span><select data-select="miniMapZoomLevel"><option value="0"${config.miniMapZoomLevel === 0 ? ' selected' : ''}>near</option><option value="1"${config.miniMapZoomLevel === 1 ? ' selected' : ''}>mid</option><option value="2"${config.miniMapZoomLevel === 2 ? ' selected' : ''}>far</option></select></label>`,
    '<div class="setting-status">',
    `<p>Speed: ${state.speed.toFixed(1)}</p>`,
    `<p>Vx: ${state.velocityX.toFixed(2)} / Vy: ${state.velocityY.toFixed(2)}</p>`,
    `<p>X: ${state.carX.toFixed(0)} / Y: ${state.carY.toFixed(0)}</p>`,
    `<p>Yaw: ${state.carYaw.toFixed(0)}°</p>`,
    `<p>Time: ${state.config.timeOfDayHours.toFixed(1)}h / Weather: ${state.config.weather}</p>`,
    '</div>',
    '<div class="hint"><p>WASD / Arrows: Move (Camera Relative)</p><p>Q / E: Orbit Azimuth</p><p>Space: Brake</p><p>Drag: Left/Right Azimuth, Up/Down Polar</p><p>Wheel: Zoom</p></div>',
  ].join('')
  container.querySelectorAll<HTMLInputElement>('[data-s]').forEach((el) => {
    const key = el.dataset.s as keyof DrivingGameConfig
    const handler = () => {
      if (!currentState) return
      if (el.type === 'checkbox') (currentState.config as unknown as Record<string, unknown>)[key] = el.checked
      else (currentState.config as unknown as Record<string, unknown>)[key] = parseFloat(el.value)
      if (key === 'mapSize') {
        currentState.cityMap = generateCityWorldMap(currentState.config.mapSize, currentState.config.mapSeed)
      }
      onDrivingConfigChange?.()
      renderSettings(container, currentState)
    }
    el.addEventListener('input', handler)
    el.addEventListener('change', handler)
  })
  container.querySelectorAll<HTMLSelectElement>('[data-select="vehicleType"]').forEach((el) => {
    el.addEventListener('change', () => {
      if (!currentState) return
      currentState.config.vehicleType = el.value as DrivingGameConfig['vehicleType']
      renderSettings(container, currentState)
    })
  })
  container.querySelectorAll<HTMLSelectElement>('[data-select="weather"]').forEach((el) => {
    el.addEventListener('change', () => {
      if (!currentState) return
      currentState.config.weather = el.value as DrivingGameConfig['weather']
      onDrivingConfigChange?.()
      renderSettings(container, currentState)
    })
  })
  container.querySelectorAll<HTMLSelectElement>('[data-select="miniMapZoomLevel"]').forEach((el) => {
    el.addEventListener('change', () => {
      if (!currentState) return
      currentState.config.miniMapZoomLevel = Number.parseInt(el.value, 10) as DrivingGameConfig['miniMapZoomLevel']
      renderSettings(container, currentState)
    })
  })
}

export async function tryMountDrivingGamePage(): Promise<boolean> {
  if (window.location.hash.replace('#', '') !== '/driving-game') return false
  await mount()
  return true
}

async function mount() {
  const root = document.getElementById('root')!
  root.innerHTML = `
    <div class="dg">
      <div class="lo" id="lo">
        <div class="lb"><h2>Loading</h2><div class="pb"><div class="pf" id="pf"></div></div><p id="lt">Initializing...</p></div>
      </div>
      <div class="gl">
        <div class="cp">
          <canvas id="gc" class="gc"></canvas>
          <div id="weather-haze" style="position:absolute;inset:0;pointer-events:none"></div>
          <canvas id="mm" width="180" height="180" style="position:absolute;left:10px;bottom:10px;width:180px;height:180px;background:rgba(5,10,20,.72);border:1px solid rgba(148,163,184,.45);border-radius:10px"></canvas>
          <div class="fps" id="fc">FPS: --</div>
          <div id="db" style="position:absolute;bottom:4px;left:4px;color:#0f0;font:11px monospace;background:rgba(0,0,0,0.7);padding:2px 6px">...</div>
        </div>
        <div class="sp">
          <h3>Settings</h3>
          <div id="sc"></div>
        </div>
      </div>
    </div>`

  const canvas = root.querySelector<HTMLCanvasElement>('#gc')!
  const fpsEl = root.querySelector<HTMLDivElement>('#fc')!
  const miniMapCanvas = root.querySelector<HTMLCanvasElement>('#mm')!
  const weatherHaze = root.querySelector<HTMLDivElement>('#weather-haze')!
  const dbEl = root.querySelector<HTMLDivElement>('#db')!
  const overlay = root.querySelector<HTMLDivElement>('#lo')!
  const progressFill = root.querySelector<HTMLDivElement>('#pf')!
  const progressLabel = root.querySelector<HTMLParagraphElement>('#lt')!
  const settingsContainer = root.querySelector<HTMLDivElement>('#sc')!

  canvas.width = STAGE_W
  canvas.height = STAGE_H

  const updateProgress = (pct: number, text: string) => {
    progressFill.style.width = `${pct}%`
    progressLabel.textContent = text
  }

  updateProgress(5, 'Loading S10 fixture...')
  const fixture = await loadDrivingGameFixture()
  const state = createInitialDrivingGameState(fixture)
  currentState = state

  const engine = createEngine({
    surface: {
      width: STAGE_W, height: STAGE_H,
      canvas: {
        width: canvas.width, height: canvas.height,
        getContext: (ctxId: '2d' | 'webgl' | 'webgl2') => {
          if (ctxId === '2d') return canvas.getContext('2d')
          if (ctxId === 'webgl') return canvas.getContext('webgl')
          return canvas.getContext('webgl2')
        },
      },
    },
    backend: 'webgl',
    strict3d: true,
  })
  const syncRuntimeWorld = () => {
    engine.runtime.world.setOpenWorldMap({
      mapSize: state.cityMap.mapSize,
      obstacles: state.cityMap.blockers.map((obstacle) => ({
        id: obstacle.id,
        x: obstacle.cx,
        z: obstacle.cz,
        width: obstacle.w,
        depth: obstacle.d,
      })),
    })
    engine.runtime.collision.setObstacles(state.cityMap.blockers.map((obstacle) => ({
      id: obstacle.id,
      x: obstacle.cx,
      z: obstacle.cz,
      width: obstacle.w,
      depth: obstacle.d,
    })))
    const agents: EngineRuntimeWorldAgentState[] = [
      ...state.npcCars.map((npc) => ({
        id: npc.id,
        kind: 'car' as const,
        x: npc.x,
        z: npc.z,
        yaw: npc.yaw,
        pathIndex: npc.pathIndex,
        speed: npc.speed,
      })),
      ...state.pedestrians.map((ped) => ({
        id: ped.id,
        kind: 'pedestrian' as const,
        x: ped.x,
        z: ped.z,
        yaw: ped.yaw,
        pathIndex: ped.pathIndex,
        speed: ped.speed,
      })),
    ]
    engine.runtime.navigation.setAgents(agents)
  }

  const syncRuntimeLighting = () => {
    const weatherEnvironment = resolveDrivingGameWeatherEnvironmentInput(state.config.weather)
    if (!state.config.lightRigEnabled) {
      engine.runtime.lighting.clearCollection()
      return
    }
    const resolvedEnvironment = engine.runtime.lighting.applyEnvironment({
      timeOfDayHours: state.config.timeOfDayHours,
      directionDeg: state.config.directionDeg,
      cloudCover: weatherEnvironment.cloudCover,
      precipitation: weatherEnvironment.precipitation,
      fogDensity: weatherEnvironment.fogDensity,
      directionalIntensity: state.config.lightDirectionalIntensity,
      ambientIntensity: state.config.lightAmbientIntensity,
      additionalLights: resolveDrivingGameLampLights({
        lamps: state.cityMap.lamps,
        timeOfDayHours: state.config.timeOfDayHours,
        weather: state.config.weather,
      }),
    })
    weatherHaze.style.background = `linear-gradient(rgba(255,255,255,0), ${hexToRgba(resolvedEnvironment.atmosphere.hazeColor, resolvedEnvironment.atmosphere.hazeOpacity)})`
  }
  const syncRuntimeModels = () => {
    for (const asset of createDrivingGameModelAssets()) {
      engine.runtime.model.registerAsset(asset)
    }
    const diagnostics = engine.runtime.model.setInstances(createDrivingGameModelInstances(state))
    dbEl.dataset.runtimeModelRegisteredModelCount = String(diagnostics.registeredModelCount)
    dbEl.dataset.runtimeModelInstanceCount = String(diagnostics.instanceCount)
    dbEl.dataset.runtimeModelInstancedModelCount = String(diagnostics.instancedModelCount)
    dbEl.dataset.runtimeModelLodResolvedInstanceCount = String(diagnostics.lodResolvedInstanceCount)
    dbEl.dataset.runtimeModelMissingModelInstanceCount = String(diagnostics.missingModelInstanceCount)
  }
  onDrivingConfigChange = () => {
    syncRuntimeWorld()
    syncRuntimeLighting()
    syncRuntimeModels()
  }

  const refreshMaterialTextureDiagnostics = () => {
    const backend = (engine.getDiagnostics().backendDiagnostics as Record<string, unknown> | undefined) ?? undefined
    dbEl.dataset.webglMaterialTextureCandidateCount = String(backend?.webglNativeMaterialTextureCandidateCount ?? 0)
    dbEl.dataset.webglMaterialTextureUvReadyCount = String(backend?.webglNativeMaterialTextureUvReadyCount ?? 0)
    dbEl.dataset.webglMaterialTextureBindingCount = String(backend?.webglNativeMaterialTextureBindingCount ?? 0)
    const uploadBytes = Number(backend?.webglNativeMaterialTextureUploadBytes ?? 0)
    const uploadBytesMax = Math.max(Number(dbEl.dataset.webglMaterialTextureUploadBytesMax ?? 0), uploadBytes)
    dbEl.dataset.webglMaterialTextureUploadBytes = String(uploadBytes)
    dbEl.dataset.webglMaterialTextureUploadBytesMax = String(uploadBytesMax)
    dbEl.dataset.webglMaterialTextureCacheHitCount = String(backend?.webglNativeMaterialTextureCacheHitCount ?? 0)
    dbEl.dataset.webglMaterialTextureCacheMissCount = String(backend?.webglNativeMaterialTextureCacheMissCount ?? 0)
    const cacheHitCount = Number(backend?.webglNativeMaterialTextureCacheHitCount ?? 0)
    if (cacheHitCount > 0 && uploadBytes > 0) {
      dbEl.dataset.webglMaterialTextureDecodedUploadObserved = 'true'
    }
    dbEl.dataset.webglMaterialTextureFallbackReason = String(backend?.webglNativeMaterialTextureFallbackReason ?? 'none')
  }

  const syncRuntimeAuthoringGraph = (graph: {revision?: number; nodes: Array<Record<string, unknown>>; materials?: Array<Record<string, unknown>>}) => {
    const revision = Number(graph.revision ?? 1)
    const authoring = engine.runtime.authoring.createGraphSnapshot({
      graphId: 's10-driving-game',
      role: 'authoring',
      revision,
      nodes: graph.nodes,
      materials: graph.materials ?? [],
    })
    const runtime = engine.runtime.authoring.createGraphSnapshot({
      graphId: 's10-driving-game',
      role: 'runtime',
      revision,
      nodes: graph.nodes,
      materials: graph.materials ?? [],
    })
    const comparison = engine.runtime.authoring.compareGraphSnapshots({authoring: authoring.snapshotId, runtime: runtime.snapshotId})
    const preview = engine.runtime.authoring.createPreviewToken({scope: 's10-driving-game', snapshot: runtime.snapshotId, stepIndex: revision})
    dbEl.dataset.runtimeAuthoringMatching = String(comparison.matching)
    dbEl.dataset.runtimeAuthoringAddedNodeCount = String(comparison.addedNodeIds.length)
    dbEl.dataset.runtimeAuthoringRemovedNodeCount = String(comparison.removedNodeIds.length)
    dbEl.dataset.runtimeAuthoringPreviewStepIndex = String(preview.stepIndex)
  }

  updateProgress(10, `Canvas: ${STAGE_W}×${STAGE_H}`)
  await delay(100)

  syncRuntimeWorld()
  syncRuntimeModels()
  const initialGraph = buildDrivingGameScene(state)
  syncRuntimeAuthoringGraph(initialGraph)
  engine.setGraph(initialGraph as any)
  syncRuntimeLighting()
  updateProgress(40, 'Graph set')
  await delay(100)

  await engine.render()
  refreshMaterialTextureDiagnostics()
  const stats = engine.getStats()
  updateProgress(90, `Draw: ${stats.lastExecutionDrawCount ?? 0}`)
  await delay(300)

  overlay.style.display = 'none'
  renderSettings(settingsContainer, state)

  let lastFrame = performance.now()
  let frameCount = 0
  let fpsTimer = lastFrame
  let orbitDragging = false
  let orbitPointerId: number | null = null
  let lastPointerX = 0
  let lastPointerY = 0

  const loop = () => {
    if (state.paused) { requestAnimationFrame(loop); return }

    const now = performance.now()
    const dt = Math.min((now - lastFrame) / 1000, 0.1)
    lastFrame = now

    updateGame(state, dt, engine)
    if (state.config.timeFlowEnabled) {
      state.config.timeOfDayHours = (state.config.timeOfDayHours + dt * state.config.timeFlowRate) % 24
      if (state.config.timeOfDayHours < 0) state.config.timeOfDayHours += 24
    }
    syncRuntimeLighting()
    syncRuntimeModels()
    const graph = buildDrivingGameScene(state)
    syncRuntimeAuthoringGraph(graph)
    engine.setGraph(graph as any)
    void engine.render().then(() => {
      refreshMaterialTextureDiagnostics()
    })
    drawMiniMap(miniMapCanvas, state)

    frameCount++
    if (now - fpsTimer >= 500) {
      if (state.config.showFps) fpsEl.textContent = `FPS: ${Math.round(frameCount / ((now - fpsTimer) / 1000))}`
      const s = engine.getStats()
      const backend = (engine.getDiagnostics().backendDiagnostics as Record<string, unknown> | undefined) ?? undefined
      const meshSubmitted = backend && typeof backend.webglNativeMeshSubmittedCount === 'number'
        ? String(backend.webglNativeMeshSubmittedCount)
        : '?'
      dbEl.textContent = `draw:${s.lastExecutionDrawCount ?? '?'} mesh:${meshSubmitted} models:${engine.runtime.model.getDiagnostics().instanceCount} parity:${dbEl.dataset.runtimeAuthoringMatching ?? 'false'} lights:${engine.runtime.lighting.getCollection().lights.length} zoom:${state.config.cameraDistance.toFixed(1)} time:${state.config.timeOfDayHours.toFixed(1)}`
      frameCount = 0; fpsTimer = now
    }
    requestAnimationFrame(loop)
  }

  const onKD = (ev: KeyboardEvent) => state.keysDown.add(ev.key.toLowerCase())
  const onKU = (ev: KeyboardEvent) => state.keysDown.delete(ev.key.toLowerCase())
  window.addEventListener('keydown', onKD)
  window.addEventListener('keyup', onKU)

  canvas.addEventListener('wheel', (ev) => {
    ev.preventDefault()
    state.config.cameraDistance = Math.max(0.3, Math.min(3, state.config.cameraDistance + ev.deltaY * state.config.cameraZoomSensitivity))
    renderSettings(settingsContainer, state)
  }, {passive: false})

  canvas.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0) return
    orbitDragging = true
    orbitPointerId = ev.pointerId
    lastPointerX = ev.clientX
    lastPointerY = ev.clientY
    canvas.setPointerCapture(ev.pointerId)
  })

  canvas.addEventListener('pointermove', (ev) => {
    if (!orbitDragging || orbitPointerId !== ev.pointerId) return
    const dx = ev.clientX - lastPointerX
    const dy = ev.clientY - lastPointerY
    lastPointerX = ev.clientX
    lastPointerY = ev.clientY
    state.cameraAzimuth += dx * state.config.cameraOrbitSensitivity
    state.config.cameraPolar = Math.max(
      15,
      Math.min(80, state.config.cameraPolar + dy * state.config.cameraOrbitSensitivity * 0.8),
    )
  })

  const stopOrbitDrag = (ev: PointerEvent) => {
    if (orbitPointerId !== ev.pointerId) return
    orbitDragging = false
    orbitPointerId = null
    canvas.releasePointerCapture(ev.pointerId)
  }
  canvas.addEventListener('pointerup', stopOrbitDrag)
  canvas.addEventListener('pointercancel', stopOrbitDrag)

  window.addEventListener('beforeunload', () => {
    window.removeEventListener('keydown', onKD)
    window.removeEventListener('keyup', onKU)
    onDrivingConfigChange = null
    engine.dispose()
  })

  requestAnimationFrame(loop)
}

function updateGame(state: DrivingGameState, dt: number, engine: ReturnType<typeof createEngine>) {
  const {keysDown, config} = state
  const vehicle = resolveDrivingGameVehicleProfile(config.vehicleType, config)
  let mx = 0, my = 0
  if (keysDown.has('w') || keysDown.has('arrowup')) my = 1
  if (keysDown.has('s') || keysDown.has('arrowdown')) my = -1
  if (keysDown.has('a') || keysDown.has('arrowleft')) mx = 1
  if (keysDown.has('d') || keysDown.has('arrowright')) mx = -1

  let wishX = 0
  let wishY = 0
  if (mx !== 0 || my !== 0) {
    const len = Math.sqrt(mx * mx + my * my)
    mx /= len; my /= len
    const cameraYawRad = (state.cameraAzimuth * Math.PI) / 180
    const forwardX = -Math.sin(cameraYawRad)
    const forwardY = -Math.cos(cameraYawRad)
    const rightX = Math.cos(cameraYawRad)
    const rightY = -Math.sin(cameraYawRad)
    wishX = forwardX * my + rightX * mx
    wishY = forwardY * my + rightY * mx
  }

  const velocityStep = resolveDrivingGameVehicleVelocityStep({
    vehicle,
    deltaSeconds: dt,
    velocityX: state.velocityX,
    velocityY: state.velocityY,
    wishX,
    wishY,
    braking: keysDown.has(' '),
  })
  state.velocityX = velocityStep.velocityX
  state.velocityY = velocityStep.velocityY

  const nextCarX = state.carX + state.velocityX * dt
  const nextCarY = state.carY + state.velocityY * dt
  state.speed = Math.hypot(state.velocityX, state.velocityY)
  const agentStep = resolveDrivingGameNpcMovementStep({
    engine,
    deltaSeconds: dt,
    npcCars: state.npcCars,
    pedestrians: state.pedestrians,
    carPath: state.cityMap.carPath,
    pedestrianPath: state.cityMap.pedestrianPath,
  })
  state.npcCars = agentStep.npcCars
  state.pedestrians = agentStep.pedestrians

  if (keysDown.has('q')) state.cameraAzimuth -= config.cameraOrbitKeyboardSpeed * dt
  if (keysDown.has('e')) state.cameraAzimuth += config.cameraOrbitKeyboardSpeed * dt

  if (state.speed > 0.02) {
    const targetYaw = (Math.atan2(state.velocityX, -state.velocityY) * 180) / Math.PI
    let deltaYaw = targetYaw - state.carYaw
    while (deltaYaw > 180) deltaYaw -= 360
    while (deltaYaw < -180) deltaYaw += 360
    const maxTurn = config.carTurnSpeed * dt
    if (deltaYaw > maxTurn) deltaYaw = maxTurn
    if (deltaYaw < -maxTurn) deltaYaw = -maxTurn
    state.carYaw += deltaYaw
  }

  const half = state.config.mapSize / 2 - 5
  if (config.collisionEnabled) {
    const resolved = resolveDrivingGamePlayerCollisionStep({
      engine,
      fromX: state.carX,
      fromZ: state.carY,
      toX: nextCarX,
      toZ: nextCarY,
      radius: vehicle.radius,
      velocityX: state.velocityX,
      velocityZ: state.velocityY,
    })
    state.carX = resolved.x
    state.carY = resolved.z
    state.velocityX = resolved.velocityX
    state.velocityY = resolved.velocityZ
  } else {
    state.carX = nextCarX
    state.carY = nextCarY
  }
  state.carX = Math.max(-half, Math.min(half, state.carX))
  state.carY = Math.max(-half, Math.min(half, state.carY))
}

function delay(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)) }

function drawMiniMap(canvas: HTMLCanvasElement, state: DrivingGameState) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const w = canvas.width
  const h = canvas.height
  const cx = w * 0.5
  const cy = h * 0.5
  const half = state.config.mapSize * 0.5
  const toMap = (x: number, z: number) => {
    return projectDrivingGameMiniMapPoint({
      width: w,
      height: h,
      mapSize: state.config.mapSize,
      miniMapZoomLevel: state.config.miniMapZoomLevel,
      cameraAzimuth: state.cameraAzimuth,
      x,
      z,
    })
  }

  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = 'rgba(15,23,42,0.92)'
  ctx.fillRect(0, 0, w, h)

  ctx.strokeStyle = 'rgba(148,163,184,0.65)'
  ctx.lineWidth = 1
  ctx.strokeRect(8, 8, w - 16, h - 16)

  const c0 = toMap(-half, -half)
  const c1 = toMap(half, -half)
  const c2 = toMap(half, half)
  const c3 = toMap(-half, half)
  ctx.strokeStyle = 'rgba(56,189,248,0.75)'
  ctx.beginPath()
  ctx.moveTo(c0.x, c0.y); ctx.lineTo(c1.x, c1.y); ctx.lineTo(c2.x, c2.y); ctx.lineTo(c3.x, c3.y); ctx.closePath()
  ctx.stroke()

  const north = resolveDrivingGameMiniMapNorthIndicator({width: w, cameraAzimuth: state.cameraAzimuth})
  ctx.fillStyle = 'rgba(15,23,42,0.78)'
  ctx.fillRect(w - 36, 10, 28, 46)
  ctx.strokeStyle = '#f8fafc'
  ctx.fillStyle = '#f8fafc'
  ctx.beginPath()
  ctx.moveTo(north.centerX, north.centerY)
  ctx.lineTo(north.endX, north.endY)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(north.endX, north.endY, 3, 0, Math.PI * 2)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#cbd5e1'
  ctx.font = '10px monospace'
  ctx.fillText('N', north.labelX, north.labelY)

  const cityBlocks = convertCityObstaclesToCollisionBlocks(state.cityMap.blockers)
  ctx.fillStyle = 'rgba(30,41,59,0.92)'
  for (const block of cityBlocks) {
    const a = toMap(block.cx - block.w * 0.5, block.cz - block.d * 0.5)
    const b = toMap(block.cx + block.w * 0.5, block.cz - block.d * 0.5)
    const c = toMap(block.cx + block.w * 0.5, block.cz + block.d * 0.5)
    const d = toMap(block.cx - block.w * 0.5, block.cz + block.d * 0.5)
    ctx.beginPath()
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath()
    ctx.fill()
  }

  const car = toMap(state.carX, state.carY)
  const heading = ((state.carYaw - state.cameraAzimuth) * Math.PI) / 180
  ctx.fillStyle = '#ef4444'
  ctx.beginPath()
  ctx.arc(car.x, car.y, 4, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#fca5a5'
  ctx.beginPath()
  ctx.moveTo(car.x, car.y)
  ctx.lineTo(car.x + Math.sin(heading) * 12, car.y - Math.cos(heading) * 12)
  ctx.stroke()

  ctx.fillStyle = '#60a5fa'
  for (const npc of state.npcCars) {
    const p = toMap(npc.x, npc.z)
    ctx.fillRect(p.x - 2, p.y - 2, 4, 4)
  }
  ctx.fillStyle = '#fca5a5'
  for (const ped of state.pedestrians) {
    const p = toMap(ped.x, ped.z)
    ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3)
  }

  const sunAzimuth = resolveDrivingGameSunDirection(state.config).azimuthRad - (state.cameraAzimuth * Math.PI) / 180
  ctx.strokeStyle = '#facc15'
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.lineTo(cx + Math.sin(sunAzimuth) * 24, cy - Math.cos(sunAzimuth) * 24)
  ctx.stroke()
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.trim().replace('#', '')
  const six = normalized.length === 3
    ? normalized.split('').map((ch) => `${ch}${ch}`).join('')
    : normalized.padEnd(6, '0').slice(0, 6)
  const r = Number.parseInt(six.slice(0, 2), 16)
  const g = Number.parseInt(six.slice(2, 4), 16)
  const b = Number.parseInt(six.slice(4, 6), 16)
  const a = Math.max(0, Math.min(1, alpha))
  return `rgba(${r},${g},${b},${a.toFixed(3)})`
}
