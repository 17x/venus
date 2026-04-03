import {createEditorBootstrap, createEditorProductDescriptor} from '@venus/editor-product'

export const mindmapEditorDescriptor = createEditorProductDescriptor({
  id: 'mindmap-editor',
  title: 'Mindmap Editor',
  family: 'mindmap',
})

export function bootstrapMindmapEditor() {
  return createEditorBootstrap(mindmapEditorDescriptor)
}
