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
  elements: [rect0, rect1, rect2],
  assets: [],
}
