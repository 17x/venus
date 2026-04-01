import type { EditorDocument } from '@venus/editor-core'

export function createStarterDocument(): EditorDocument {
  return {
    id: 'doc-1',
    name: 'A4',
    width: 640,
    height: 920,
    shapes: [
      {
        id: 'shape-1',
        type: 'rectangle',
        name: 'rectangle',
        x: 110,
        y: 90,
        width: 160,
        height: 160,
      },
      {
        id: 'shape-2',
        type: 'rectangle',
        name: 'rectangle',
        x: 340,
        y: 300,
        width: 160,
        height: 160,
      },
      {
        id: 'shape-3',
        type: 'rectangle',
        name: 'rectangle',
        x: 110,
        y: 400,
        width: 160,
        height: 160,
      },
    ],
  }
}
