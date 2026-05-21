# Backend Capability Matrix

This document defines capability differences and operational constraints across backend implementations.

## Backend Profiles

- WebGPU: preferred high-performance backend with explicit resource and synchronization support.
- WebGL: broad browser compatibility backend with reduced explicit control.
- Canvas2D: fallback backend for planar rendering and compatibility scenarios.
- Headless: deterministic offscreen backend for CI, snapshot, and replay workflows.

## Feature Matrix

| Capability                      | WebGPU | WebGL    | Canvas2D | Headless              |
| ------------------------------- | ------ | -------- | -------- | --------------------- |
| Explicit GPU resource lifecycle | Full   | Partial  | None     | Profile-dependent     |
| Barrier planning                | Full   | Emulated | None     | Profile-dependent     |
| Command buffer introspection    | Full   | Partial  | Limited  | Full (metadata-first) |
| Ray picking parity              | Full   | Full     | Partial  | Full                  |
| Overlay rendering               | Full   | Full     | Full     | Full                  |
| Deterministic replay support    | Full   | Full     | Partial  | Full                  |
| Readback throughput             | High   | Medium   | Low      | Medium                |
| Shader variant control          | Full   | Partial  | None     | N/A                   |

## Selection Policy

1. Default preference order for browser runtime:

- `webgpu`
- `webgl`
- `canvas2d`

2. For CI and regression workflows:

- `headless` first when deterministic output is required.

3. Fallback transitions must emit:

- `engine.render.backendSwitched`
- diagnostics fallback trace metadata

## Behavioral Differences

### WebGPU

- Supports explicit upload batches and barrier plans.
- Recommended for large scene throughput and advanced diagnostics.

### WebGL

- Strong compatibility with reduced explicit scheduling visibility.
- Use capability probes for optional advanced operations.

### Canvas2D

- Primarily for planar and compatibility paths.
- Not a substitute for GPU-explicit workflows.

### Headless

- Must prioritize deterministic output over peak throughput.
- Frame metadata and replay contracts are required outputs.

## Error and Recovery Notes

Common backend-related error codes:

- `E_BACKEND_UNAVAILABLE`
- `E_UNSUPPORTED_CAPABILITY`
- `E_OPERATION_TIMEOUT`

Recovery strategy:

1. Probe capability profile.
2. Downgrade feature usage by policy.
3. Retry with compatible backend.
4. Emit diagnostics event chain for traceability.
