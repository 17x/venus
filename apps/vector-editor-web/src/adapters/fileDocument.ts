import type {EditorDocument, ShapeRecord, ShapeType} from '@venus/editor-core'
import type {ElementProps} from '@lite-u/editor/types'
import type {VisionFileType} from '../hooks/useEditorRuntime.ts'

const PAGE_FRAME_SUFFIX = ':page-frame'

function resolveShapeType(type: string | undefined): ShapeType {
  if (type === 'frame' || type === 'rectangle' || type === 'ellipse' || type === 'text') {
    return type
  }

  return 'rectangle'
}

function toDocumentShape(element: ElementProps): ShapeRecord {
  const width = Number(element.width ?? 0)
  const height = Number(element.height ?? 0)
  const x = Number(element.x ?? ((element.cx ?? 0) - width / 2))
  const y = Number(element.y ?? ((element.cy ?? 0) - height / 2))

  return {
    id: element.id,
    type: resolveShapeType(element.type),
    name: String(element.name ?? element.type ?? 'shape'),
    x,
    y,
    width,
    height,
  }
}

export function createEditorDocumentFromFile(file: VisionFileType): EditorDocument {
  const pageFrame: ShapeRecord = {
    id: `${file.id}${PAGE_FRAME_SUFFIX}`,
    type: 'frame',
    name: file.name,
    x: 0,
    y: 0,
    width: file.config.page.width,
    height: file.config.page.height,
  }

  return {
    id: file.id,
    name: file.name,
    width: file.config.page.width,
    height: file.config.page.height,
    shapes: [pageFrame, ...file.elements.map(toDocumentShape)],
  }
}

export function createFileElementsFromDocument(document: EditorDocument): ElementProps[] {
  return document.shapes
    .filter((shape) => !(shape.type === 'frame' && shape.id.endsWith(PAGE_FRAME_SUFFIX)))
    .map((shape, index) => ({
      id: shape.id,
      type: shape.type,
      name: shape.name,
      layer: index,
      x: shape.x,
      y: shape.y,
      width: shape.width,
      height: shape.height,
      rotation: 0,
      opacity: 1,
      fill: {
        enabled: shape.type !== 'text',
        color: '#ffffff',
      },
      stroke: {
        enabled: true,
        color: '#000000',
        weight: 1,
      },
    }))
}
