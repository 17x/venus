import assert from 'node:assert/strict'
import {describe, it} from 'node:test'

import type {
  EngineRenderableNode,
  EngineSceneSnapshot,
  EngineShapeKind,
  EngineShapeNode,
} from '../../scene/types/types.ts'
import {Venus, type VenusNode} from './Venus.ts'
import {
  createVenusExportModule,
  createVenusHistoryModule,
  createVenusInteractionModule,
} from './modules/index.ts'

interface DataUrlRecord {
  mime: string
  quality?: unknown
  width: number
  height: number
}

interface RecordingCanvasEnvironment {
  canvas: HTMLCanvasElement
  calls: string[]
  dataUrls: DataUrlRecord[]
}

interface ShapeFullChainCase {
  id: string
  create: VenusNode
  update: Record<string, unknown>
  expectedEngineShape: EngineShapeKind
  renderCall: string
  svgAfterUpdate: RegExp
  assertCreated(node: EngineShapeNode): void
  assertUpdated(node: EngineShapeNode): void
}

const SHAPE_CASES: readonly ShapeFullChainCase[] = [
  {
    id: 'chain-rect',
    create: {
      type: 'rect',
      id: 'chain-rect',
      x: 10,
      y: 12,
      width: 80,
      height: 50,
      fill: '#ef4444',
      stroke: '#7f1d1d',
      strokeWidth: 2,
      cornerRadius: 4,
    },
    update: {
      width: 96,
      fill: '#22c55e',
      cornerRadius: 10,
      rotation: 12,
    },
    expectedEngineShape: 'rect',
    renderCall: 'quadraticCurveTo',
    svgAfterUpdate: /<rect[^>]+id="chain-rect"[^>]+width="96"[^>]+rx="10"[^>]+fill="#22c55e"/,
    assertCreated(node) {
      assert.equal(node.width, 80)
      assert.equal(node.fill, '#ef4444')
      assert.equal(node.cornerRadius, 4)
    },
    assertUpdated(node) {
      assert.equal(node.width, 96)
      assert.equal(node.fill, '#22c55e')
      assert.equal(node.cornerRadius, 10)
      assert.ok(node.transform?.matrix, 'updated rect should keep a transform matrix for rotation')
    },
  },
  {
    id: 'chain-ellipse',
    create: {
      type: 'ellipse',
      id: 'chain-ellipse',
      x: 130,
      y: 16,
      width: 72,
      height: 48,
      fill: '#3b82f6',
      stroke: '#1e3a8a',
      strokeWidth: 3,
    },
    update: {
      ellipseGeometry: {cx: 172, cy: 48, rx: 42, ry: 28},
      fill: '#60a5fa',
    },
    expectedEngineShape: 'ellipse',
    renderCall: 'ellipse',
    svgAfterUpdate: /<ellipse[^>]+id="chain-ellipse"[^>]+cx="172"[^>]+rx="42"[^>]+fill="#60a5fa"/,
    assertCreated(node) {
      assert.equal(node.width, 72)
      assert.equal(node.height, 48)
      assert.equal(node.fill, '#3b82f6')
    },
    assertUpdated(node) {
      assert.deepEqual(node.ellipseGeometry, {cx: 172, cy: 48, rx: 42, ry: 28})
      assert.equal(node.fill, '#60a5fa')
    },
  },
  {
    id: 'chain-arc',
    create: {
      type: 'ellipse',
      id: 'chain-arc',
      x: 230,
      y: 10,
      width: 90,
      height: 70,
      fill: '#f97316',
      stroke: '#9a3412',
      strokeWidth: 2,
      ellipseStartAngle: 0,
      ellipseEndAngle: 210,
    },
    update: {
      ellipseEndAngle: 270,
      ellipseDrawWedgeLine: true,
      fill: '#fb923c',
    },
    expectedEngineShape: 'ellipse',
    renderCall: 'ellipse',
    svgAfterUpdate: /<path[^>]+id="chain-arc"[^>]+d="M 275 45 L 320 45 A 45 35 0 1 1 275 10 Z"[^>]+fill="#fb923c"/,
    assertCreated(node) {
      assert.equal(node.ellipseStartAngle, 0)
      assert.equal(node.ellipseEndAngle, 210)
      assert.equal(node.ellipseDrawWedgeLine, undefined)
    },
    assertUpdated(node) {
      assert.equal(node.ellipseEndAngle, 270)
      assert.equal(node.ellipseDrawWedgeLine, true)
      assert.equal(node.fill, '#fb923c')
    },
  },
  {
    id: 'chain-line',
    create: {
      type: 'line',
      id: 'chain-line',
      x: 30,
      y: 120,
      width: 90,
      height: 24,
      points: [
        {x: 30, y: 120},
        {x: 120, y: 144},
      ],
      stroke: '#0f172a',
      strokeWidth: 5,
    },
    update: {
      points: [
        {x: 36, y: 130},
        {x: 146, y: 162},
      ],
      stroke: '#475569',
      strokeWidth: 7,
    },
    expectedEngineShape: 'line',
    renderCall: 'lineTo',
    svgAfterUpdate: /<line[^>]+id="chain-line"[^>]+x1="36"[^>]+y1="130"[^>]+x2="146"[^>]+y2="162"[^>]+stroke="#475569"/,
    assertCreated(node) {
      assert.equal(node.points?.[0]?.x, 30)
      assert.equal(node.points?.[1]?.y, 144)
      assert.equal(node.strokeWidth, 5)
    },
    assertUpdated(node) {
      assert.equal(node.points?.[0]?.x, 36)
      assert.equal(node.points?.[1]?.x, 146)
      assert.equal(node.strokeWidth, 7)
    },
  },
  {
    id: 'chain-polygon',
    create: {
      type: 'polygon',
      id: 'chain-polygon',
      x: 170,
      y: 110,
      width: 90,
      height: 80,
      points: [
        {x: 215, y: 110},
        {x: 260, y: 190},
        {x: 170, y: 190},
      ],
      fill: '#a855f7',
      stroke: '#581c87',
      strokeWidth: 2,
    },
    update: {
      points: [
        {x: 218, y: 104},
        {x: 268, y: 194},
        {x: 162, y: 194},
      ],
      fill: '#c084fc',
    },
    expectedEngineShape: 'polygon',
    renderCall: 'lineTo',
    svgAfterUpdate: /<polygon[^>]+id="chain-polygon"[^>]+points="218,104 268,194 162,194"[^>]+fill="#c084fc"/,
    assertCreated(node) {
      assert.equal(node.shape, 'polygon')
      assert.equal(node.points?.length, 3)
      assert.equal(node.closed, true)
    },
    assertUpdated(node) {
      assert.equal(node.points?.[0]?.x, 218)
      assert.equal(node.points?.[1]?.y, 194)
      assert.equal(node.fill, '#c084fc')
    },
  },
  {
    id: 'chain-star',
    create: {
      type: 'star',
      id: 'chain-star',
      x: 310,
      y: 100,
      width: 100,
      height: 100,
      points: [
        {x: 360, y: 100},
        {x: 372, y: 136},
        {x: 410, y: 136},
        {x: 380, y: 158},
        {x: 392, y: 200},
        {x: 360, y: 174},
        {x: 328, y: 200},
        {x: 340, y: 158},
        {x: 310, y: 136},
        {x: 348, y: 136},
      ],
      fill: '#facc15',
      stroke: '#854d0e',
      strokeWidth: 2,
    },
    update: {
      points: [
        {x: 360, y: 92},
        {x: 376, y: 136},
        {x: 418, y: 136},
        {x: 384, y: 160},
        {x: 396, y: 208},
        {x: 360, y: 178},
        {x: 324, y: 208},
        {x: 336, y: 160},
        {x: 302, y: 136},
        {x: 344, y: 136},
      ],
      fill: '#fde047',
    },
    expectedEngineShape: 'star',
    renderCall: 'lineTo',
    svgAfterUpdate: /<path[^>]+id="chain-star"[^>]+d="M 360 92 L 376 136 L 418 136 L 384 160 L 396 208 L 360 178 L 324 208 L 336 160 L 302 136 L 344 136 Z"[^>]+fill="#fde047"/,
    assertCreated(node) {
      assert.equal(node.shape, 'star')
      assert.equal(node.points?.length, 10)
      assert.equal(node.closed, true)
    },
    assertUpdated(node) {
      assert.equal(node.shape, 'star')
      assert.equal(node.points?.[0]?.y, 92)
      assert.equal(node.fill, '#fde047')
    },
  },
  {
    id: 'chain-path-points',
    create: {
      type: 'path',
      id: 'chain-path-points',
      x: 30,
      y: 230,
      width: 110,
      height: 70,
      points: [
        {x: 30, y: 230},
        {x: 82, y: 300},
        {x: 140, y: 242},
      ],
      closed: false,
      fill: '#14b8a6',
      stroke: '#134e4a',
      strokeWidth: 3,
    },
    update: {
      points: [
        {x: 34, y: 226},
        {x: 88, y: 306},
        {x: 148, y: 238},
      ],
      closed: true,
      fill: '#2dd4bf',
    },
    expectedEngineShape: 'path',
    renderCall: 'lineTo',
    svgAfterUpdate: /<path[^>]+id="chain-path-points"[^>]+d="M 34 226 L 88 306 L 148 238 Z"[^>]+fill="#2dd4bf"/,
    assertCreated(node) {
      assert.equal(node.closed, false)
      assert.equal(node.points?.length, 3)
    },
    assertUpdated(node) {
      assert.equal(node.closed, true)
      assert.equal(node.points?.[1]?.y, 306)
      assert.equal(node.fill, '#2dd4bf')
    },
  },
  {
    id: 'chain-path-bezier',
    create: {
      type: 'path',
      id: 'chain-path-bezier',
      x: 200,
      y: 230,
      width: 130,
      height: 80,
      bezierPoints: [
        {anchor: {x: 200, y: 290}, cp2: {x: 230, y: 220}},
        {anchor: {x: 280, y: 250}, cp1: {x: 250, y: 320}, cp2: {x: 310, y: 180}},
        {anchor: {x: 330, y: 290}, cp1: {x: 320, y: 330}},
      ],
      closed: false,
      fill: 'none',
      stroke: '#be123c',
      strokeWidth: 4,
    },
    update: {
      bezierPoints: [
        {anchor: {x: 202, y: 292}, cp2: {x: 236, y: 214}},
        {anchor: {x: 286, y: 246}, cp1: {x: 252, y: 324}, cp2: {x: 316, y: 176}},
        {anchor: {x: 338, y: 292}, cp1: {x: 326, y: 336}},
      ],
      stroke: '#e11d48',
    },
    expectedEngineShape: 'path',
    renderCall: 'bezierCurveTo',
    svgAfterUpdate: /<path[^>]+id="chain-path-bezier"[^>]+d="M 202 292 C 236 214 252 324 286 246 C 316 176 326 336 338 292"[^>]+stroke="#e11d48"/,
    assertCreated(node) {
      assert.equal(node.bezierPoints?.length, 3)
      assert.equal(node.strokeWidth, 4)
    },
    assertUpdated(node) {
      assert.equal(node.bezierPoints?.[0]?.anchor.x, 202)
      assert.equal(node.bezierPoints?.[1]?.cp2?.y, 176)
      assert.equal(node.stroke, '#e11d48')
    },
  },
]

