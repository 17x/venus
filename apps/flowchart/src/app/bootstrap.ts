import {createEditorBootstrap, createEditorProductDescriptor} from '@venus/editor-product'

export const flowchartDescriptor = createEditorProductDescriptor({
  id: 'flowchart',
  title: 'Flowchart Editor',
  family: 'flowchart',
})

export function bootstrapFlowchartEditor() {
  return createEditorBootstrap(flowchartDescriptor)
}
