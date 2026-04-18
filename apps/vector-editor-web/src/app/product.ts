export const vectorEditorDescriptor = {
  id: 'vector-editor-web',
  title: 'Vector Editor Web',
  family: 'vector',
  stack: {
    runtime: '@vector/runtime',
    worker: '@vector/runtime/worker',
    renderer: '@venus/engine',
    model: '@venus/document-core',
    sharedMemory: '@vector/runtime/shared-memory',
    protocol: '@venus/document-core',
  },
} as const