describe('Venus shape full-chain contracts', () => {
  for (const shapeCase of SHAPE_CASES) {
    it(`${shapeCase.id} supports create, update, delete, history restore, render, PNG export, and SVG export`, async () => {
      const environment = createRecordingCanvasEnvironment()
      const venus = createFullChainVenus()
      venus.mount(environment.canvas)

      venus.add(shapeCase.create)
      const createdNode = assertShapeSnapshot(venus.snapshot(), shapeCase.id, shapeCase.expectedEngineShape)
      shapeCase.assertCreated(createdNode)
      assert.match(await venus.exportSVG(), new RegExp(`id="${shapeCase.id}"`))

      venus.update(shapeCase.id, shapeCase.update as Partial<VenusNode>)
      const updatedNode = assertShapeSnapshot(venus.snapshot(), shapeCase.id, shapeCase.expectedEngineShape)
      shapeCase.assertUpdated(updatedNode)
      const svgAfterUpdate = await venus.exportSVG()
      assert.match(svgAfterUpdate, shapeCase.svgAfterUpdate)
      assert.match(await venus.exportNode(shapeCase.id), new RegExp(`id="${shapeCase.id}"`))

      environment.calls.length = 0
      await venus.render()
      assert.equal(environment.calls.includes(shapeCase.renderCall), true, `${shapeCase.id} should render through ${shapeCase.renderCall}`)
      assert.equal(environment.calls.includes('fill') || environment.calls.includes('stroke'), true)

      const png = await venus.exportPNG({scale: 2, background: '#ffffff'})
      assert.match(png, /^data:image\/png/)
      assert.equal(environment.dataUrls.at(-1)?.mime, 'image/png')

      venus.remove(shapeCase.id)
      assert.equal(findEngineNode(venus.snapshot(), shapeCase.id), null)
      assert.doesNotMatch(await venus.exportSVG(), new RegExp(`id="${shapeCase.id}"`))
      await venus.render()

      assert.equal(venus.undo(), true, 'undo should restore the deleted updated shape')
      shapeCase.assertUpdated(assertShapeSnapshot(venus.snapshot(), shapeCase.id, shapeCase.expectedEngineShape))
      assert.match(await venus.exportSVG(), new RegExp(`id="${shapeCase.id}"`))

      assert.equal(venus.undo(), true, 'undo should restore the pre-update shape data')
      shapeCase.assertCreated(assertShapeSnapshot(venus.snapshot(), shapeCase.id, shapeCase.expectedEngineShape))

      assert.equal(venus.redo(), true, 'redo should reapply the shape update')
      shapeCase.assertUpdated(assertShapeSnapshot(venus.snapshot(), shapeCase.id, shapeCase.expectedEngineShape))

      assert.equal(venus.redo(), true, 'redo should reapply shape deletion')
      assert.equal(findEngineNode(venus.snapshot(), shapeCase.id), null)

      assert.equal(venus.undo(), true, 'final undo should leave the updated shape restored')
      shapeCase.assertUpdated(assertShapeSnapshot(venus.snapshot(), shapeCase.id, shapeCase.expectedEngineShape))
    })
  }

  it('exports grouped, clipped, masked, and selected shape combinations through render, raster, and SVG paths', async () => {
    const environment = createRecordingCanvasEnvironment()
    const venus = createFullChainVenus({interaction: true})
    venus.mount(environment.canvas)

    venus.add({type: 'rect', id: 'combo-rect', x: 12, y: 20, width: 70, height: 42, fill: '#22c55e'})
    venus.add({type: 'ellipse', id: 'combo-ellipse', x: 100, y: 24, width: 64, height: 44, fill: '#60a5fa'})
    venus.add({
      type: 'line',
      id: 'combo-line',
      x: 190,
      y: 28,
      width: 70,
      height: 36,
      points: [{x: 190, y: 28}, {x: 260, y: 64}],
      stroke: '#111827',
      strokeWidth: 4,
    })
    venus.add({
      type: 'polygon',
      id: 'combo-polygon',
      x: 18,
      y: 92,
      width: 74,
      height: 68,
      points: [{x: 54, y: 92}, {x: 92, y: 160}, {x: 18, y: 160}],
      fill: '#c084fc',
    })
    venus.add({
      type: 'star',
      id: 'combo-star',
      x: 112,
      y: 88,
      width: 82,
      height: 82,
      points: [
        {x: 153, y: 88},
        {x: 164, y: 118},
        {x: 194, y: 118},
        {x: 170, y: 136},
        {x: 180, y: 170},
        {x: 153, y: 150},
        {x: 126, y: 170},
        {x: 136, y: 136},
        {x: 112, y: 118},
        {x: 142, y: 118},
      ],
      fill: '#fde047',
    })
    venus.add({
      type: 'path',
      id: 'combo-path',
      x: 220,
      y: 90,
      width: 90,
      height: 70,
      bezierPoints: [
        {anchor: {x: 220, y: 148}, cp2: {x: 244, y: 82}},
        {anchor: {x: 310, y: 132}, cp1: {x: 276, y: 172}},
      ],
      stroke: '#e11d48',
      strokeWidth: 4,
      fill: 'none',
    })

    const group = venus.group(['combo-rect', 'combo-ellipse', 'combo-line'], {id: 'combo-group'})
    assert.equal(group.id, 'combo-group')

    venus.add({
      type: 'clip',
      id: 'combo-clip',
      clipPath: {
        type: 'polygon',
        id: 'combo-clip-path',
        x: 330,
        y: 24,
        width: 90,
        height: 80,
        points: [{x: 330, y: 24}, {x: 420, y: 24}, {x: 375, y: 104}],
      },
      children: [
        {type: 'rect', id: 'combo-clipped-rect', x: 330, y: 24, width: 90, height: 80, fill: '#f97316'},
      ],
    })
    venus.add({
      type: 'mask',
      id: 'combo-mask',
      clipPath: {type: 'ellipse', id: 'combo-mask-path', x: 450, y: 24, width: 88, height: 70},
      children: [
        {
          type: 'star',
          id: 'combo-masked-star',
          x: 450,
          y: 20,
          width: 90,
          height: 90,
          points: [{x: 495, y: 20}, {x: 510, y: 64}, {x: 540, y: 64}, {x: 515, y: 82}, {x: 525, y: 110}],
          fill: '#facc15',
        },
      ],
    })

    const snapshot = venus.snapshot()
    assertShapeSnapshot(snapshot, 'combo-star', 'star')
    assertShapeSnapshot(snapshot, 'combo-path', 'path')
    assert.equal(findEngineNode(snapshot, 'combo-group')?.type, 'group')
    assert.equal(findEngineNode(snapshot, 'combo-clip')?.type, 'group')
    assert.equal(findEngineNode(snapshot, 'combo-mask')?.type, 'group')

    environment.calls.length = 0
    await venus.render()
    assert.equal(environment.calls.includes('clip'), true)
    assert.equal(environment.calls.includes('bezierCurveTo'), true)
    assert.equal(environment.calls.includes('ellipse'), true)

    const svg = await venus.exportSVG()
    assert.match(svg, /<g[^>]+id="combo-group"/)
    assert.match(svg, /id="combo-rect"/)
    assert.match(svg, /id="combo-ellipse"/)
    assert.match(svg, /id="combo-line"/)
    assert.match(svg, /<path[^>]+id="combo-star"/)
    assert.match(svg, /<path[^>]+id="combo-path"[^>]+d="M 220 148 C 244 82 276 172 310 132"/)
    assert.match(svg, /<g[^>]+id="combo-clip"[^>]+clip-path="url\(#venus-clip-\d+\)"/)
    assert.match(svg, /<clipPath[^>]*><path[^>]+d="M 330 24 L 420 24 L 375 104 Z"/)
    assert.match(svg, /<g[^>]+id="combo-mask"[^>]+clip-path="url\(#venus-clip-\d+\)"/)

    const groupSvg = await venus.exportNode('combo-group')
    assert.match(groupSvg, /id="combo-group"/)
    assert.match(groupSvg, /id="combo-rect"/)
    assert.doesNotMatch(groupSvg, /id="combo-polygon"/)

    venus.setSelection(['combo-ellipse', 'combo-path'])
    const selectionSvg = await venus.exportSelection()
    assert.match(selectionSvg, /id="combo-group"/)
    assert.match(selectionSvg, /id="combo-ellipse"/)
    assert.match(selectionSvg, /id="combo-path"/)
    assert.doesNotMatch(selectionSvg, /id="combo-rect"/)

    assert.match(await venus.exportPNG({scale: 1.5, background: '#ffffff'}), /^data:image\/png/)
    assert.match(await venus.exportJPEG({quality: 0.75}), /^data:image\/jpeg/)
    assert.equal(environment.dataUrls.at(-2)?.mime, 'image/png')
    assert.equal(environment.dataUrls.at(-1)?.mime, 'image/jpeg')
    assert.equal(environment.dataUrls.at(-1)?.quality, 0.75)
  })
})

