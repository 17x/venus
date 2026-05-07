export {
  mapEditorPrimitiveCapabilityDetails,
  validateEditorPrimitiveCapabilities,
  type EditorPrimitiveCapabilityModule,
  type EditorPrimitiveCapabilityReport,
  type EditorPrimitiveCapabilityResult,
} from './capabilityValidation.ts'

// Re-export overlay-control adapter so consumers can import from the primitive barrel.
export * from './overlayControl/index.ts'
