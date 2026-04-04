import {VisionFileType} from '../../hooks/useEditorRuntime.ts'

const rect0 = {
  id: 'rectangle0',
  type: 'rectangle',
  layer: 0,
  cx: 100,
  cy: 100,
  width: 100,
  height: 100,
  rotation: 0,
  fill: {
    enabled: true,
    color: '#ffffff',
  },
  stroke: {
    enabled: true,
    weight: 1,
    color: '#000000',
  },
}

const rect1 = {
  ...rect0,
  id: 'rectangle1',
  cx: 240,
}

const rect2 = {
  ...rect0,
  id: 'rectangle2',
  cy: 240,
}

const ellipse0 = {
  ...rect0,
  id: 'ellipse0',
  type: 'ellipse',
  cx: 420,
  cy: 180,
  width: 140,
  height: 140,
}

const lineSegment0 = {
  ...rect0,
  id: 'lineSegment0',
  type: 'lineSegment',
  cx: 520,
  cy: 340,
  width: 180,
  height: 100,
  fill: {
    enabled: false,
    color: '#ffffff',
  },
}

const path0 = {
  ...rect0,
  id: 'path0',
  type: 'path',
  name: 'Path',
  x: 160,
  y: 360,
  width: 180,
  height: 120,
  points: [
    {x: 160, y: 420},
    {x: 210, y: 372},
    {x: 260, y: 404},
    {x: 308, y: 360},
    {x: 340, y: 450},
  ],
  bezierPoints: [
    {anchor: {x: 160, y: 420}, cp2: {x: 184, y: 380}},
    {anchor: {x: 210, y: 372}, cp1: {x: 194, y: 380}, cp2: {x: 238, y: 396}},
    {anchor: {x: 260, y: 404}, cp1: {x: 242, y: 392}, cp2: {x: 286, y: 360}},
    {anchor: {x: 308, y: 360}, cp1: {x: 290, y: 366}, cp2: {x: 320, y: 398}},
    {anchor: {x: 340, y: 450}, cp1: {x: 330, y: 414}},
  ],
  fill: {
    enabled: false,
    color: '#ffffff',
  },
}

const text0 = {
  ...rect0,
  id: 'text0',
  type: 'text',
  name: 'Vector text baseline',
  x: 470,
  y: 90,
  width: 220,
  height: 40,
  fill: {
    enabled: false,
    color: '#ffffff',
  },
}

export const MOCK_FILE: VisionFileType = {
  id: 'mock-file',
  name: 'Untitled',
  version: '0.0.0',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  config: {
    page: {
      unit: 'px',
      width: 800,
      height: 600,
      dpi: 72,
    },
  },
  elements: [rect0, rect1, rect2, ellipse0, lineSegment0, path0, text0],
  assets: [],
}