function createFullChainVenus(options: {interaction?: boolean} = {}): Venus {
  return new Venus({
    render: {
      backend: 'canvas2d',
      quality: 'full',
    },
    culling: false,
    lod: false,
    modules: [
      createVenusHistoryModule(),
      createVenusExportModule(),
      ...(options.interaction ? [createVenusInteractionModule()] : []),
    ],
  })
}

function assertShapeSnapshot(
  snapshot: EngineSceneSnapshot,
  id: string,
  expectedShape: EngineShapeKind,
): EngineShapeNode {
  const node = findEngineNode(snapshot, id)
  assert.ok(node, `expected node ${id} in snapshot`)
  assert.equal(node.type, 'shape')
  assert.equal(node.shape, expectedShape)
  return node
}

function findEngineNode(
  snapshot: EngineSceneSnapshot,
  id: string,
): EngineRenderableNode | null {
  const visit = (node: EngineRenderableNode): EngineRenderableNode | null => {
    if (node.id === id) {
      return node
    }
    if (node.type === 'group') {
      for (const child of node.children) {
        const found = visit(child)
        if (found) {
          return found
        }
      }
    }
    return null
  }

  for (const node of snapshot.nodes) {
    const found = visit(node)
    if (found) {
      return found
    }
  }
  return null
}

