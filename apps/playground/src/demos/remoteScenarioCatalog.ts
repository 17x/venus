import type {PlaygroundSceneSnapshot} from '../types/playgroundScene'

/**
 * Declares supported remote dataset formats used by scenario demos.
 */
export type RemoteDatasetFormat = 'csv' | 'json'

/**
 * Declares one remote scenario definition sourced from public datasets.
 */
export interface RemoteScenarioDefinition {
  /** Stable scenario id used in playground subpage routes. */
  id: string
  /** Human-readable scenario title shown in demo header. */
  title: string
  /** Short scenario summary shown beside status telemetry. */
  summary: string
  /** Hash sub-route path used to deep-link this scenario demo. */
  path: string
  /** Legacy pathname aliases kept for backward-compatible deep links. */
  aliases?: readonly string[]
  /** Public free dataset endpoint used by this scenario demo. */
  datasetUrl: string
  /** Dataset format used by the scenario parser. */
  datasetFormat: RemoteDatasetFormat
  /** Scenario tags mapped from engine ledger typical scenarios. */
  tags: readonly string[]
  /** Builds one engine scene snapshot from fetched public data. */
  buildScene: (revision: number, payload: unknown) => PlaygroundSceneSnapshot
}

const DEMO_WIDTH = 1560
const DEMO_HEIGHT = 980

/**
 * Provides remote scenario definitions aligned to the engine task-ledger typical scenarios.
 */
export const REMOTE_SCENARIO_DEFINITIONS: readonly RemoteScenarioDefinition[] = [
  {
    id: 's1-medical-volume-slice-runtime',
    title: 'Medical Volume Slice Runtime',
    summary: 'Uses a local volume-like scalar fixture with slice, transfer, ROI, and capture controls.',
    path: '/medical-volume-slice-runtime',
    aliases: ['/demo/s1-medical-volume-slice-runtime'],
    datasetUrl: '/scenario-fixtures/s1/volcano.csv',
    datasetFormat: 'csv',
    tags: ['S1', 'medical', '3d-volume', 'local-fixture'],
    buildScene: (revision, payload) => buildMedicalSliceScene(revision, payload),
  },
  {
    id: 's2-preop-path-simulation',
    title: 'Pre-op Path Simulation',
    summary: 'Uses a local path, constraint, and risk-zone fixture for deterministic route simulation.',
    path: '/preop-path-simulation',
    aliases: ['/demo/s2-preop-path-simulation'],
    datasetUrl: '/scenario-fixtures/s2/airports.csv',
    datasetFormat: 'csv',
    tags: ['S2', 'surgical-planning', 'pathing', 'local-fixture'],
    buildScene: (revision, payload) => buildSurgicalPlanningScene(revision, payload),
  },
  {
    id: 's3-bim-collab-review',
    title: 'BIM Collaborative Review',
    summary: 'Uses public building footprint polygons for pseudo-3D block review overlays.',
    path: '/bim-collab-review',
    aliases: ['/demo/s3-bim-collab-review'],
    datasetUrl: 'https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/geojson/vancouver-blocks.json',
    datasetFormat: 'json',
    tags: ['S3', 'bim', 'architecture', 'public-data'],
    buildScene: (revision, payload) => buildBimReviewScene(revision, payload),
  },
  {
    id: 's4-cad-assembly-validation',
    title: 'CAD Assembly Validation',
    summary: 'Uses public vehicle specs as pseudo mechanical part dimensions and assembly layers.',
    path: '/cad-assembly-validation',
    aliases: ['/demo/s4-cad-assembly-validation'],
    datasetUrl: 'https://raw.githubusercontent.com/vega/vega-datasets/main/data/cars.json',
    datasetFormat: 'json',
    tags: ['S4', 'industrial-cad', 'assembly', 'public-data'],
    buildScene: (revision, payload) => buildIndustrialCadScene(revision, payload),
  },
  {
    id: 's5-gis-live-map-streaming',
    title: 'GIS Live Map Streaming',
    summary: 'Uses live USGS earthquake GeoJSON for 2D map and depth-layered 3D semantics.',
    path: '/gis-live-map-streaming',
    aliases: ['/demo/s5-gis-live-map-streaming'],
    datasetUrl: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson',
    datasetFormat: 'json',
    tags: ['S5', 'gis', '2d3d', 'public-data'],
    buildScene: (revision, payload) => buildGisEarthquakeScene(revision, payload),
  },
  {
    id: 's6-autodrive-twin-replay',
    title: 'Autonomous Driving Twin Replay',
    summary: 'Uses public timeline match records to emulate deterministic twin replay keyframes.',
    path: '/autodrive-twin-replay',
    aliases: ['/demo/s6-autodrive-twin-replay'],
    datasetUrl: 'https://raw.githubusercontent.com/fivethirtyeight/data/master/nba-elo/nbaallelo.csv',
    datasetFormat: 'csv',
    tags: ['S6', 'driving-twin', 'replay', 'public-data'],
    buildScene: (revision, payload) => buildDrivingTwinReplayScene(revision, payload),
  },
  {
    id: 's7-city-twin-monitor-wall',
    title: 'City Twin Monitoring Wall',
    summary: 'Uses public GDP country stats to emulate a city-scale wall with layered bars.',
    path: '/city-twin-monitor-wall',
    aliases: ['/demo/s7-city-twin-monitor-wall'],
    datasetUrl: 'https://raw.githubusercontent.com/plotly/datasets/master/2014_world_gdp_with_codes.csv',
    datasetFormat: 'csv',
    tags: ['S7', 'city-twin', 'wall-dashboard', 'public-data'],
    buildScene: (revision, payload) => buildCityTwinWallScene(revision, payload),
  },
  {
    id: 's8-commerce-product-variant-runtime',
    title: 'Commerce Product Variant Runtime',
    summary: 'Uses free product catalog data for variant cards with layered depth semantics.',
    path: '/commerce-product-variant-runtime',
    aliases: ['/demo/s8-commerce-product-variant-runtime'],
    datasetUrl: 'https://fakestoreapi.com/products',
    datasetFormat: 'json',
    tags: ['S8', 'commerce', '3d-product', 'public-data'],
    buildScene: (revision, payload) => buildCommerceScene(revision, payload),
  },
  {
    id: 's9-molecular-volume-exploration',
    title: 'Molecular and Volume Exploration',
    summary: 'Uses public earthquake point-cloud data to emulate molecular cluster and depth fields.',
    path: '/molecular-volume-exploration',
    aliases: ['/demo/s9-molecular-volume-exploration'],
    datasetUrl: 'https://raw.githubusercontent.com/vega/vega-datasets/main/data/earthquakes.json',
    datasetFormat: 'json',
    tags: ['S9', 'molecular', 'volume', 'public-data'],
    buildScene: (revision, payload) => buildMolecularVolumeScene(revision, payload),
  },
  {
    id: 's10-game-editor-runtime-preview',
    title: 'Game Editor Runtime Preview',
    summary: 'Uses public graph topology data to emulate authoring-runtime graph parity behavior.',
    path: '/game-editor-runtime-preview',
    aliases: ['/demo/s10-game-editor-runtime-preview'],
    datasetUrl: 'https://raw.githubusercontent.com/vega/vega-datasets/main/data/miserables.json',
    datasetFormat: 'json',
    tags: ['S10', 'game-editor', 'runtime-parity', 'public-data'],
    buildScene: (revision, payload) => buildGameEditorParityScene(revision, payload),
  },
  {
    id: 's11-node-headless-rendering',
    title: 'Node Headless Rendering',
    summary: 'Uses public industry unemployment time-series to emulate deterministic node frame output.',
    path: '/node-headless-rendering',
    aliases: ['/demo/s11-node-headless-rendering'],
    datasetUrl: 'https://raw.githubusercontent.com/vega/vega-datasets/main/data/unemployment-across-industries.json',
    datasetFormat: 'json',
    tags: ['S11', 'node-rendering', 'deterministic-frame', 'public-data'],
    buildScene: (revision, payload) => buildNodeRenderingScene(revision, payload),
  },
  {
    id: 's12-vector-editor-optin-2d',
    title: 'Vector Editor Opt-in 2D',
    summary: 'Uses public weather curves to emulate 2D vector path editing and control handles.',
    path: '/vector-editor-optin-2d',
    aliases: ['/demo/s12-vector-editor-optin-2d'],
    datasetUrl: 'https://raw.githubusercontent.com/vega/vega-datasets/main/data/seattle-weather.csv',
    datasetFormat: 'csv',
    tags: ['S12', '2d-vector', 'path-editing', 'public-data'],
    buildScene: (revision, payload) => buildVectorEditorScene(revision, payload),
  },
  {
    id: 's13-video-timeline-composition',
    title: 'Video Timeline Composition',
    summary: 'Uses public stock series to emulate timeline tracks, clips, and monitor scheduling.',
    path: '/video-timeline-composition',
    aliases: ['/demo/s13-video-timeline-composition'],
    datasetUrl: 'https://raw.githubusercontent.com/vega/vega-datasets/main/data/stocks.csv',
    datasetFormat: 'csv',
    tags: ['S13', 'video-editor', 'timeline', 'public-data'],
    buildScene: (revision, payload) => buildVideoEditorScene(revision, payload),
  },
] as const

