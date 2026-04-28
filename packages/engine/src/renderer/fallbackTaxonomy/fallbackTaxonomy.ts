// Canonical fallback reason taxonomy used across renderer cache/quality lanes.
export const ENGINE_RENDER_FALLBACK_REASON = {
  NONE: 'none',
  L0_NO_SNAPSHOT: 'l0-no-snapshot',
  L0_PREVIEW_MISS: 'l0-preview-miss',
  L0_REVISION_MISMATCH: 'l0-revision-mismatch',
  L0_VIEWPORT_WIDTH_MISMATCH: 'l0-viewport-width-mismatch',
  L0_VIEWPORT_HEIGHT_MISMATCH: 'l0-viewport-height-mismatch',
  L0_PIXEL_RATIO_MISMATCH: 'l0-pixel-ratio-mismatch',
  L0_INVALID_SCALE_RATIO: 'l0-invalid-scale-ratio',
  L0_ZOOM_ONLY_PAN_BLOCKED: 'l0-zoom-only-pan-blocked',
  L0_SCALE_STEP_EXCEEDED: 'l0-scale-step-exceeded',
  L0_TRANSLATE_EXCEEDED: 'l0-translate-exceeded',
  L1_BYPASS_INTERACTIVE: 'l1-bypass-interactive',
  L1_DISABLED: 'l1-disabled',
  L2_TILE_SEED_UPLOAD_FAILED: 'l2-tile-seed-upload-failed',
  L2_TILE_PARTIAL_REGION_CANVAS_CROP: 'l2-tile-partial-region-canvas-crop',
  L2_TILE_FRAMEBUFFER_COPY_FALLBACK_CANVAS: 'l2-tile-framebuffer-copy-fallback-canvas',
  L2_TILE_FRAMEBUFFER_COPY_FAILED: 'l2-tile-framebuffer-copy-failed',
  L2_TILE_SOURCE_BUILD_FAILED: 'l2-tile-source-build-failed',
  L2_BYPASS_VISIBLE_TILE_PRESSURE: 'l2-bypass-visible-tile-pressure',
  L2_TILE_FALLBACK_TO_COMPOSITE: 'l2-tile-fallback-to-composite',
  L3_BUDGET_DRAW_SUBMIT_CAP: 'l3-budget-draw-submit-cap',
  L3_EMPTY_FRAME_MODEL_FALLBACK: 'l3-empty-frame-model-fallback',
} as const

// Union type for all accepted fallback reasons emitted by renderer paths.
export type EngineRenderFallbackReason =
  (typeof ENGINE_RENDER_FALLBACK_REASON)[keyof typeof ENGINE_RENDER_FALLBACK_REASON]