function createRecordingCanvasEnvironment(
  width = 640,
  height = 480,
): RecordingCanvasEnvironment {
  const calls: string[] = []
  const dataUrls: DataUrlRecord[] = []
  const canvas = new RecordingCanvas(width, height, calls, dataUrls)
  return {
    canvas: canvas as unknown as HTMLCanvasElement,
    calls,
    dataUrls,
  }
}

class RecordingCanvas {
  style: Record<string, unknown> = {}
  ownerDocument = {
    createElement: (tagName: string) => {
      assert.equal(tagName, 'canvas')
      return new RecordingCanvas(1, 1, this.calls, this.dataUrls)
    },
  }

  private readonly context: RecordingCanvas2DContext

  constructor(
    public width: number,
    public height: number,
    private readonly calls: string[],
    private readonly dataUrls: DataUrlRecord[],
  ) {
    this.context = new RecordingCanvas2DContext(calls)
  }

  getContext(kind: string): RecordingCanvas2DContext | null {
    if (kind === '2d') {
      return this.context
    }
    return null
  }

  toDataURL(mime = 'image/png', quality?: unknown): string {
    this.dataUrls.push({
      mime,
      quality,
      width: this.width,
      height: this.height,
    })
    return `data:${mime};base64,venus-shape-chain-${this.dataUrls.length}`
  }
}

