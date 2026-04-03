export type EditorProductId =
  | 'vector-editor-web'
  | 'mindmap-editor'
  | 'streamline-editor'
  | 'flowchart'
  | 'whiteboard'

export interface SharedEditorStack {
  runtime: '@venus/canvas-base'
  worker: '@venus/editor-worker'
  renderer: '@venus/renderer-skia'
  model: '@venus/document-core'
  sharedMemory: '@venus/shared-memory'
  protocol: '@venus/file-format'
}

export interface EditorProductDescriptor {
  id: EditorProductId
  title: string
  family: 'vector' | 'mindmap' | 'streamline' | 'flowchart' | 'whiteboard'
  stack: SharedEditorStack
}

export interface EditorBootstrapResult {
  descriptor: EditorProductDescriptor
  status: 'scaffold' | 'ready'
}

export const SHARED_EDITOR_STACK: SharedEditorStack = {
  runtime: '@venus/canvas-base',
  worker: '@venus/editor-worker',
  renderer: '@venus/renderer-skia',
  model: '@venus/document-core',
  sharedMemory: '@venus/shared-memory',
  protocol: '@venus/file-format',
}

export function createEditorProductDescriptor(
  input: Omit<EditorProductDescriptor, 'stack'>,
): EditorProductDescriptor {
  return {
    ...input,
    stack: SHARED_EDITOR_STACK,
  }
}

export function createEditorBootstrap(
  descriptor: EditorProductDescriptor,
  status: EditorBootstrapResult['status'] = 'scaffold',
): EditorBootstrapResult {
  return {
    descriptor,
    status,
  }
}
