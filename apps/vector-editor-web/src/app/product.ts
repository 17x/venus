export const vectorEditorDescriptor = {
  id: 'vector-editor-web',
  title: 'Vector Editor Web',
  family: 'vector',
  stack: {
    runtime: '@venus/runtime',
    worker: '@venus/runtime/worker',
    renderer: '@venus/engine',
    model: '@venus/document-core',
    sharedMemory: '@venus/shared-memory',
    protocol: '@venus/file-format',
  },
} as const
