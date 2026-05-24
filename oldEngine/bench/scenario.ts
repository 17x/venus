import type {
  EngineImageNode,
  EngineSceneSnapshot,
  EngineShapeNode,
  EngineTextNode,
} from '../scene/types/types.ts'

const BENCHMARK_IMAGE_NODE_COUNT = 180
const BENCHMARK_TEXT_NODE_COUNT = 220
const BENCHMARK_SHAPE_NODE_COUNT = 180
const BENCHMARK_SCENE_REVISION = 1
const BENCHMARK_SCENE_WIDTH = 8_000
const BENCHMARK_SCENE_HEIGHT = 8_000
const BENCHMARK_VIEWPORT_WIDTH = 1280
const BENCHMARK_VIEWPORT_HEIGHT = 720
const BENCHMARK_INITIAL_SCALE = 2.4
const BENCHMARK_FRAME_COUNT = 90
const BENCHMARK_PAN_DELTA_X = 34
const BENCHMARK_PAN_DELTA_Y = -16

const IMAGE_GRID_COLUMNS = 18
const IMAGE_ORIGIN_X = 120
const IMAGE_ORIGIN_Y = 160
const IMAGE_COLUMN_SPACING = 380
const IMAGE_ROW_SPACING = 360
const IMAGE_WIDTH = 320
const IMAGE_HEIGHT = 240
const IMAGE_OPACITY = 0.96

const TEXT_GRID_COLUMNS = 20
const TEXT_ORIGIN_X = 100
const TEXT_ORIGIN_Y = 90
const TEXT_COLUMN_SPACING = 340
const TEXT_ROW_SPACING = 190
const TEXT_WIDTH = 280
const TEXT_HEIGHT = 32
const TEXT_FONT_SIZE = 18

const SHAPE_GRID_COLUMNS = 18
const SHAPE_ORIGIN_X = 80
const SHAPE_ORIGIN_Y = 140
const SHAPE_COLUMN_SPACING = 390
const SHAPE_ROW_SPACING = 350
const SHAPE_WIDTH = 140
const SHAPE_HEIGHT = 96
const SHAPE_ALTERNATE_KIND_MODULO = 2
const SHAPE_ALTERNATE_KIND_TRIGGER = 0
const SHAPE_ALTERNATE_FILL_MODULO = 3
const SHAPE_ALTERNATE_FILL_TRIGGER = 0
const SHAPE_STROKE_WIDTH = 1

/**
 * Defines the benchmark scenario shape used by the F-03 perf harness.
 */
export interface EngineBenchmarkScenario {
  /** Human-readable scenario name. */
  name: string
  /** Scene snapshot consumed by createEngine initialScene input. */
  scene: EngineSceneSnapshot
  /** Viewport width in CSS pixels. */
  viewportWidth: number
  /** Viewport height in CSS pixels. */
  viewportHeight: number
  /** Initial viewport scale used before pan stress begins. */
  initialScale: number
  /** Number of pan frames to run in sequence. */
  frameCount: number
  /** Pan delta X in CSS pixels per frame. */
  panDeltaX: number
  /** Pan delta Y in CSS pixels per frame. */
  panDeltaY: number
}

/**
 * Build a deterministic stress scenario matching F-03 target: large image + large text + high zoom + fast pan.
 */
export function createEngineBenchmarkScenario(): EngineBenchmarkScenario {
  const imageNodes = createImageNodes(BENCHMARK_IMAGE_NODE_COUNT)
  const textNodes = createTextNodes(BENCHMARK_TEXT_NODE_COUNT)
  const shapeNodes = createShapeNodes(BENCHMARK_SHAPE_NODE_COUNT)

  return {
    name: 'large-image-large-text-high-zoom-fast-pan',
    scene: {
      revision: BENCHMARK_SCENE_REVISION,
      width: BENCHMARK_SCENE_WIDTH,
      height: BENCHMARK_SCENE_HEIGHT,
      nodes: [...shapeNodes, ...imageNodes, ...textNodes],
    },
    viewportWidth: BENCHMARK_VIEWPORT_WIDTH,
    viewportHeight: BENCHMARK_VIEWPORT_HEIGHT,
    initialScale: BENCHMARK_INITIAL_SCALE,
    frameCount: BENCHMARK_FRAME_COUNT,
    panDeltaX: BENCHMARK_PAN_DELTA_X,
    panDeltaY: BENCHMARK_PAN_DELTA_Y,
  }
}

/**
 * Build deterministic image nodes distributed over a large document area.
  * @param count count parameter.
*/
function createImageNodes(count: number): EngineImageNode[] {
  const nodes: EngineImageNode[] = []

  for (let index = 0; index < count; index += 1) {
    const column = index % IMAGE_GRID_COLUMNS
    const row = Math.floor(index / IMAGE_GRID_COLUMNS)
    nodes.push({
      id: `bench-image-${String(index)}`,
      type: 'image',
      x: IMAGE_ORIGIN_X + column * IMAGE_COLUMN_SPACING,
      y: IMAGE_ORIGIN_Y + row * IMAGE_ROW_SPACING,
      width: IMAGE_WIDTH,
      height: IMAGE_HEIGHT,
      assetId: `asset-${String(index)}`,
      opacity: IMAGE_OPACITY,
      imageSmoothing: true,
    })
  }

  return nodes
}

/**
 * Build deterministic text nodes to stress glyph rasterization and fallback paths.
  * @param count count parameter.
*/
function createTextNodes(count: number): EngineTextNode[] {
  const nodes: EngineTextNode[] = []

  for (let index = 0; index < count; index += 1) {
    const column = index % TEXT_GRID_COLUMNS
    const row = Math.floor(index / TEXT_GRID_COLUMNS)
    nodes.push({
      id: `bench-text-${String(index)}`,
      type: 'text',
      x: TEXT_ORIGIN_X + column * TEXT_COLUMN_SPACING,
      y: TEXT_ORIGIN_Y + row * TEXT_ROW_SPACING,
      width: TEXT_WIDTH,
      height: TEXT_HEIGHT,
      style: {
        fontFamily: 'Arial',
        fontSize: TEXT_FONT_SIZE,
        fill: '#111111',
      },
      text: `Benchmark text node ${String(index)} with high-zoom pan stress`,
      cacheKey: `bench-text-cache-${String(index)}`,
    })
  }

  return nodes
}

/**
 * Build deterministic shape nodes so culling/frame-plan work reflects mixed node types.
  * @param count count parameter.
*/
function createShapeNodes(count: number): EngineShapeNode[] {
  const nodes: EngineShapeNode[] = []

  for (let index = 0; index < count; index += 1) {
    const column = index % SHAPE_GRID_COLUMNS
    const row = Math.floor(index / SHAPE_GRID_COLUMNS)
    nodes.push({
      id: `bench-shape-${String(index)}`,
      type: 'shape',
      shape: index % SHAPE_ALTERNATE_KIND_MODULO === SHAPE_ALTERNATE_KIND_TRIGGER ? 'rect' : 'ellipse',
      x: SHAPE_ORIGIN_X + column * SHAPE_COLUMN_SPACING,
      y: SHAPE_ORIGIN_Y + row * SHAPE_ROW_SPACING,
      width: SHAPE_WIDTH,
      height: SHAPE_HEIGHT,
      fill: index % SHAPE_ALTERNATE_FILL_MODULO === SHAPE_ALTERNATE_FILL_TRIGGER ? '#d6ebff' : '#f5f5f5',
      stroke: '#2c2c2c',
      strokeWidth: SHAPE_STROKE_WIDTH,
    })
  }

  return nodes
}