/**
 * Resolves one scenario definition from hash-subroute or legacy pathname routing.
 * @param routePath Hash sub-route path or pathname used by playground route dispatcher.
 */
export function resolveRemoteScenarioFromRoute(routePath: string): RemoteScenarioDefinition | null {
  const normalizedPath = routePath.endsWith('/') && routePath.length > 1
    ? routePath.slice(0, -1)
    : routePath
  return REMOTE_SCENARIO_DEFINITIONS.find((scenario) => {
    if (scenario.path === normalizedPath) {
      return true
    }
    return (scenario.aliases ?? []).includes(normalizedPath)
  }) ?? null
}

/**
 * Parses one CSV string into a numeric matrix while dropping invalid numeric cells.
 * @param input Raw CSV payload string fetched from public dataset endpoint.
 */
function parseNumericCsvMatrix(input: string): number[][] {
  return input
    .trim()
    .split(/\r?\n/)
    .map((line) => line.split(',').map((cell) => Number.parseFloat(cell.trim())))
    .filter((row) => row.length > 0 && row.some((value) => Number.isFinite(value)))
    .map((row) => row.map((value) => (Number.isFinite(value) ? value : 0)))
}

/**
 * Parses one CSV payload into record objects keyed by the header row.
 * @param input Raw CSV payload string fetched from a public endpoint.
 */
function parseCsvRecords(input: string): Array<Record<string, string>> {
  const lines = input
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.length > 0)
  if (lines.length <= 1) {
    return []
  }

  const headers = lines[0].split(',').map((cell) => cell.trim())
  return lines.slice(1).map((line) => {
    const values = line.split(',')
    const record: Record<string, string> = {}
    headers.forEach((header, index) => {
      record[header] = (values[index] ?? '').trim()
    })
    return record
  })
}

/**
 * Reads one finite numeric field from a record using candidate keys.
 * @param record CSV or JSON record containing numeric fields as strings or numbers.
 * @param keys Candidate field names checked in priority order.
 * @param fallback Fallback value when no finite field is found.
 */
function readNumericField(record: Record<string, unknown>, keys: readonly string[], fallback = 0): number {
  for (const key of keys) {
    const value = record[key]
    const numeric = typeof value === 'number' ? value : Number(value)
    if (Number.isFinite(numeric)) {
      return numeric
    }
  }
  return fallback
}

/**
 * Resolves deterministic min/max bounds from one numeric list.
 * @param values Numeric values used by normalization routines.
 */
function resolveNumericBounds(values: readonly number[]): {min: number; max: number} {
  if (values.length === 0) {
    return {min: 0, max: 1}
  }

  let min = values[0]
  let max = values[0]
  for (const value of values) {
    if (value < min) {
      min = value
    }
    if (value > max) {
      max = value
    }
  }

  if (min === max) {
    return {min, max: min + 1}
  }

  return {min, max}
}

/**
 * Normalizes one value into the [0, 1] range using explicit bounds.
 * @param value Raw value to normalize.
 * @param bounds Precomputed min/max bounds.
 */
function normalizeValue(value: number, bounds: {min: number; max: number}): number {
  return (value - bounds.min) / (bounds.max - bounds.min)
}

/**
 * Parses one date-like value to an epoch timestamp.
 * @param value Unknown date field from CSV or JSON datasets.
 */
function parseTimestamp(value: unknown): number {
  const timestamp = Date.parse(String(value ?? ''))
  return Number.isFinite(timestamp) ? timestamp : Number.NaN
}

