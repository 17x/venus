# Engine Backend Tier Policy

Status: Active
Version: 1.0.0
Last Updated: 2026-05-26

## 1. Tier Definitions

The engine maintains three backend tiers with distinct capability and maintenance scopes.

### Tier 1 — Primary (WebGL)

- **Scope**: Full visual parity target with three.js-level rendering capabilities.
- **Features**: All P0–P2 rendering features land here first.
- **Testing**: Contract tests, conformance tests, visual regression tests.
- **Performance**: Budget-aware rendering with frame-time SLA monitoring.
- **Platforms**: All browsers with WebGL 2.0 support; WebGL 1.0 fallback where feasible.

### Tier 2 — Secondary (WebGPU)

- **Scope**: Experimental parity track trailing Tier 1 by at most one feature cycle.
- **Features**: Feature-compatible with Tier 1 where WebGPU APIs permit; compatibility gates enforced.
- **Testing**: Conformance parity tests against Tier 1 reference outputs.
- **Performance**: Best-effort optimization; no frame-budget SLA.
- **Platforms**: Browsers with WebGPU support (Chrome 113+, Edge 113+, Firefox Nightly).

### Tier 3 — Fallback (Canvas2D / Noop / Headless)

- **Scope**: Correctness and diagnostics only; not a visual parity target.
- **Features**: Rect-based packet rendering only; no mesh, material, or lighting support.
- **Testing**: Contract boundary tests ensuring deterministic fallback behavior.
- **Performance**: No optimization targets.
- **Platforms**: Server-side (headless), constrained environments (Canvas2D), testing harnesses (noop).

## 2. Feature Freeze Policy

To avoid parity schedule drift, non-primary backend feature scope is frozen:

1. New rendering features MUST land in Tier 1 (WebGL) first.
2. Tier 2 (WebGPU) receives the feature after Tier 1 validation passes and compatibility gates are satisfied.
3. Tier 3 backends receive NO new rendering features beyond diagnostic hooks.
4. Feature parity gates are enforced at the backend adapter boundary via capability probes.

## 3. Capability Maturity Matrix

| Domain          | Feature                 | Tier 1 (WebGL) | Tier 2 (WebGPU) | Tier 3 (Fallback) |
| --------------- | ----------------------- | -------------- | --------------- | ----------------- |
| **Camera**      | Perspective projection  | Stable         | Experimental    | Blocked           |
| **Camera**      | Orthographic projection | Stable         | Experimental    | Blocked           |
| **Camera**      | Frustum derivation      | Stable         | Experimental    | Blocked           |
| **Geometry**    | Mesh primitive payload  | Stable         | Experimental    | Blocked           |
| **Geometry**    | Triangle topology       | Stable         | Experimental    | Blocked           |
| **Geometry**    | Line topology           | Stable         | Experimental    | Blocked           |
| **Geometry**    | Point topology          | Planned        | Planned         | Blocked           |
| **Geometry**    | Instanced draw          | Planned        | Planned         | Blocked           |
| **Material**    | PBR metallic-roughness  | Planned        | Planned         | Blocked           |
| **Material**    | Unlit material          | Planned        | Planned         | Blocked           |
| **Material**    | Custom shader           | Planned        | Planned         | Blocked           |
| **Lighting**    | Directional light       | Planned        | Planned         | Blocked           |
| **Lighting**    | Point light             | Planned        | Planned         | Blocked           |
| **Lighting**    | Spot light              | Planned        | Planned         | Blocked           |
| **Lighting**    | Ambient light           | Planned        | Planned         | Blocked           |
| **Lighting**    | Hemisphere light        | Planned        | Planned         | Blocked           |
| **Lighting**    | Shadow maps             | Planned        | Planned         | Blocked           |
| **Animation**   | Keyframe channels       | Planned        | Planned         | Blocked           |
| **Animation**   | Skeletal animation      | Planned        | Planned         | Blocked           |
| **Animation**   | Morph targets           | Planned        | Planned         | Blocked           |
| **Asset**       | glTF ingestion          | Planned        | Planned         | Blocked           |
| **Asset**       | Texture pipeline        | Planned        | Planned         | Blocked           |
| **Interaction** | Triangle raycast        | Planned        | Planned         | Blocked           |
| **Interaction** | Hit-layer filtering     | Planned        | Planned         | Blocked           |
| **Editor**      | Transform gizmo         | Planned        | Planned         | Blocked           |
| **Editor**      | Selection modes         | Planned        | Planned         | Blocked           |
| **Diagnostics** | Parity telemetry        | Stable         | Experimental    | Blocked           |
| **Diagnostics** | Performance benchmarks  | Stable         | Experimental    | Blocked           |

### Maturity Level Definitions

- **Stable**: Implemented, tested, documented, and protected by contract tests.
- **Experimental**: Implemented behind a feature gate; API may change.
- **Planned**: Contract defined; implementation not yet started.
- **Blocked**: Not applicable for this backend tier.

## 4. Compatibility Gate Rules

When a Tier 2 feature attempts to match Tier 1 behavior:

1. The WebGPU adapter probes for required WebGPU API features.
2. If a required API is unavailable, the feature degrades to Tier 3 fallback behavior and emits a capability-gate diagnostics reason.
3. Capability-gate reasons are propagated through `EngineBackendFrameDiagnostics` for telemetry.
4. Feature authors MUST implement both the primary path and the capability-gate fallback before marking a feature as Stable.

## 5. Governance

- This policy is enforced by the `governance-machine-check` script in CI.
- Backend adapter conformance tests (`webAdapter.conformance.test.ts`) validate tier assignments.
- Changes to tier assignments require an ADR and approval from the engine governance owner.
