/**
 * GPU domain barrel aligned with the 2D->3D architecture blueprint.
 * Exposes backend entry points while keeping render orchestration backend-agnostic.
 */
export * from './webgl/index.ts'
export * from './webgpu/index.ts'
export * from './canvas/index.ts'