/**
 * Builds one common scene background/title scaffold for remote demos.
 * @param revision Monotonic scene revision used by engine caching paths.
 * @param title Scenario title shown in scene content.
 * @param subtitle Scenario subtitle shown in scene content.
 */
function buildSceneScaffold(revision: number, title: string, subtitle: string): PlaygroundSceneSnapshot {
  return {
    revision,
    width: DEMO_WIDTH,
    height: DEMO_HEIGHT,
    nodes: [
      {
        id: 'remote-bg',
        type: 'shape',
        shape: 'rect',
        x: 24,
        y: 24,
        width: DEMO_WIDTH - 48,
        height: DEMO_HEIGHT - 48,
        cornerRadius: 24,
        fill: '#061224',
        stroke: '#1d4b89',
        strokeWidth: 2,
      },
      {
        id: 'remote-title',
        type: 'text',
        x: 64,
        y: 68,
        text: title,
        style: {
          fontFamily: 'IBM Plex Sans',
          fontSize: 30,
          fontWeight: 600,
          fill: '#e2e8f0',
        },
      },
      {
        id: 'remote-subtitle',
        type: 'text',
        x: 64,
        y: 108,
        text: subtitle,
        style: {
          fontFamily: 'IBM Plex Sans',
          fontSize: 14,
          fill: '#93c5fd',
        },
      },
    ],
  }
}

/**
 * Builds medical volume-like slice scene from a local scalar fixture CSV grid.
 * @param revision Monotonic scene revision used by engine caching paths.
 * @param payload Parsed CSV payload from a free public endpoint.
 */
function buildMedicalSliceScene(revision: number, payload: unknown): PlaygroundSceneSnapshot {
  const csvText = typeof payload === 'string' ? payload : ''
  const matrix = parseNumericCsvMatrix(csvText)
  const flatValues = matrix.flat()
  const bounds = resolveNumericBounds(flatValues)
  const snapshot = buildSceneScaffold(
    revision,
    'S1 Medical Volume Slice Runtime (Local Fixture)',
    'Fixture: scenario-fixtures/s1/volcano.csv -> local CT/MRI-like slice, transfer, ROI, capture controls',
  )

  const maxRows = Math.min(40, matrix.length)
  const maxCols = Math.min(60, matrix[0]?.length ?? 0)
  const cellWidth = 16
  const cellHeight = 12
  const originX = 72
  const originY = 156

  for (let rowIndex = 0; rowIndex < maxRows; rowIndex += 1) {
    for (let colIndex = 0; colIndex < maxCols; colIndex += 1) {
      const value = matrix[rowIndex]?.[colIndex] ?? 0
      const normalized = normalizeValue(value, bounds)
      const hue = Math.round(220 - normalized * 180)
      const lightness = Math.round(20 + normalized * 55)
      snapshot.nodes.push({
        id: `s1-cell-${rowIndex}-${colIndex}`,
        type: 'shape',
        shape: 'rect',
        x: originX + colIndex * cellWidth,
        y: originY + rowIndex * cellHeight,
        z: Math.round(normalized * 120),
        width: cellWidth - 1,
        height: cellHeight - 1,
        depth: Math.max(2, Math.round(normalized * 10)),
        fill: `hsl(${hue} 80% ${lightness}%)`,
        volumeIntensity: normalized,
        volumeRow: rowIndex,
        volumeCol: colIndex,
        volumeSliceIndex: 0,
        volumeTransferPreset: 'soft-tissue',
      })
    }
  }

  snapshot.nodes.push(
    {id: 's1-roi-core', type: 'shape', shape: 'rect', x: originX + 420, y: originY + 168, width: 168, height: 120, fill: 'rgba(103,232,249,0.08)', stroke: '#67e8f9', strokeWidth: 2},
    {id: 's1-roi-margin', type: 'shape', shape: 'rect', x: originX + 300, y: originY + 96, width: 336, height: 252, fill: 'rgba(103,232,249,0.08)', stroke: '#67e8f9', strokeWidth: 2},
    {id: 's1-roi-edge', type: 'shape', shape: 'rect', x: originX + 96, y: originY + 60, width: 220, height: 132, fill: 'rgba(103,232,249,0.08)', stroke: '#67e8f9', strokeWidth: 2},
    {id: 's1-slice-label', type: 'text', x: 1128, y: 144, text: 'slice: 0', style: {fontFamily: 'IBM Plex Sans', fontSize: 14, fill: '#bfdbfe'}},
    {id: 's1-transfer-label', type: 'text', x: 1128, y: 168, text: 'transfer: soft-tissue', style: {fontFamily: 'IBM Plex Sans', fontSize: 14, fill: '#bfdbfe'}},
    {id: 's1-roi-label', type: 'text', x: 1128, y: 192, text: 'roi: none', style: {fontFamily: 'IBM Plex Sans', fontSize: 14, fill: '#bfdbfe'}},
    {id: 's1-capture-status', type: 'text', x: 1128, y: 216, text: 'capture: 0', style: {fontFamily: 'IBM Plex Sans', fontSize: 14, fill: '#fde68a'}},
  )

  return snapshot
}

/**
 * Builds surgical planning scene from local waypoint coordinates plus deterministic constraints.
 * @param revision Monotonic scene revision used by engine caching paths.
 * @param payload Parsed CSV payload from a free public endpoint.
 */
