export type CityObstacle = {
  id: string
  cx: number
  cz: number
  w: number
  d: number
  h: number
  color: string
}

export type CityRoadSegment = {
  id: string
  cx: number
  cz: number
  w: number
  d: number
  axis: 'x' | 'z'
}

export type CityLamp = {
  id: string
  x: number
  z: number
  h: number
}

export type CityPathNode = {x: number; z: number}

export type CityWorldMap = {
  mapSize: number
  roads: CityRoadSegment[]
  buildings: CityObstacle[]
  blockers: CityObstacle[]
  lamps: CityLamp[]
  carPath: CityPathNode[]
  pedestrianPath: CityPathNode[]
}

const seedRandom = (seed = 42) => {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

export const generateCityWorldMap = (mapSize: number): CityWorldMap => {
  const half = mapSize * 0.5
  const roads: CityRoadSegment[] = []
  const buildings: CityObstacle[] = []
  const blockers: CityObstacle[] = []
  const lamps: CityLamp[] = []
  const rand = seedRandom(Math.floor(mapSize))
  const avenue = Math.max(14, Math.floor(mapSize * 0.035))
  for (let i = -half + 24; i <= half - 24; i += 48) {
    roads.push({id: `rx-${i}`, cx: 0, cz: i, w: mapSize, d: avenue, axis: 'x'})
    roads.push({id: `rz-${i}`, cx: i, cz: 0, w: avenue, d: mapSize, axis: 'z'})
  }

  let bIndex = 0
  for (let x = -half + 30; x < half - 30; x += 36) {
    for (let z = -half + 30; z < half - 30; z += 36) {
      const nearRoad = roads.some((r) => Math.abs(x - r.cx) < r.w * 0.5 + 10 && Math.abs(z - r.cz) < r.d * 0.5 + 10)
      if (nearRoad) continue
      const w = 12 + rand() * 16
      const d = 12 + rand() * 16
      const h = 24 + rand() * 96
      const color = ['#8b9aad', '#a98f76', '#7f8c8d', '#9c7e6a'][Math.floor(rand() * 4)]
      buildings.push({id: `building-${bIndex}`, cx: x, cz: z, w, d, h, color})
      blockers.push({id: `blocker-building-${bIndex}`, cx: x, cz: z, w: w + 2, d: d + 2, h, color: '#111827'})
      bIndex += 1
    }
  }

  let lampIndex = 0
  for (const road of roads) {
    const span = road.axis === 'x' ? road.w : road.d
    const step = Math.max(22, Math.floor(span / 18))
    for (let t = -span * 0.5 + 14; t <= span * 0.5 - 14; t += step) {
      const x = road.axis === 'x' ? t : road.cx + road.w * 0.5 + 4
      const z = road.axis === 'x' ? road.cz + road.d * 0.5 + 4 : t
      lamps.push({id: `lamp-${lampIndex}`, x, z, h: 16})
      lampIndex += 1
    }
  }

  const carPath: CityPathNode[] = []
  const pedestrianPath: CityPathNode[] = []
  const loop = half - 30
  carPath.push({x: -loop, z: -loop}, {x: loop, z: -loop}, {x: loop, z: loop}, {x: -loop, z: loop})
  pedestrianPath.push({x: -loop * 0.7, z: -loop * 0.2}, {x: 0, z: loop * 0.75}, {x: loop * 0.6, z: 0}, {x: -loop * 0.3, z: -loop * 0.7})

  const ring = Math.max(34, Math.floor(mapSize * 0.1))
  blockers.push(
    {id: 'boundary-n', cx: 0, cz: -half + ring * 0.5, w: mapSize, d: ring, h: 20, color: '#111827'},
    {id: 'boundary-s', cx: 0, cz: half - ring * 0.5, w: mapSize, d: ring, h: 20, color: '#111827'},
    {id: 'boundary-w', cx: -half + ring * 0.5, cz: 0, w: ring, d: mapSize, h: 20, color: '#111827'},
    {id: 'boundary-e', cx: half - ring * 0.5, cz: 0, w: ring, d: mapSize, h: 20, color: '#111827'},
  )

  return {mapSize, roads, buildings, blockers, lamps, carPath, pedestrianPath}
}
