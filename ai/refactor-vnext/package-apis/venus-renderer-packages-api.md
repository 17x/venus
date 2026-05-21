# Renderer Packages Public APIs (Proposed)

Status: Proposed contracts (packages not created yet)
Related plan: `ai/refactor-vnext/repo-refactor-management.md`

## Target Packages

- `@venus/renderer-canvas2d`
- `@venus/renderer-webgl`
- `@venus/renderer-webgpu`

## Shared Backend Contract (Proposed)

### `RendererBackend`

- `initialize(context)`
- `resize(width, height)`
- `execute(framePacket)`
- `flushUploads(uploadPacket)`
- `captureFrame()`
- `dispose()`

### `BackendCapabilities`

- shader/pipeline features
- texture format support
- depth/stencil options
- timestamp/profiler support

### `BackendDiagnostics`

- submit count
- upload bytes
- fallback reason
- frame timing summary

## Boundary Rules

- Renderer packages execute packets; they do not own document state.
- Renderer packages do not own interaction/tool logic.
- Backend selection policy remains in engine/runtime orchestration layer.