function buildSurgicalPlanningScene(revision: number, payload: unknown): PlaygroundSceneSnapshot {
  const csvText = typeof payload === 'string' ? payload : ''
  const records = parseCsvRecords(csvText)
  const waypoints = records
    .map((record, index) => ({
      id: record.iata || record.name || `wp-${index}`,
      lon: Number(record.longitude),
      lat: Number(record.latitude),
    }))
    .filter((entry) => Number.isFinite(entry.lon) && Number.isFinite(entry.lat))
    .slice(0, 240)

  const lonBounds = resolveNumericBounds(waypoints.map((entry) => entry.lon))
  const latBounds = resolveNumericBounds(waypoints.map((entry) => entry.lat))
  const snapshot = buildSceneScaffold(
    revision,
    'S2 Pre-op Path Simulation (Local Fixture)',
    'Fixture: scenario-fixtures/s2/airports.csv -> path waypoints, constraints, risk zones, clearance query',
  )

  snapshot.nodes.push(
    {id: 's2-constraint-corridor', type: 'shape', shape: 'rect', x: 74, y: 158, z: 1, width: 1378, height: 724, fill: 'rgba(14,165,233,0.05)', stroke: '#0284c7', strokeWidth: 2, constraintType: 'corridor'},
    {id: 's2-risk-zone-0', type: 'shape', shape: 'rect', x: 640, y: 350, z: 2, width: 180, height: 120, fill: 'rgba(248,113,113,0.12)', stroke: '#fb7185', strokeWidth: 2, riskZone: true},
    {id: 's2-risk-zone-1', type: 'shape', shape: 'rect', x: 960, y: 560, z: 2, width: 210, height: 150, fill: 'rgba(248,113,113,0.12)', stroke: '#fb7185', strokeWidth: 2, riskZone: true},
    {id: 's2-edit-label', type: 'text', x: 1128, y: 144, text: 'edit: none', style: {fontFamily: 'IBM Plex Sans', fontSize: 14, fill: '#bfdbfe'}},
    {id: 's2-replay-label', type: 'text', x: 1128, y: 168, text: 'replay step: 0', style: {fontFamily: 'IBM Plex Sans', fontSize: 14, fill: '#bfdbfe'}},
    {id: 's2-clearance-label', type: 'text', x: 1128, y: 192, text: 'clearance: none n/a', style: {fontFamily: 'IBM Plex Sans', fontSize: 14, fill: '#fde68a'}},
    {id: 's2-replay-marker', type: 'text', x: 74, y: 158, z: 40, text: 'step 0', style: {fontFamily: 'IBM Plex Sans', fontSize: 13, fill: '#c4b5fd'}},
  )

  let previousPoint: {x: number; y: number} | null = null
  waypoints.forEach((waypoint, index) => {
    const x = 80 + normalizeValue(waypoint.lon, lonBounds) * 1360
    const y = 170 + normalizeValue(waypoint.lat, latBounds) * 700
    const z = Math.round((index % 24) * 6)
    snapshot.nodes.push({
      id: `s2-waypoint-${index}`,
      type: 'shape',
      shape: 'ellipse',
      x,
      y,
      z,
      width: 8,
      height: 8,
      depth: 8,
      fill: '#38bdf8',
      stroke: '#e0f2fe',
      strokeWidth: 1,
      pathWaypoint: true,
    })

    if (previousPoint && index % 2 === 0) {
      snapshot.nodes.push({
        id: `s2-path-${index}`,
        type: 'shape',
        shape: 'line',
        x: previousPoint.x,
        y: previousPoint.y,
        z,
        width: x - previousPoint.x,
        height: y - previousPoint.y,
        stroke: '#22d3ee',
        strokeWidth: 2,
      })
    }
    previousPoint = {x, y}
  })

  return snapshot
}

/**
 * Builds BIM review scene from public building footprint GeoJSON data.
 * @param revision Monotonic scene revision used by engine caching paths.
 * @param payload Parsed GeoJSON payload from a free public endpoint.
 */
function buildBimReviewScene(revision: number, payload: unknown): PlaygroundSceneSnapshot {
  const snapshot = buildSceneScaffold(
    revision,
    'S3 BIM Collaborative Review (Public Building Footprints)',
    'Dataset: deck.gl Vancouver blocks (open) -> footprint-to-block pseudo-3D projection',
  )

  const features = readGeoJsonFeatures(payload)
  const polygons = features
    .map((feature) => readFirstPolygonRing(feature))
    .filter((ring): ring is Array<[number, number]> => ring !== null)

  const lonValues = polygons.flatMap((ring) => ring.map((point) => point[0]))
  const latValues = polygons.flatMap((ring) => ring.map((point) => point[1]))
  const lonBounds = resolveNumericBounds(lonValues)
  const latBounds = resolveNumericBounds(latValues)
  const maxBuildings = Math.min(220, polygons.length)

  for (let index = 0; index < maxBuildings; index += 1) {
    const ring = polygons[index]
    const centroid = resolvePolygonCentroid(ring)
    const box = resolvePolygonBounds(ring)
    const normalizedX = normalizeValue(centroid[0], lonBounds)
    const normalizedY = normalizeValue(centroid[1], latBounds)
    const buildingWidth = Math.max(6, Math.round((box.maxX - box.minX) * 2200))
    const buildingHeight = Math.max(6, Math.round((box.maxY - box.minY) * 2200))
    const elevation = 12 + (index % 17) * 8

    snapshot.nodes.push({
      id: `s3-building-${index}`,
      type: 'shape',
      shape: 'rect',
      x: 90 + normalizedX * 1320,
      y: 170 + normalizedY * 680,
      z: elevation,
      width: buildingWidth,
      height: buildingHeight,
      depth: elevation,
      fill: `hsl(${190 + (index % 40)} 65% ${42 + (index % 20)}%)`,
      stroke: '#bae6fd',
      strokeWidth: 1,
    })
  }

  return snapshot
}

/**
 * Builds industrial CAD-like assembly scene from public vehicle specification rows.
 * @param revision Monotonic scene revision used by engine caching paths.
 * @param payload Parsed JSON payload from a free public endpoint.
 */
function buildIndustrialCadScene(revision: number, payload: unknown): PlaygroundSceneSnapshot {
  const rows = Array.isArray(payload)
    ? payload.filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
    : []
  const maxRows = Math.min(90, rows.length)
  const horsepowerBounds = resolveNumericBounds(rows.map((row) => readNumericField(row, ['Horsepower'], 80)))
  const weightBounds = resolveNumericBounds(rows.map((row) => readNumericField(row, ['Weight_in_lbs'], 2200)))

  const snapshot = buildSceneScaffold(
    revision,
    'S4 CAD Assembly Validation (Public Vehicle Specs)',
    'Dataset: vega cars.json (open) -> pseudo part blocks driven by horsepower and weight',
  )

  for (let index = 0; index < maxRows; index += 1) {
    const row = rows[index]
    const col = index % 10
    const gridRow = Math.floor(index / 10)
    const horsepower = readNumericField(row, ['Horsepower'], 80)
    const weight = readNumericField(row, ['Weight_in_lbs'], 2200)
    const nh = normalizeValue(horsepower, horsepowerBounds)
    const nw = normalizeValue(weight, weightBounds)

    snapshot.nodes.push({
      id: `s4-part-${index}`,
      type: 'shape',
      shape: 'rect',
      x: 78 + col * 142,
      y: 168 + gridRow * 92,
      z: Math.round(nw * 180),
      width: 54 + Math.round(nh * 52),
      height: 36 + Math.round(nw * 30),
      depth: 10 + Math.round(nw * 22),
      cornerRadius: 6,
      fill: `hsl(${196 - Math.round(nh * 120)} 70% ${34 + Math.round(nw * 22)}%)`,
      stroke: '#bae6fd',
      strokeWidth: 1,
    })
  }

  return snapshot
}

