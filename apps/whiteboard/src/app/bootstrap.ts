import {createEditorBootstrap, createEditorProductDescriptor} from '@venus/editor-product'

export const whiteboardDescriptor = createEditorProductDescriptor({
  id: 'whiteboard',
  title: 'Whiteboard',
  family: 'whiteboard',
})

export function bootstrapWhiteboard() {
  return createEditorBootstrap(whiteboardDescriptor)
}
