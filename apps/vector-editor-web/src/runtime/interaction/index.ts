// Bridge shared interaction primitives from the package-owned surface.
export * from '@venus/editor-primitive'

// Bridge vector-only interaction adapters that still live in app-local runtime code.
export * from '../../editor/runtime-local/interaction/index.ts'