class RecordingCanvasGradient {
  constructor(private readonly calls: string[]) {}

  addColorStop(): void {
    this.calls.push('addColorStop')
  }
}

class RecordingCanvas2DContext {
  imageSmoothingEnabled = true
  imageSmoothingQuality: ImageSmoothingQuality = 'high'
  globalAlpha = 1
  globalCompositeOperation: GlobalCompositeOperation = 'source-over'
  fillStyle: unknown = '#000000'
  strokeStyle: unknown = '#000000'
  lineWidth = 1
  lineCap: CanvasLineCap = 'butt'
  lineJoin: CanvasLineJoin = 'miter'
  font = ''
  textAlign: CanvasTextAlign = 'start'
  textBaseline: CanvasTextBaseline = 'alphabetic'
  shadowColor = 'transparent'
  shadowBlur = 0
  shadowOffsetX = 0
  shadowOffsetY = 0
  filter = 'none'

  constructor(private readonly calls: string[]) {}

  setTransform(): void { this.record('setTransform') }
  clearRect(): void { this.record('clearRect') }
  fillRect(): void { this.record('fillRect') }
  drawImage(): void { this.record('drawImage') }
  save(): void { this.record('save') }
  restore(): void { this.record('restore') }
  beginPath(): void { this.record('beginPath') }
  rect(): void { this.record('rect') }
  roundRect(): void { this.record('roundRect') }
  ellipse(): void { this.record('ellipse') }
  moveTo(): void { this.record('moveTo') }
  lineTo(): void { this.record('lineTo') }
  bezierCurveTo(): void { this.record('bezierCurveTo') }
  quadraticCurveTo(): void { this.record('quadraticCurveTo') }
  closePath(): void { this.record('closePath') }
  clip(): void { this.record('clip') }
  fill(): void { this.record('fill') }
  stroke(): void { this.record('stroke') }
  translate(): void { this.record('translate') }
  rotate(): void { this.record('rotate') }
  scale(): void { this.record('scale') }
  transform(): void { this.record('transform') }
  arc(): void { this.record('arc') }
  fillText(): void { this.record('fillText') }
  strokeText(): void { this.record('strokeText') }
  setLineDash(): void { this.record('setLineDash') }
  getLineDash(): number[] { return [] }

  createLinearGradient(): RecordingCanvasGradient {
    this.record('createLinearGradient')
    return new RecordingCanvasGradient(this.calls)
  }

  createRadialGradient(): RecordingCanvasGradient {
    this.record('createRadialGradient')
    return new RecordingCanvasGradient(this.calls)
  }

  measureText(text: string): TextMetrics {
    return {
      width: text.length * 10,
      actualBoundingBoxAscent: 8,
      actualBoundingBoxDescent: 2,
    } as TextMetrics
  }

  private record(name: string): void {
    this.calls.push(name)
  }
}