/**
 * Builds GIS scene from public USGS earthquake GeoJSON feed.
 * @param revision Monotonic scene revision used by engine caching paths.
 * @param payload Parsed GeoJSON payload from a free public endpoint.
 */
function buildGisEarthquakeScene(revision: number, payload: unknown): PlaygroundSceneSnapshot {
  const snapshot = buildSceneScaffold(
    revision,
    'S5 GIS Live Map Streaming (USGS Live Feed)',
    'Dataset: USGS all-week GeoJSON (open) -> epicenter points with depth-driven z/depth',
  )

  const features = readGeoJsonFeatures(payload)
  const points = features
    .map((feature) => readPointGeometry(feature))
    .filter((point): point is {lon: number; lat: number; depth: number; magnitude: number} => point !== null)

  const lonBounds = resolveNumericBounds(points.map((point) => point.lon))
  const latBounds = resolveNumericBounds(points.map((point) => point.lat))
  const depthBounds = resolveNumericBounds(points.map((point) => point.depth))
  const maxPoints = Math.min(400, points.length)

  for (let index = 0; index < maxPoints; index += 1) {
    const point = points[index]
    const nx = normalizeValue(point.lon, lonBounds)
    const ny = normalizeValue(point.lat, latBounds)
    const nd = normalizeValue(point.depth, depthBounds)
    const radius = Math.max(4, Math.round(4 + point.magnitude * 2.3))

    snapshot.nodes.push({
      id: `s5-quake-${index}`,
      type: 'shape',
      shape: 'ellipse',
      x: 70 + nx * 1360,
      y: 160 + ny * 720,
      z: Math.round(nd * 240),
      width: radius,
      height: radius,
      depth: Math.max(3, Math.round(nd * 26)),
      fill: `hsl(${20 + Math.round(nd * 180)} 92% 54%)`,
      stroke: '#fef3c7',
      strokeWidth: 1,
    })
  }

  return snapshot
}

/**
 * Builds driving twin replay scene from public timeline records.
 * @param revision Monotonic scene revision used by engine caching paths.
 * @param payload Parsed CSV payload from a free public endpoint.
 */
function buildDrivingTwinReplayScene(revision: number, payload: unknown): PlaygroundSceneSnapshot {
  const csvText = typeof payload === 'string' ? payload : ''
  const records = parseCsvRecords(csvText).slice(0, 360)
  const eloValues = records.map((record) => Number(record.elo_n)).filter((value) => Number.isFinite(value))
  const eloBounds = resolveNumericBounds(eloValues.length > 0 ? eloValues : [1200, 1700])

  const snapshot = buildSceneScaffold(
    revision,
    'S6 Autonomous Driving Twin Replay (Public Timeline Proxy)',
    'Dataset: fivethirtyeight nbaallelo.csv (open) -> deterministic replay track and keyframe envelopes',
  )

  let previousPoint: {x: number; y: number} | null = null
  records.forEach((record, index) => {
    const normalizedTimeline = index / Math.max(1, records.length - 1)
    const elo = Number(record.elo_n)
    const safeElo = Number.isFinite(elo) ? elo : eloBounds.min
    const eloNorm = normalizeValue(safeElo, eloBounds)
    const x = 92 + normalizedTimeline * 1320
    const y = 760 - eloNorm * 520
    const z = Math.round((Number(record.pts) - Number(record.opp_pts) || 0) * 2)

    snapshot.nodes.push({
      id: `s6-kf-${index}`,
      type: 'shape',
      shape: 'rect',
      x,
      y,
      z,
      width: 6,
      height: 6,
      depth: 4,
      fill: '#22d3ee',
    })

    if (previousPoint) {
      snapshot.nodes.push({
        id: `s6-link-${index}`,
        type: 'shape',
        shape: 'line',
        x: previousPoint.x,
        y: previousPoint.y,
        z,
        width: x - previousPoint.x,
        height: y - previousPoint.y,
        stroke: '#67e8f9',
        strokeWidth: 1,
      })
    }
    previousPoint = {x, y}
  })

  return snapshot
}

/**
 * Builds city-scale twin wall scene from public GDP statistics.
 * @param revision Monotonic scene revision used by engine caching paths.
 * @param payload Parsed CSV payload from a free public endpoint.
 */
function buildCityTwinWallScene(revision: number, payload: unknown): PlaygroundSceneSnapshot {
  const csvText = typeof payload === 'string' ? payload : ''
  const records = parseCsvRecords(csvText)
  const gdpValues = records
    .map((record) => Number(record['GDP (BILLIONS)']))
    .filter((value) => Number.isFinite(value))
  const gdpBounds = resolveNumericBounds(gdpValues.length > 0 ? gdpValues : [1, 1000])

  const snapshot = buildSceneScaffold(
    revision,
    'S7 City Twin Monitoring Wall (Public GDP Dashboard Proxy)',
    'Dataset: plotly world GDP csv (open) -> layered wall bars and macro-region distribution',
  )

  const maxItems = Math.min(120, records.length)
  for (let index = 0; index < maxItems; index += 1) {
    const record = records[index]
    const gdp = Number(record['GDP (BILLIONS)'])
    const safeGdp = Number.isFinite(gdp) ? gdp : gdpBounds.min
    const norm = normalizeValue(safeGdp, gdpBounds)
    const col = index % 12
    const gridRow = Math.floor(index / 12)

    snapshot.nodes.push({
      id: `s7-wall-${index}`,
      type: 'shape',
      shape: 'rect',
      x: 76 + col * 120,
      y: 840 - gridRow * 74 - norm * 300,
      z: Math.round(norm * 200),
      width: 72,
      height: 24 + norm * 300,
      depth: 12 + Math.round(norm * 36),
      fill: `hsl(${205 - Math.round(norm * 90)} 74% ${34 + Math.round(norm * 30)}%)`,
      stroke: '#dbeafe',
      strokeWidth: 1,
    })
  }

  return snapshot
}

/**
 * Builds commerce product runtime scene from public free product API data.
 * @param revision Monotonic scene revision used by engine caching paths.
 * @param payload Parsed JSON payload from a free public endpoint.
 */
