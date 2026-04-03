import {createEditorBootstrap, createEditorProductDescriptor} from '@venus/editor-product'

export const streamlineEditorDescriptor = createEditorProductDescriptor({
  id: 'streamline-editor',
  title: 'Streamline Editor',
  family: 'streamline',
})

export function bootstrapStreamlineEditor() {
  return createEditorBootstrap(streamlineEditorDescriptor)
}
