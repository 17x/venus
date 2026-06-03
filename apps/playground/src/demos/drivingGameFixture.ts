import type {CityLamp, CityObstacle, CityPathNode, CityProp, CityRoadSegment, CitySidewalkSegment, CityWorldMap} from './cityWorldGenerator'

export const DRIVING_GAME_FIXTURE_URL = '/scenario-fixtures/s10/s10-city-openworld.fixture.json'

type WeatherToken = 'sunny' | 'cloudy' | 'rainy' | 'foggy'
type VehicleToken = 'sedan' | 'sport' | 'suv' | 'truck'

export type DrivingGameFixtureProjection = {
  cityMap: CityWorldMap
  player: {x: number; z: number; yaw: number; vehicleType: VehicleToken}
  npcCars: Array<{id: string; x: number; z: number; yaw: number; speed: number; pathIndex: number}>
  pedestrians: Array<{id: string; x: number; z: number; yaw: number; speed: number; pathIndex: number}>
  configPatch: {
    mapSize: number
    mapSeed: number
    directionDeg: number
    timeOfDayHours: number
    weather: WeatherToken
    weatherParticlesEnabled: boolean
    miniMapZoomLevel: 0 | 1 | 2
    timeFlowEnabled: boolean
    timeFlowRate: number
    collisionEnabled: boolean
    vehicleType: VehicleToken
  }
  cameraAzimuth: number
  previewSeed: number
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const finite = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

const text = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.length > 0 ? value : fallback

const normalizeWeather = (value: unknown): WeatherToken => {
  if (value === 'cloudy' || value === 'rainy' || value === 'foggy') return value
  return 'sunny'
}

const normalizeVehicle = (value: unknown): VehicleToken => {
  if (value === 'sport' || value === 'suv' || value === 'truck') return value
  return 'sedan'
}

const normalizeMiniMapZoom = (value: unknown): 0 | 1 | 2 => {
  if (value === 0 || value === 2) return value
  return 1
}

const normalizeRoad = (value: unknown, index: number): CityRoadSegment => {
  const item = isRecord(value) ? value : {}
  return {
    id: text(item.id, `fixture-road-${index}`),
    cx: finite(item.cx, 0),
    cz: finite(item.cz, 0),
    w: Math.max(1, finite(item.w, 20)),
    d: Math.max(1, finite(item.d, 20)),
    axis: item.axis === 'z' ? 'z' : 'x',
  }
}

const normalizeObstacle = (value: unknown, index: number, idPrefix: string): CityObstacle => {
  const item = isRecord(value) ? value : {}
  return {
    id: text(item.id, `${idPrefix}-${index}`),
    cx: finite(item.cx, 0),
    cz: finite(item.cz, 0),
    w: Math.max(1, finite(item.w, 20)),
    d: Math.max(1, finite(item.d, 20)),
    h: Math.max(1, finite(item.h, 20)),
    color: text(item.color, '#8b9aad'),
  }
}

const normalizeLamp = (value: unknown, index: number): CityLamp => {
  const item = isRecord(value) ? value : {}
  return {
    id: text(item.id, `fixture-lamp-${index}`),
    x: finite(item.x, 0),
    z: finite(item.z, 0),
    h: Math.max(1, finite(item.h, 16)),
  }
}

const normalizeSidewalk = (value: unknown, index: number): CitySidewalkSegment => {
  const item = isRecord(value) ? value : {}
  return {
    id: text(item.id, `fixture-sidewalk-${index}`),
    cx: finite(item.cx, 0),
    cz: finite(item.cz, 0),
    w: Math.max(1, finite(item.w, 20)),
    d: Math.max(1, finite(item.d, 4)),
    axis: item.axis === 'z' ? 'z' : 'x',
  }
}

const normalizeProp = (value: unknown, index: number): CityProp => {
  const item = isRecord(value) ? value : {}
  return {
    id: text(item.id, `fixture-prop-${index}`),
    kind: item.kind === 'bollard' ? 'bollard' : 'planter',
    cx: finite(item.cx, 0),
    cz: finite(item.cz, 0),
    w: Math.max(0.5, finite(item.w, 4)),
    d: Math.max(0.5, finite(item.d, 4)),
    h: Math.max(0.5, finite(item.h, 2.5)),
    color: text(item.color, '#166534'),
  }
}

const normalizePath = (value: unknown): CityPathNode[] => {
  const items = Array.isArray(value) ? value : []
  return items.map((item) => {
    const node = isRecord(item) ? item : {}
    return {x: finite(node.x, 0), z: finite(node.z, 0)}
  })
}

const normalizeAgent = (value: unknown, index: number, idPrefix: string) => {
  const item = isRecord(value) ? value : {}
  return {
    id: text(item.id, `${idPrefix}-${index}`),
    x: finite(item.x, 0),
    z: finite(item.z, 0),
    yaw: finite(item.yaw, 0),
    speed: Math.max(0, finite(item.speed, idPrefix === 'fixture-car' ? 7 : 2)),
    pathIndex: Math.max(0, Math.floor(finite(item.pathIndex, 0))),
  }
}

export const projectDrivingGameFixture = (fixture: unknown): DrivingGameFixtureProjection => {
  if (!isRecord(fixture)) {
    throw new Error('driving game fixture must be an object')
  }
  const world = isRecord(fixture.world) ? fixture.world : {}
  const paths = isRecord(world.paths) ? world.paths : {}
  const player = isRecord(fixture.player) ? fixture.player : {}
  const agents = isRecord(fixture.agents) ? fixture.agents : {}
  const environment = isRecord(fixture.environment) ? fixture.environment : {}
  const defaults = isRecord(fixture.defaults) ? fixture.defaults : {}
  const carPath = normalizePath(paths.car)
  const pedestrianPath = normalizePath(paths.pedestrian)
  const mapSize = Math.max(1, finite(world.mapSize, finite(defaults.mapSize, 400)))
  const previewSeed = Math.max(0, Math.floor(finite(fixture.previewSeed, 0)))

  if (carPath.length < 2 || pedestrianPath.length < 2) {
    throw new Error('driving game fixture requires at least two car and pedestrian path nodes')
  }

  return {
    cityMap: {
      mapSize,
      roads: (Array.isArray(world.roads) ? world.roads : []).map(normalizeRoad),
      buildings: (Array.isArray(world.buildings) ? world.buildings : []).map((item, index) =>
        normalizeObstacle(item, index, 'fixture-building'),
      ),
      blockers: (Array.isArray(world.blockers) ? world.blockers : []).map((item, index) =>
        normalizeObstacle(item, index, 'fixture-blocker'),
      ),
      lamps: (Array.isArray(world.lamps) ? world.lamps : []).map(normalizeLamp),
      sidewalks: (Array.isArray(world.sidewalks) ? world.sidewalks : []).map(normalizeSidewalk),
      props: (Array.isArray(world.props) ? world.props : []).map(normalizeProp),
      carPath,
      pedestrianPath,
    },
    player: {
      x: finite(player.x, 0),
      z: finite(player.z, 0),
      yaw: finite(player.yaw, 0),
      vehicleType: normalizeVehicle(player.vehicleType),
    },
    npcCars: (Array.isArray(agents.cars) ? agents.cars : []).map((item, index) =>
      normalizeAgent(item, index, 'fixture-car'),
    ),
    pedestrians: (Array.isArray(agents.pedestrians) ? agents.pedestrians : []).map((item, index) =>
      normalizeAgent(item, index, 'fixture-ped'),
    ),
    configPatch: {
      mapSize,
      mapSeed: previewSeed,
      directionDeg: finite(environment.directionDeg, 0),
      timeOfDayHours: Math.max(0, Math.min(23.9, finite(environment.timeOfDayHours, 14))),
      weather: normalizeWeather(environment.weather),
      weatherParticlesEnabled: defaults.weatherParticlesEnabled !== false,
      miniMapZoomLevel: normalizeMiniMapZoom(defaults.miniMapZoomLevel),
      timeFlowEnabled: defaults.timeFlowEnabled !== false,
      timeFlowRate: Math.max(0, finite(defaults.timeFlowRate, 0.35)),
      collisionEnabled: defaults.collisionEnabled !== false,
      vehicleType: normalizeVehicle(player.vehicleType),
    },
    cameraAzimuth: finite(defaults.cameraAzimuth, 35),
    previewSeed,
  }
}

export const loadDrivingGameFixture = async (
  url = DRIVING_GAME_FIXTURE_URL,
): Promise<DrivingGameFixtureProjection | null> => {
  if (typeof fetch !== 'function') {
    return null
  }
  try {
    const response = await fetch(url)
    if (!response.ok) {
      return null
    }
    return projectDrivingGameFixture(await response.json())
  } catch {
    return null
  }
}
