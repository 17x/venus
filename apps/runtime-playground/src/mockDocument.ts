import type {DocumentNode, EditorDocument} from '@venus/document-core'

const SHAPES: DocumentNode[] = [
  {
    id: 'frame-root',
    type: 'frame',
    name: 'Runtime Frame',
    x: 0,
    y: 0,
    width: 1200,
    height: 800,
  },
  {
    id: 'shape-rect',
    type: 'rectangle',
    name: 'Rectangle',
    x: 120,
    y: 120,
    width: 240,
    height: 160,
  },
  {
    id: 'shape-ellipse',
    type: 'ellipse',
    name: 'Ellipse',
    x: 460,
    y: 180,
    width: 200,
    height: 140,
  },
  {
    id: 'shape-text',
    type: 'text',
    name: 'Runtime Playground',
    x: 260,
    y: 420,
    width: 300,
    height: 72,
  }
]

export const MOCK_DOCUMENT: EditorDocument = {
  id: 'runtime-playground-document',
  name: 'Runtime Playground',
  width: 1200,
  height: 800,
  shapes: SHAPES,
}