function buildCommerceScene(revision: number, payload: unknown): PlaygroundSceneSnapshot {
  const snapshot = buildSceneScaffold(
    revision,
    'S8 Commerce Product Variant Runtime (Public Catalog)',
    'Dataset: Fake Store API (open) -> product cards with pricing/rating depth semantics',
  )

  const products = Array.isArray(payload)
    ? payload as Array<Record<string, unknown>>
    : []
  const maxProducts = Math.min(16, products.length)

  for (let index = 0; index < maxProducts; index += 1) {
    const product = products[index]
    const column = index % 4
    const row = Math.floor(index / 4)
    const price = typeof product.price === 'number' ? product.price : 0
    const rating = typeof (product.rating as {rate?: unknown})?.rate === 'number'
      ? Number((product.rating as {rate: number}).rate)
      : 0
    const inventory = typeof (product.rating as {count?: unknown})?.count === 'number'
      ? Number((product.rating as {count: number}).count)
      : 0
    const cardX = 86 + column * 350
    const cardY = 170 + row * 190
    const depth = Math.max(8, Math.round((rating / 5) * 120))
    const priceNormalized = Math.max(0, Math.min(1, price / 300))

    snapshot.nodes.push({
      id: `s8-card-${index}`,
      type: 'shape',
      shape: 'rect',
      x: cardX,
      y: cardY,
      z: depth,
      width: 300,
      height: 156,
      depth,
      cornerRadius: 12,
      fill: `hsl(${210 - Math.round(priceNormalized * 110)} 68% 30%)`,
      stroke: '#bfdbfe',
      strokeWidth: 1,
    })

    snapshot.nodes.push({
      id: `s8-title-${index}`,
      type: 'text',
      x: cardX + 12,
      y: cardY + 34,
      z: depth + 1,
      text: String(product.title ?? `Product ${index + 1}`).slice(0, 34),
      style: {
        fontFamily: 'IBM Plex Sans',
        fontSize: 14,
        fontWeight: 600,
        fill: '#dbeafe',
      },
    })

    snapshot.nodes.push({
      id: `s8-meta-${index}`,
      type: 'text',
      x: cardX + 12,
      y: cardY + 62,
      z: depth + 1,
      text: `price $${price.toFixed(2)} | rating ${rating.toFixed(1)} | inv ${inventory}`,
      style: {
        fontFamily: 'IBM Plex Sans',
        fontSize: 12,
        fill: '#93c5fd',
      },
    })
  }

  return snapshot
}

/**
 * Builds molecular-volume-like scene from public point cloud features.
 * @param revision Monotonic scene revision used by engine caching paths.
 * @param payload Parsed GeoJSON payload from a free public endpoint.
 */
function buildMolecularVolumeScene(revision: number, payload: unknown): PlaygroundSceneSnapshot {
  const snapshot = buildSceneScaffold(
    revision,
    'S9 Molecular and Volume Exploration (Public Point Cloud Proxy)',
    'Dataset: vega earthquakes.json (open) -> atom-like clusters and depth fields',
  )

  const features = readGeoJsonFeatures(payload)
  const points = features
    .map((feature) => readPointGeometry(feature))
    .filter((point): point is {lon: number; lat: number; depth: number; magnitude: number} => point !== null)
    .slice(0, 420)

  const lonBounds = resolveNumericBounds(points.map((point) => point.lon))
  const latBounds = resolveNumericBounds(points.map((point) => point.lat))
  const depthBounds = resolveNumericBounds(points.map((point) => point.depth))

  points.forEach((point, index) => {
    const nx = normalizeValue(point.lon, lonBounds)
    const ny = normalizeValue(point.lat, latBounds)
    const nz = normalizeValue(point.depth, depthBounds)
    const radius = Math.max(3, Math.round(4 + point.magnitude * 1.8))
    snapshot.nodes.push({
      id: `s9-atom-${index}`,
      type: 'shape',
      shape: 'ellipse',
      x: 88 + nx * 1340,
      y: 170 + ny * 700,
      z: Math.round(nz * 260),
      width: radius,
      height: radius,
      depth: Math.max(4, Math.round(nz * 30)),
      fill: `hsl(${280 - Math.round(nz * 220)} 78% ${38 + Math.round(nz * 34)}%)`,
      stroke: '#f5d0fe',
      strokeWidth: 1,
    })
  })

  return snapshot
}

/**
 * Builds game editor/runtime parity scene from public graph topology data.
 * @param revision Monotonic scene revision used by engine caching paths.
 * @param payload Parsed JSON payload from a free public endpoint.
 */
function buildGameEditorParityScene(revision: number, payload: unknown): PlaygroundSceneSnapshot {
  const graph = payload as {
    nodes?: Array<{name?: unknown; group?: unknown; index?: unknown}>
    links?: Array<{source?: unknown; target?: unknown; value?: unknown}>
  }
  const nodes = Array.isArray(graph.nodes) ? graph.nodes.slice(0, 120) : []
  const links = Array.isArray(graph.links) ? graph.links.slice(0, 220) : []
  const nodeIndexMap = new Map<number, {x: number; y: number}>()

  const snapshot = buildSceneScaffold(
    revision,
    'S10 Game Editor Runtime Preview (Public Graph Topology)',
    'Dataset: vega miserables.json (open) -> authoring/runtime graph parity and link flow',
  )

  nodes.forEach((node, index) => {
    const group = Number(node.group)
    const safeGroup = Number.isFinite(group) ? Math.max(0, group) : 0
    const angle = (index / Math.max(1, nodes.length)) * Math.PI * 2
    const radius = 180 + safeGroup * 28
    const x = 780 + Math.cos(angle) * radius
    const y = 500 + Math.sin(angle) * radius * 0.65
    const z = safeGroup * 14
    nodeIndexMap.set(index, {x, y})
    snapshot.nodes.push({
      id: `s10-node-${index}`,
      type: 'shape',
      shape: 'ellipse',
      x,
      y,
      z,
      width: 14,
      height: 14,
      depth: 8,
      fill: `hsl(${180 + safeGroup * 12} 72% 48%)`,
      stroke: '#cffafe',
      strokeWidth: 1,
    })
  })

  links.forEach((link, index) => {
    const sourceIndex = Number(link.source)
    const targetIndex = Number(link.target)
    const source = nodeIndexMap.get(sourceIndex)
    const target = nodeIndexMap.get(targetIndex)
    if (!source || !target) {
      return
    }
    const weight = Number.isFinite(Number(link.value)) ? Number(link.value) : 1
    snapshot.nodes.push({
      id: `s10-link-${index}`,
      type: 'shape',
      shape: 'line',
      x: source.x,
      y: source.y,
      z: 1,
      width: target.x - source.x,
      height: target.y - source.y,
      stroke: '#67e8f9',
      strokeWidth: Math.min(3, Math.max(1, weight)),
    })
  })

  return snapshot
}

/**
 * Builds deterministic node rendering scene from public unemployment time-series records.
 * @param revision Monotonic scene revision used by engine caching paths.
 * @param payload Parsed JSON payload from a free public endpoint.
 */
function buildNodeRenderingScene(revision: number, payload: unknown): PlaygroundSceneSnapshot {
  const rows = Array.isArray(payload)
    ? payload.filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
    : []

  const normalizedRows = rows
    .map((row) => ({
      series: String(row.series ?? 'unknown'),
      count: readNumericField(row, ['count'], 0),
      rate: readNumericField(row, ['rate'], 0),
      timestamp: parseTimestamp(row.date),
    }))
    .filter((row) => Number.isFinite(row.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp)

  const lastRows = normalizedRows.slice(-260)
  const latestTimestamps = Array.from(new Set(lastRows.map((row) => row.timestamp))).slice(-13)
  const seriesOrder = Array.from(
    new Set(lastRows.map((row) => row.series)),
  ).slice(0, 14)

  const countBounds = resolveNumericBounds(lastRows.map((row) => row.count))
  const rateBounds = resolveNumericBounds(lastRows.map((row) => row.rate))
  const snapshot = buildSceneScaffold(
    revision,
    'S11 Node Headless Rendering (Public Industry Time-Series)',
    'Dataset: vega unemployment-across-industries.json -> deterministic node frames and render telemetry proxy',
  )

  const rowHeight = 42
  const colWidth = 92
  seriesOrder.forEach((series, rowIndex) => {
    snapshot.nodes.push({
      id: `s11-series-${rowIndex}`,
      type: 'text',
      x: 84,
      y: 170 + rowIndex * rowHeight,
      text: series.slice(0, 28),
      style: {
        fontFamily: 'IBM Plex Sans',
        fontSize: 12,
        fill: '#93c5fd',
      },
    })

    latestTimestamps.forEach((timestamp, colIndex) => {
      const cell = lastRows.find((entry) => entry.series === series && entry.timestamp === timestamp)
      if (!cell) {
        return
      }

      const countNorm = normalizeValue(cell.count, countBounds)
      const rateNorm = normalizeValue(cell.rate, rateBounds)
      snapshot.nodes.push({
        id: `s11-cell-${rowIndex}-${colIndex}`,
        type: 'shape',
        shape: 'rect',
        x: 340 + colIndex * colWidth,
        y: 154 + rowIndex * rowHeight,
        z: Math.round(rateNorm * 140),
        width: 72,
        height: 30,
        depth: Math.max(4, Math.round(rateNorm * 24)),
        cornerRadius: 4,
        fill: `hsl(${205 - Math.round(countNorm * 130)} 72% ${30 + Math.round(rateNorm * 34)}%)`,
        stroke: '#bfdbfe',
        strokeWidth: 1,
      })
    })
  })

  return snapshot
}

/**
 * Builds 2D vector editor scene from public weather CSV records.
 * @param revision Monotonic scene revision used by engine caching paths.
 * @param payload Parsed CSV payload from a free public endpoint.
 */
function buildVectorEditorScene(revision: number, payload: unknown): PlaygroundSceneSnapshot {
  const csvText = typeof payload === 'string' ? payload : ''
  const records = parseCsvRecords(csvText).slice(0, 240)
  const valuesMax = records.map((record) => Number(record.temp_max)).filter((value) => Number.isFinite(value))
  const valuesMin = records.map((record) => Number(record.temp_min)).filter((value) => Number.isFinite(value))
  const tempBounds = resolveNumericBounds([...valuesMax, ...valuesMin])

  const snapshot = buildSceneScaffold(
    revision,
    'S12 Vector Editor Opt-in 2D (Public Weather Curve Paths)',
    'Dataset: vega seattle-weather.csv -> editable-like spline/path and handle overlays',
  )

  const sampled = records.filter((_, index) => index % 2 === 0).slice(0, 120)
  let prevMax: {x: number; y: number} | null = null
  let prevMin: {x: number; y: number} | null = null

  sampled.forEach((record, index) => {
    const x = 80 + (index / Math.max(1, sampled.length - 1)) * 1400
    const tempMax = Number(record.temp_max)
    const tempMin = Number(record.temp_min)
    if (!Number.isFinite(tempMax) || !Number.isFinite(tempMin)) {
      return
    }

    const yMax = 200 + (1 - normalizeValue(tempMax, tempBounds)) * 260
    const yMin = 540 + (1 - normalizeValue(tempMin, tempBounds)) * 220

    snapshot.nodes.push({
      id: `s12-handle-max-${index}`,
      type: 'shape',
      shape: 'ellipse',
      x,
      y: yMax,
      width: 6,
      height: 6,
      fill: '#22d3ee',
      stroke: '#cffafe',
      strokeWidth: 1,
    })

    snapshot.nodes.push({
      id: `s12-handle-min-${index}`,
      type: 'shape',
      shape: 'ellipse',
      x,
      y: yMin,
      width: 6,
      height: 6,
      fill: '#f97316',
      stroke: '#fed7aa',
      strokeWidth: 1,
    })

    if (prevMax) {
      snapshot.nodes.push({
        id: `s12-path-max-${index}`,
        type: 'shape',
        shape: 'line',
        x: prevMax.x,
        y: prevMax.y,
        width: x - prevMax.x,
        height: yMax - prevMax.y,
        stroke: '#22d3ee',
        strokeWidth: 2,
      })
    }

    if (prevMin) {
      snapshot.nodes.push({
        id: `s12-path-min-${index}`,
        type: 'shape',
        shape: 'line',
        x: prevMin.x,
        y: prevMin.y,
        width: x - prevMin.x,
        height: yMin - prevMin.y,
        stroke: '#f97316',
        strokeWidth: 2,
      })
    }

    prevMax = {x, y: yMax}
    prevMin = {x, y: yMin}
  })

  return snapshot
}

/**
 * Builds video editor scene from public stock time-series records.
 * @param revision Monotonic scene revision used by engine caching paths.
 * @param payload Parsed CSV payload from a free public endpoint.
 */
function buildVideoEditorScene(revision: number, payload: unknown): PlaygroundSceneSnapshot {
  const csvText = typeof payload === 'string' ? payload : ''
  const records = parseCsvRecords(csvText)

  const groupedBySymbol = new Map<string, Array<{timestamp: number; price: number}>>()
  for (const record of records) {
    const symbol = String(record.symbol ?? '')
    const timestamp = parseTimestamp(record.date)
    const price = Number(record.price)
    if (symbol.length === 0 || !Number.isFinite(timestamp) || !Number.isFinite(price)) {
      continue
    }
    const bucket = groupedBySymbol.get(symbol) ?? []
    bucket.push({timestamp, price})
    groupedBySymbol.set(symbol, bucket)
  }

  const symbols = Array.from(groupedBySymbol.keys()).slice(0, 5)
  const allPrices = symbols.flatMap((symbol) => groupedBySymbol.get(symbol)?.map((entry) => entry.price) ?? [])
  const priceBounds = resolveNumericBounds(allPrices.length > 0 ? allPrices : [1, 100])
  const snapshot = buildSceneScaffold(
    revision,
    'S13 Video Timeline Composition (Public Multi-Track Series)',
    'Dataset: vega stocks.csv -> timeline clips, playhead, and monitor composition proxy',
  )

  symbols.forEach((symbol, trackIndex) => {
    const trackY = 180 + trackIndex * 140
    const entries = (groupedBySymbol.get(symbol) ?? []).sort((a, b) => a.timestamp - b.timestamp).slice(-36)

    snapshot.nodes.push({
      id: `s13-track-label-${trackIndex}`,
      type: 'text',
      x: 86,
      y: trackY + 20,
      text: `${symbol} track`,
      style: {
        fontFamily: 'IBM Plex Sans',
        fontSize: 13,
        fill: '#a5b4fc',
      },
    })

    entries.forEach((entry, clipIndex) => {
      const nx = clipIndex / Math.max(1, entries.length - 1)
      const np = normalizeValue(entry.price, priceBounds)
      snapshot.nodes.push({
        id: `s13-clip-${trackIndex}-${clipIndex}`,
        type: 'shape',
        shape: 'rect',
        x: 250 + nx * 1220,
        y: trackY + 26,
        z: Math.round(np * 120),
        width: 22,
        height: 56,
        depth: Math.max(6, Math.round(np * 20)),
        cornerRadius: 4,
        fill: `hsl(${238 - Math.round(np * 85)} 70% ${34 + Math.round(np * 36)}%)`,
        stroke: '#c7d2fe',
        strokeWidth: 1,
      })
    })
  })

  const playheadX = 250 + ((revision % 100) / 100) * 1220
  snapshot.nodes.push({
    id: 's13-playhead',
    type: 'shape',
    shape: 'line',
    x: playheadX,
    y: 156,
    z: 180,
    width: 0,
    height: 740,
    stroke: '#f43f5e',
    strokeWidth: 3,
  })

  return snapshot
}

/**
 * Reads GeoJSON feature array from unknown payload.
 * @param payload Raw JSON payload fetched from public data endpoint.
 */
function readGeoJsonFeatures(payload: unknown): Array<Record<string, unknown>> {
  const features = (payload as {features?: unknown})?.features
  return Array.isArray(features)
    ? features.filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
    : []
}

/**
 * Reads the first polygon ring from one GeoJSON feature payload.
 * @param feature Raw feature payload from a GeoJSON feature collection.
 */
function readFirstPolygonRing(feature: Record<string, unknown>): Array<[number, number]> | null {
  const geometry = feature.geometry as {type?: unknown; coordinates?: unknown} | undefined
  if (!geometry || geometry.type !== 'Polygon' || !Array.isArray(geometry.coordinates)) {
    return null
  }

  const firstRing = geometry.coordinates[0]
  if (!Array.isArray(firstRing)) {
    return null
  }

  const ring: Array<[number, number]> = []
  for (const point of firstRing) {
    if (Array.isArray(point) && point.length >= 2) {
      const lon = Number(point[0])
      const lat = Number(point[1])
      if (Number.isFinite(lon) && Number.isFinite(lat)) {
        ring.push([lon, lat])
      }
    }
  }

  return ring.length > 0 ? ring : null
}

/**
 * Resolves one polygon centroid from coordinate ring points.
 * @param ring Ordered coordinate ring points.
 */
function resolvePolygonCentroid(ring: Array<[number, number]>): [number, number] {
  const totals = ring.reduce(
    (state, point) => ({x: state.x + point[0], y: state.y + point[1]}),
    {x: 0, y: 0},
  )
  return [totals.x / ring.length, totals.y / ring.length]
}

/**
 * Resolves one axis-aligned polygon bounds from coordinate ring points.
 * @param ring Ordered coordinate ring points.
 */
function resolvePolygonBounds(ring: Array<[number, number]>): {minX: number; maxX: number; minY: number; maxY: number} {
  let minX = ring[0][0]
  let maxX = ring[0][0]
  let minY = ring[0][1]
  let maxY = ring[0][1]

  for (const point of ring) {
    if (point[0] < minX) {
      minX = point[0]
    }
    if (point[0] > maxX) {
      maxX = point[0]
    }
    if (point[1] < minY) {
      minY = point[1]
    }
    if (point[1] > maxY) {
      maxY = point[1]
    }
  }

  return {minX, maxX, minY, maxY}
}

/**
 * Reads one earthquake point descriptor from GeoJSON feature payload.
 * @param feature Raw feature payload from a GeoJSON feature collection.
 */
function readPointGeometry(
  feature: Record<string, unknown>,
): {lon: number; lat: number; depth: number; magnitude: number} | null {
  const geometry = feature.geometry as {type?: unknown; coordinates?: unknown} | undefined
  if (!geometry || geometry.type !== 'Point' || !Array.isArray(geometry.coordinates) || geometry.coordinates.length < 3) {
    return null
  }

  const lon = Number(geometry.coordinates[0])
  const lat = Number(geometry.coordinates[1])
  const depth = Number(geometry.coordinates[2])
  const magnitude = Number((feature.properties as {mag?: unknown} | undefined)?.mag ?? 0)

  if (!Number.isFinite(lon) || !Number.isFinite(lat) || !Number.isFinite(depth) || !Number.isFinite(magnitude)) {
    return null
  }

  return {lon, lat, depth: Math.abs(depth), magnitude: Math.max(0, magnitude)}
}
